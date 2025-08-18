// prisma/seed.js
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Read JSON data
const dataPath = path.join(__dirname, 'restaurant.json');
const rawData = fs.readFileSync(dataPath, 'utf-8');
const data = JSON.parse(rawData);

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function main() {
  console.log('🌱 Starting seed...');

  // =============== CREATE RESTAURANT & ADMIN ===============
  const adminUser = await prisma.user.upsert({
    where: { email: data.admin.email },
    update: {},
    create: {
      email: data.admin.email,
      password: await hashPassword(data.admin.password),
      role: 'ADMIN',
      restaurant: {
        create: {
          name: data.restaurant.name,
          email: data.restaurant.email,
          address: data.restaurant.address,
          logoPath: data.restaurant.logoPath,
          deliveryTime: data.restaurant.deliveryTime,
          collectionTime: data.restaurant.collectionTime,
        },
      },
    },
    include: { restaurant: true },
  });

  const restaurantId = adminUser.restaurant.id;
  console.log(`✅ Restaurant created (ID: ${restaurantId})`);

  // =============== CREATE KITCHEN STATIONS ===============
  for (const station of data.kitchenStations) {
    await prisma.kitchenStation.create({
      data: {
        ...station,
        restaurantId,
      },
    });
  }
  console.log(`✅ Created ${data.kitchenStations.length} kitchen stations`);

  // =============== CREATE CATEGORIES ===============
  const categoryMap = {};
  for (const cat of data.categories) {
    const category = await prisma.category.create({
      data: {
        ...cat,
        restaurantId,
      },
    });
    categoryMap[cat.name] = category.id;
  }
  console.log(`✅ Created ${data.categories.length} categories`);

  // =============== CREATE FOODS ===============
  const foodMap = {};
  const stationMap = Object.fromEntries(
    (await prisma.kitchenStation.findMany({ where: { restaurantId } })).map(s => [s.name, s.id])
  );

  for (const food of data.foods) {
    const created = await prisma.food.create({
      data: {
        ...food,
        categoryId: categoryMap[food.category],
        stationId: stationMap[food.station],
        restaurantId,
      },
    });
    foodMap[food.name] = created.id;
  }
  console.log(`✅ Created ${data.foods.length} foods`);

  // =============== CREATE STAFF ===============
  const staffMap = {};
  for (const staff of data.staff) {
    const s = await prisma.staff.create({
      data: {
        ...staff,
        restaurantId,
        hireDate: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 365),
      },
    });
    staffMap[staff.name] = s.id;
  }
  console.log(`✅ Created ${data.staff.length} staff`);

  // =============== CREATE CUSTOMERS ===============
  const customerMap = {};
  for (const customer of data.customers) {
    const user = await prisma.user.create({
      data: {
        email: customer.email,
        password: await hashPassword('password'),
        role: 'CUSTOMER',
        customer: {
          create: {
            ...customer,
            totalSpent: 0,
            orderCount: 0,
          },
        },
      },
      include: { customer: true },
    });
    customerMap[customer.email] = user.customer.id;
  }
  console.log(`✅ Created ${data.customers.length} customers`);

  // =============== CREATE DELIVERY ZONES ===============
  for (const zone of data.deliveryZones) {
    await prisma.deliveryZone.create({
      data: {
        ...zone,
        restaurantId,
      },
    });
  }
  console.log(`✅ Created ${data.deliveryZones.length} delivery zones`);

  // =============== CREATE PROMO CODES ===============
  for (const code of data.promoCodes) {
    await prisma.promoCode.create({
      data: {
        ...code,
        expiresAt: new Date(code.expiresAt),
        restaurantId,
      },
    });
  }
  console.log(`✅ Created ${data.promoCodes.length} promo codes`);

  // =============== CREATE EXPENSES ===============
  for (const exp of data.expenses) {
    const expenseData = { ...exp, date: new Date(exp.date), restaurantId };
    if (exp.staffName) {
      expenseData.staffId = staffMap[exp.staffName];
    }
    await prisma.expense.create({ data: expenseData });
  }
  console.log(`✅ Created ${data.expenses.length} expenses`);

  // =============== CREATE ORDERS ===============
  for (const order of data.orders) {
    const customerId = customerMap[order.customerId];
    const items = order.items.map(item => ({
      foodId: foodMap[item.food],
      quantity: item.quantity,
      price: item.price || 0,
    }));

    // Fetch totalAmount from order or calculate
    const totalAmount = order.totalAmount || items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    await prisma.order.create({
      data: {
        totalAmount,
        finalAmount: order.finalAmount || totalAmount,
        discountAmount: order.discountAmount || 0,
        status: order.status,
        deliveryType: order.deliveryType,
        timeSlot: order.timeSlot || null,
        orderNote: order.orderNote || null,
        postcode: order.postcode || null,
        address: order.address || null,
        expectedDeliveryTime: '19:45',
        customerId,
        restaurantId,
        promoCode: order.promoCode || null,
        items: {
          create: items,
        },
      },
    });
  }
  console.log(`✅ Created ${data.orders.length} orders`);

  // =============== CREATE REVIEWS (for delivered orders) ===============
  const deliveredOrders = await prisma.order.findMany({
    where: { status: 'delivered', restaurantId },
    include: { items: true },
  });

  const comments = ['Great food!', 'Fast delivery', 'Tasty and hot', 'Will order again', 'Excellent service!'];
  for (const order of deliveredOrders) {
    await prisma.review.create({
      data: {
        rating: Math.floor(Math.random() * 5) + 1,
        comment: comments[Math.floor(Math.random() * comments.length)],
        orderId: order.id,
        customerId: order.customerId,
        restaurantId,
      },
    });
  }
  console.log(`✅ Created ${deliveredOrders.length} reviews`);

  console.log('🎉 Seed completed!');
}

main()
  .catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });