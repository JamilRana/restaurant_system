// lib/notifications/email.ts
import nodemailer from "nodemailer";
interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: any[];
}

// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: parseInt(process.env.SMTP_PORT || "587"),
//   secure: false, // true only for port 465
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
//   // 👇 Add these options for better compatibility
//   tls: {
//     rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== "false", // true by default
//     // Optional: if self-signed cert, set to false (not recommended in prod)
//   },
//   requireTLS: true, // Enforce STARTTLS even on port 587
// });

// export async function sendEmail(to: string, subject: string, text: string) {
//   await transporter.sendMail({
//     from: process.env.SMTP_FROM,
//     to,
//     subject,
//     text, 
//   });
// }

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});



// Create a test account or replace with real credentials.
// const transporter = nodemailer.createTransport({
//   host: "smtp.bcc.gov.bd",
//   port: 587,
//   secure: false, // true for 465, false for other ports
//   auth: {
//     user: "rana@mis.dghs.gov.bd",
//     pass: "Rana#2025",
//   },
// });

// Wrap in an async IIFE so we can use await.
export async function sendEmail(options:SendEmailOptions):Promise<void> {
 await transporter.sendMail({
    from: process.env.SMTP_FROM,
    ...options,
  });
}
