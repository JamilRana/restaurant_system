// app/api/waiter/orders/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import Pusher from "pusher";

const pusher = new Pusher({
appId: process.env.PUSHER_APP_ID!, 
key: process.env.NEXT_PUBLIC_PUSHER_KEY!, 
secret: process.env.PUSHER_SECRET!, 
cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!, 
useTLS: true,
});

const CreateOrderSchema = z.object({
  tableId: z.number().int().nullable().optional(),
  deliveryType: z.enum(["PICKUP", "DELIVERY", "DINEIN"]),
  guestName: z.string().min(1, "Guest name is required"),
  guestEmail: z.string().email().nullable().optional(), // ✅ Fixed
  items: z.array(
    z.object({
      foodId: z.coerce.number().int(),
      quantity: z.coerce.number().int().positive(),
      foodOptionId: z.coerce.number().int().nullable().optional(),
    })
  ),
  orderNote: z.string().optional(),
  promoCode: z.string().optional(),
});


export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "WAITER", "KITCHEN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

//   const restaurantId = session.user.restaurantId;
const restaurantId = 1;
  if (!restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.json();
 
  const round2 = (num: number) => Math.round(num * 100) / 100;


  const parsed = CreateOrderSchema.safeParse(data);

  if (!parsed.success) {
    console.error("Zod validation error:", parsed.error.flatten());
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { tableId, deliveryType, guestName, guestEmail, items, orderNote, promoCode } = parsed.data;

  try {
    // Validate table (if dine-in)
    if (deliveryType === "DINEIN" && tableId) {
      const table = await prisma.table.findUnique({
        where: { id: tableId },
      });

      if (!table || table.restaurantId !== restaurantId) {
        return NextResponse.json({ error: "Invalid table" }, { status: 404 });
      }

      if (table.status === "AVAILABLE") {
        await prisma.table.update({
          where: { id: tableId },
           data:{ status: "OCCUPIED" }, // ✅ Fixed: no `data:`
        });
      }
    }

    // Get food items
    const foodItems = await prisma.food.findMany({
      where: {
        id: { in: items.map((i) => i.foodId) },
        restaurantId,
      },
      include: { options: true },
    });

    if (foodItems.length !== new Set(items.map((i) => i.foodId)).size) {
      return NextResponse.json({ error: "One or more food items not found" }, { status: 404 });
    }

    // Calculate total
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const food = foodItems.find((f) => f.id === item.foodId);
      if (!food) continue;

      const option = item.foodOptionId
        ? food.options.find((o) => o.id === item.foodOptionId)
        : null;

      const itemPrice = food.price + (option?.price || 0);
      totalAmount += itemPrice * item.quantity;


      orderItemsData.push({
        foodId: food.id,
        quantity: item.quantity,
        price: itemPrice,
        foodOptionId: option?.id || null,
      });
    }

    // Apply promo code
    let discountAmount = 0;
    let finalAmount = round2(totalAmount - discountAmount);

    if (promoCode) {
      const promo = await prisma.promoCode.findUnique({
        where: { code: promoCode, active: true, restaurantId },
      });

      if (promo && promo.currentUses < (promo.maxUses || Infinity)) {
        if (totalAmount >= (promo.minOrderAmount || 0)) {
          discountAmount = promo.discountAmount
            ? promo.discountAmount
            : (totalAmount * (promo.discountPercent! / 100));
            finalAmount = round2(totalAmount - discountAmount);

          await prisma.promoCode.update({
            where: { id: promo.id },
             data:{ currentUses: { increment: 1 } },
          });
        }
      }
    }

    // Find or create guest customer
    let customer: any;

    if (guestEmail) {
      customer = await prisma.customer.findFirst({
        where: { email: guestEmail },
      });

      if (customer) {
        if (customer.name !== guestName) {
          await prisma.customer.update({
            where: { id: customer.id },
             data:{ name: guestName },
          });
        }
      } else {
        customer = await prisma.customer.create({
           data:{
            name: guestName,
            email: guestEmail,
            phone: null,
            address: null,
            postcode: null,
            userId: null,
            totalSpent: 0,
            orderCount: 0,
          },
        });
      }
    } else {
      const anonEmail = `${guestName.toLowerCase().replace(/\s+/g, "_")}_guest_${restaurantId}@anon.local`;

      customer = await prisma.customer.findFirst({
        where: {
          name: guestName,
          email: {
            contains: `${guestName.toLowerCase().replace(/\s+/g, "_")}_guest_`,
          },
        },
      });

      if (!customer) {
        customer = await prisma.customer.create({
           data:{
            name: guestName,
            email: anonEmail,
            phone: null,
            address: null,
            postcode: null,
            userId: null,
            totalSpent: 0,
            orderCount: 0,
          },
        });
      }
    }

    // Update stats
    await prisma.customer.update({
      where: { id: customer.id },
       data:{
        totalSpent: { increment: finalAmount },
        orderCount: { increment: 1 },
      },
    });

    // Create order
    const order = await prisma.order.create({
       data:{
        totalAmount,
        finalAmount,
        discountAmount,
        promoCode: promoCode || null,
        paymentStatus: "paid",
        paymentMethod: "cash",
        status: "accepted",
        deliveryType,
        orderNote: orderNote || null,
        guestName,
        guestEmail,
        isGuestOrder: true,
        restaurant: { connect: { id: restaurantId } },
        customer: { connect: { id: customer.id } },
        createdBy: { connect: { id: session.user.id } },
        items: {
          create: orderItemsData,
        },
        ...(tableId && { table: { connect: { id: tableId } } }),
      },
      include: {
        items: { include: { food: true } },
        customer: true,
        table: true,
        createdBy: true,
      },
    });

    // Update table current order
    if (tableId) {
      await prisma.table.update({
        where: { id: tableId },
         data:{ currentOrderId: order.id },
      });
    }

    // 🚀 Trigger realtime event
    await pusher.trigger("restaurant-" + restaurantId, "order-created", {
      id: order.id,
      status: order.status,
      deliveryType: order.deliveryType,
      tableId: order.tableId,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      guestName: order.guestName,
      items: order.items.map((item: any) => ({
        foodName: item.food.name,
        quantity: item.quantity,
        price: item.price,
      })),
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error("Create waiter order failed:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}