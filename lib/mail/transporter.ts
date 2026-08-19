import nodemailer from "nodemailer";

/**
 * ⚡ Brevo SMTP Transporter Singleton
 * Reusable SMTP connection pool for fast and reliable email dispatch.
 */
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});
