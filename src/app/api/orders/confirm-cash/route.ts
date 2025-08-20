// app/api/orders/confirm-cash/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/notifications/email";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const restaurantId = 1;
    if (!restaurantId) {
      return NextResponse.json(
        { error: "No restaurant assigned" },
        { status: 403 }
      );
    }

    // 1. Validate required fields
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json(
        { error: "Order must include at least one item" },
        { status: 400 }
      );
    }

    if (!data.timeSlot) {
      return NextResponse.json(
        { error: "Time slot is required" },
        { status: 400 }
      );
    }

    if (data.deliveryType === "DELIVERY" && (!data.address || !data.postcode)) {
      return NextResponse.json(
        { error: "Address and postcode required for delivery" },
        { status: 400 }
      );
    }

    // 2. Recalculate total server-side
    const itemTotal = data.items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );
    const deliveryFee = data.deliveryFee ? Number(data.deliveryFee) : 0;
    let totalAmount = itemTotal + deliveryFee;

    // 3. Apply promo code if provided
    let discountAmount = 0;
    let appliedPromoCode: string | null = null;

    if (data.promoCode) {
      const promo = await prisma.promoCode.findFirst({
        where: {
          code: data.promoCode.toUpperCase(),
          active: true,
          restaurantId: restaurantId,
          expiresAt: { gte: new Date() },
          minOrderAmount: { lte: totalAmount },
        },
      });

      if (!promo) {
        return NextResponse.json(
          { error: "Invalid or expired promo code" },
          { status: 400 }
        );
      }

      if (promo.discountPercent) {
        discountAmount = (totalAmount * promo.discountPercent) / 100;
      } else if (promo.discountAmount) {
        discountAmount = promo.discountAmount;
      }

      discountAmount = Math.min(discountAmount, totalAmount);
      appliedPromoCode = promo.code;

      await prisma.promoCode.update({
        where: { id: promo.id },
        data: { currentUses: { increment: 1 } },
      });
    }

    const finalAmount = Math.max(totalAmount - discountAmount, 0);

    // 4. Resolve customer: guest or logged-in
    let customerId: number;

    if (data.isGuestOrder === true || data.isGuestOrder === "true") {
      const customer = await prisma.customer.upsert({
        where: { email: data.guestEmail },
        update: {
          name: data.guestName,
          totalSpent: { increment: finalAmount },
          orderCount: { increment: 1 },
        },
        create: {
          name: data.guestName,
          email: data.guestEmail,
          totalSpent: finalAmount,
          orderCount: 1,
        },
      });

      customerId = customer.id;
    } else {
      const userWithCustomer = await prisma.user.findUnique({
        where: { id: parseInt(data.customerId) },
        include: { customer: true },
      });

      if (!userWithCustomer || !userWithCustomer.customer) {
        return NextResponse.json(
          { error: "Customer profile not found." },
          { status: 404 }
        );
      }

      const actualCustomerId = userWithCustomer.customer.id;

      await prisma.customer.update({
        where: { id: actualCustomerId },
        data: {
          totalSpent: { increment: finalAmount },
          orderCount: { increment: 1 },
        },
      });

      customerId = actualCustomerId;
    }

    // 5. Create the order
    const order = await prisma.order.create({
      data: {
        totalAmount,
        finalAmount,
        discountAmount,
        promoCode: appliedPromoCode,
        paymentStatus: data.paymentStatus || "pending",
        paymentMethod: data.paymentMethod || "cash",
        status: data.status || "placed",
        timeSlot: data.timeSlot,
        deliveryType: data.deliveryType,
        address: data.address,
        postcode: data.postcode,
        restaurantId,
        orderNote: data.orderNote || null,
        expectedDeliveryTime: data.timeSlot
          ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
          : null,
        customerId,
        isGuestOrder: data.isGuestOrder || false,
        guestName: data.isGuestOrder ? data.guestName : null,
        guestEmail: data.isGuestOrder ? data.guestEmail : null,
        stripeSessionId: data.stripeSessionId || null,
        stripePaymentIntent: data.stripePaymentIntent || null,
        items: {
          create: data.items.map((item: any) => ({
            foodId: item.foodId,
            quantity: item.quantity,
            price: item.price,
            foodOptionId: item.foodOptionId || null,
          })),
        },
      },
      include: {
        items: { include: { food: true } },
      },
    });

    // ✅ 6. Send confirmation email if guest
    if (data.isGuestOrder) {
      try {
        await sendEmail({
          to: data.guestEmail,
          subject: `Your Order #${order.id} is Confirmed!`,
          text: `Hi ${data.guestName}, your order #${order.id} has been placed successfully.`,
          html: `
            <p>Hi <strong>${data.guestName}</strong>,</p>
            <p>Thank you for your order! 🎉</p>
            <p>Your order <strong>#${
              order.id
            }</strong> is being prepared and will be ready for ${
            order.deliveryType === "DELIVERY" ? "delivery" : "pickup"
          }.</p>
            <p><strong>Total:</strong> £${finalAmount.toFixed(2)}</p>
            <p>We'll notify you when it's on its way!</p>
            <p>Thanks,<br/>The Restaurant Team</p>
          `,
        });
      } catch (emailError) {
        console.error(
          "Failed to send confirmation email to guest:",
          emailError
        );
        // Don't throw — order is created, email is optional
      }
    }

    // ✅ 7. Return success response
    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        paymentMethod: order.paymentMethod,
        isGuestOrder: order.isGuestOrder,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order", details: error.message },
      { status: 500 }
    );
  }
}
