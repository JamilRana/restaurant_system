// src/lib/generateReceiptPdf.ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function generateReceiptPdf(order: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([300, 500]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let y = height - 50;

  const addText = (text: string, size: number = 12, bold = false) => {
    page.drawText(text, { x: 50, y: y, size, font, color: rgb(0, 0, 0) });
    y -= 20;
  };

  addText("TastyBites", 16);
  addText("Order Receipt");
  addText(`Order ID: ${order.id}`);
  addText(`Date: ${new Date(order.createdAt).toLocaleString()}`);
  addText(`Type: ${order.deliveryType === "DELIVERY" ? "Delivery" : "Pickup"}`);
  if (order.timeSlot) addText(`Slot: ${order.timeSlot}`);
  addText("------------------------");

  order.items.forEach((item: any) => {
    addText(`${item.quantity}x ${item.food.name} - £${(item.price * item.quantity).toFixed(2)}`);
  });

  addText("------------------------");
  addText(`Total: £${order.totalAmount.toFixed(2)}`, 14, true);
  addText("Thank you for your order!");

  return await pdfDoc.save(); // returns Uint8Array
}