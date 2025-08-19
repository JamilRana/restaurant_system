// lib/notifications/email.ts
import nodemailer from "nodemailer";
interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: any[];
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    ...options,
  });
}
