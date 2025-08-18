// scripts/seed.js
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // Read restaurant.json
  const jsonPath = path.join(__dirname, "restaurant.json");
  const jsonData = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(jsonData);

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 12);

  // Seed Restaurant and linked User
  const restaurant = await prisma.restaurant.upsert({
    where: { email: data.email },
    update: {
      name: data.name,
      address: data.address,
      logoPath: data.logoPath || data.logoUrl,
      deliveryTime: data.deliveryTime,
      collectionTime: data.collectionTime,
    },
    create: {
      name: data.name,
      email: data.email,
      address: data.address,
      logoPath: data.logoPath || data.logoUrl,
      deliveryTime: data.deliveryTime,
      collectionTime: data.collectionTime,
      user: {
        create: {
          email: data.email,
          password: hashedPassword,
          role: "ADMIN",
        },
      },
    },
  });

  console.log("✅ Restaurant & Admin User seeded:", restaurant.name);

  // --- Seed Categories ---
  if (data.categories && Array.isArray(data.categories)) {
    for (const cat of data.categories) {
      try {
        await prisma.category.upsert({
          // ✅ Use the constraint name as the field
          where: { Category_name_restaurantId_key: { name: cat.name, restaurantId: restaurant.id } },
          update: { image: cat.image || null },
          create: {
            name: cat.name,
            image: cat.image || null,
            restaurantId: restaurant.id,
          },
        });
      } catch (err) {
        console.error(`❌ Failed to seed category: ${cat.name}`, err.message);
      }
    }
    console.log("✅ Categories seeded");
  }

  // --- Seed Delivery Zones ---
  // --- Seed Delivery Zones ---
if (data.deliveryZones && Array.isArray(data.deliveryZones)) {
  for (const zone of data.deliveryZones) {
    try {
      await prisma.deliveryZone.upsert({
        where: { DeliveryZone_postcode_restaurantId_key: { postcode: zone.postcode, restaurantId: restaurant.id } },
        update: { deliveryFee: zone.deliveryFee },
        create: {
          postcode: zone.postcode,
          deliveryFee: zone.deliveryFee,
          restaurantId: restaurant.id,
        },
      });
    } catch (err) {
      console.error(`❌ Failed to seed delivery zone: ${zone.postcode}`, err.message);
    }
  }
  console.log("✅ Delivery Zones seeded");
}

  // --- Seed Promo Codes ---
  if (data.promoCodes && Array.isArray(data.promoCodes)) {
    for (const promo of data.promoCodes) {
      try {
        await prisma.promoCode.upsert({
          where: { code: promo.code },
          update: {
            discountPercent: promo.discountPercent || null,
            discountAmount: promo.discountAmount || null,
            minOrderAmount: promo.minOrderAmount || null,
            maxUses: promo.maxUses || null,
            expiresAt: promo.expiresAt ? new Date(promo.expiresAt) : null,
            active: promo.active ?? true,
            restaurantId: restaurant.id,
          },
          create: {
            code: promo.code,
            discountPercent: promo.discountPercent || null,
            discountAmount: promo.discountAmount || null,
            minOrderAmount: promo.minOrderAmount || null,
            maxUses: promo.maxUses || null,
            expiresAt: promo.expiresAt ? new Date(promo.expiresAt) : null,
            active: promo.active ?? true,
            restaurantId: restaurant.id,
          },
        });
      } catch (err) {
        console.error(`❌ Failed to seed promo code: ${promo.code}`, err.message);
      }
    }
    console.log("✅ Promo Codes seeded");
  }

  // --- Seed Foods ---
  if (data.foods && Array.isArray(data.foods)) {
    for (const food of data.foods) {
      try {
        // Find category
        const category = await prisma.category.findFirst({
          where: { name: food.category, restaurantId: restaurant.id },
        });

        if (!category) {
          console.warn(`⚠️ Category not found for food: ${food.name}. Skipping.`);
          continue;
        }

        await prisma.food.upsert({
          // ✅ Use the constraint name as the field
          where: { Food_name_restaurantId_key: { name: food.name, restaurantId: restaurant.id } },
          update: {
            description: food.description,
            price: food.price,
            image: food.image,
            available: food.available,
            prepTimeMinutes: food.prepTimeMinutes,
            categoryId: category.id,
          },
          create: {
            name: food.name,
            description: food.description,
            price: food.price,
            image: food.image,
            available: food.available ?? true,
            prepTimeMinutes: food.prepTimeMinutes || 15,
            categoryId: category.id,
            restaurantId: restaurant.id,
          },
        });
      } catch (err) {
        console.error(`❌ Failed to seed food: ${food.name}`, err.message);
      }
    }
    console.log("✅ Foods seeded");
  }
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });