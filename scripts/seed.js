// prisma/seed.js
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const dataPath = path.join(__dirname, "restaurant.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

/** Helpers */
const hashPassword = (password) => bcrypt.hash(password, 10);
const randomDate = (start, end) =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

async function main() {
  console.log("🌱 Starting seed...");

  /** =============== ADMIN & RESTAURANT =============== */
  const adminUser = await prisma.user.upsert({
    where: { email: data.admin.email },
    update: {},
    create: {
      email: data.admin.email,
      password: await hashPassword(data.admin.password),
      role: "ADMIN",
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

  /** =============== CATEGORIES =============== */
  const categoryMap = {};
  for (const category of data.categories) {
    const created = await prisma.category.upsert({
      where: { name_restaurantId: { name: category.name, restaurantId } },
      update: {},
      create: { ...category, restaurantId },
    });
    categoryMap[category.name] = created.id;
  }

  /** =============== FOODS =============== */
  const foodMap = {};
  const foodPriceMap = {};
  for (const { category, ...food } of data.foods) {
    const created = await prisma.food.upsert({
      where: { name_restaurantId: { name: food.name, restaurantId } },
      update: {},
      create: {
        ...food,
        categoryId: categoryMap[category],
        restaurantId,
      },
    });
    foodMap[food.name] = created.id;
    foodPriceMap[food.name] = food.price;
  }

  /** =============== STAFF =============== */
  const staffMap = {};
  for (const staff of data.staff) {
    const normalizedRole = staff.role === "KITCHEN" ? "CHEF" : staff.role;
    const isHourly = staff.salaryPeriod === "HOURLY";

    const created = await prisma.staff.upsert({
      where: { email: staff.email },
      update: {},
      create: {
        ...staff,
        role: normalizedRole,
        salary: isHourly ? null : staff.salary || null,
        hourlyRate: isHourly ? staff.hourlyRate : null,
        hireDate: randomDate(new Date("2023-01-01"), new Date()),
        restaurantId,
      },
    });
    staffMap[staff.name] = created.id;
  }

  /** =============== CUSTOMERS =============== */
  const customerMap = {};
  for (const customer of data.customers) {
    const created = await prisma.user.upsert({
      where: { email: customer.email },
      update: {},
      create: {
        email: customer.email,
        password: await hashPassword("password"),
        role: "CUSTOMER",
        customer: {
          create: { ...customer, totalSpent: 0, orderCount: 0 },
        },
      },
      include: { customer: true },
    });
    customerMap[customer.email] = created.customer.id;
  }

  /** =============== DELIVERY ZONES =============== */
  for (const zone of data.deliveryZones) {
    await prisma.deliveryZone.upsert({
      where: {
        postcode_restaurantId: { postcode: zone.postcode, restaurantId },
      },
      update: {},
      create: { ...zone, restaurantId },
    });
  }

  /** =============== PROMO CODES =============== */
  for (const code of data.promoCodes) {
    await prisma.promoCode.upsert({
      where: { code: code.code },
      update: {},
      create: {
        code: code.code,
        discountPercent:
          code.discountType === "PERCENTAGE" ? code.discountValue : null,
        discountAmount:
          code.discountType === "FIXED" ? code.discountValue : null,
        maxUses: code.maxUsage,
        expiresAt: code.expiresAt ? new Date(code.expiresAt) : null,
        restaurantId,
      },
    });
  }

  /** =============== EXPENSES =============== */
  for (const exp of data.expenses) {
    const expenseData = {
      description: exp.description,
      amount: exp.amount,
      category: exp.category,
      date: new Date(exp.date),
      restaurantId,
      ...(exp.staffName && { staffId: staffMap[exp.staffName] }),
    };

    await prisma.expense.create({ data: expenseData });
  }

  /** =============== ORDERS =============== */
  for (const order of data.orders || []) {
    const customerId = customerMap[order.customerId];
    const items = order.items.map((item) => ({
      foodId: foodMap[item.food],
      quantity: item.quantity,
      price: foodPriceMap[item.food],
    }));

    const totalAmount =
      order.totalAmount ??
      items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // Resolve promoCodeId if promoCode is provided
    let promoCodeId = null;
    if (order.promoCode) {
      const promo = await prisma.promoCode.findUnique({
        where: { code: order.promoCode, restaurantId },
      });
      if (promo) {
        promoCodeId = promo.id;
      }
    }

    await prisma.order.create({
      data: {
        totalAmount,
        finalAmount: order.finalAmount ?? totalAmount,
        discountAmount: order.discountAmount ?? 0,
        status: order.status,
        deliveryType: order.deliveryType,
        timeSlot: order.timeSlot ?? null,
        orderNote: order.orderNote ?? null,
        postcode: order.postcode ?? null,
        address: order.address ?? null,
        // ✅ Correct field:
        promoCodeId, // ← now it's valid

        customerId,
        restaurantId,
        createdAt: randomDate(new Date("2024-04-01"), new Date()),
        items: { create: items },
      },
    });
  }

  /** =============== REVIEWS =============== */
  const deliveredOrders = await prisma.order.findMany({
    where: { status: "DELIVERED", restaurantId },
  });

  const comments = [
    "Great food!",
    "Fast delivery",
    "Tasty and hot",
    "Will order again",
    "Excellent service!",
  ];
  for (const order of deliveredOrders) {
    await prisma.review.upsert({
      where: { orderId: order.id },
      update: {},
      create: {
        rating: Math.floor(Math.random() * 5) + 1,
        comment: comments[Math.floor(Math.random() * comments.length)],
        orderId: order.id,
        customerId: order.customerId,
        restaurantId,
      },
    });
  }

  console.log("🎉 Seed completed!");
}

/** Runner */
main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
