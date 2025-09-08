import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { sendEmail } from "@/lib/notifications/email";
import { generateReceiptPdf } from "@/lib/generateReceiptPdf";

// ✅ Use const object for runtime access
const ALLOWED_STATUSES = {
  ACCEPTED: "ACCEPTED",
  READY: "READY",
  DELIVERED: "DELIVERED",
  REJECTED: "REJECTED",
} as const;

type Status = (typeof ALLOWED_STATUSES)[keyof typeof ALLOWED_STATUSES];

// ✅ Type guard
function isAllowedStatus(status: any): status is Status {
  return Object.values(ALLOWED_STATUSES).includes(status);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const orderId = parseInt(id);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const { status: newStatus } = await request.json();

  // ✅ Validate it's one of the allowed statuses
  if (!isAllowedStatus(newStatus)) {
    return NextResponse.json(
      { error: "Invalid or unsupported status" },
      { status: 400 }
    );
  }

  try {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
      include: {
        customer: { select: { name: true, email: true } },
        items: { include: { food: true } },
      },
    });

    const customer = updatedOrder.customer;

    if (customer?.email) {
      // ✅ Use ALLOWED_STATUSES, not Status (which is a type)
      const subjectMap: Record<Status, string> = {
        [ALLOWED_STATUSES.ACCEPTED]: `Your Order #${updatedOrder.id} Has Been Accepted!`,
        [ALLOWED_STATUSES.READY]: `Your Order is Ready for ${updatedOrder.deliveryType}`,
        [ALLOWED_STATUSES.DELIVERED]: "Your Order Has Been Delivered",
        [ALLOWED_STATUSES.REJECTED]: `Your Order #${updatedOrder.id} Was Rejected`,
      };

      const bodyMap: Record<Status, string> = {
        [ALLOWED_STATUSES.ACCEPTED]: `Hi ${customer.name}, we've accepted your order.`,
        [ALLOWED_STATUSES.READY]: `Great news! Your order is ready for pickup/delivery.`,
        [ALLOWED_STATUSES.DELIVERED]: `Your order has been delivered. Enjoy!`,
        [ALLOWED_STATUSES.REJECTED]: `We're sorry, but your order #${updatedOrder.id} has been rejected.`,
      };

      const subject = subjectMap[newStatus];
      const text = bodyMap[newStatus];

      let attachments: any[] = [];

      if (newStatus === ALLOWED_STATUSES.READY) {
        const pdfBytes = await generateReceiptPdf(updatedOrder);
        attachments.push({
          filename: `receipt-order-${updatedOrder.id}.pdf`,
          content: Buffer.from(pdfBytes), // ✅ Convert Uint8Array → Buffer
          contentType: "application/pdf",
        });
      }

      await sendEmail({
        to: customer.email,
        subject,
        text,
        html: `<p>${text}</p><p><strong>Order ID:</strong> ${updatedOrder.id}</p>`,
        attachments,
      });
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Update failed:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
