import { transporter } from "./transporter";
import { generateOtpEmailHtml } from "./templates/otp-email";

interface SendOtpParams {
  to: string;
  otp: string;
  firstName?: string;
}

type MailResult =
  | { success: true; messageId: string; error?: never }
  | { success: false; error: string; messageId?: never };

/**
 * ✉️ Send OTP Email via Brevo SMTP
 * Dispatches high-deliverability 6-digit OTP code to student email.
 */
export async function sendOtpEmail({ to, otp, firstName }: SendOtpParams): Promise<MailResult> {
  const senderEmail = process.env.SENDER_EMAIL || process.env.EMAIL_USER;
  const senderName = process.env.SENDER_NAME || "FlameHub";

  try {
    const htmlContent = generateOtpEmailHtml({
      firstName,
      otp,
      expiresMinutes: 10,
    });

    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject: `🔒 ${otp} is your FlameHub verification code`,
      html: htmlContent,
      text: `Hi ${firstName || "Student"},\n\nYour FlameHub 6-digit verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\n© 2026 FlameHub`,
    });

    console.info(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        event: "MAIL_SENT_SUCCESS",
        to,
        messageId: info.messageId,
      })
    );

    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to send email";
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        event: "MAIL_DISPATCH_FAILED",
        to,
        error: errorMsg,
      })
    );

    return { success: false, error: errorMsg };
  }
}
