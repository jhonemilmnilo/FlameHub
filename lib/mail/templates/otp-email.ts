interface OtpEmailTemplateProps {
  firstName?: string;
  otp: string;
  expiresMinutes?: number;
}

/**
 * 🎨 FlameHub Official Emerald OTP Email Template
 * Responsive HTML table email with inline CSS for 100% email client compatibility.
 */
export function generateOtpEmailHtml({
  firstName = "Student",
  otp,
  expiresMinutes = 10,
}: OtpEmailTemplateProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlameHub Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f5f7; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #006241; border-radius: 12px; overflow: hidden; box-shadow: 0 12px 35px rgba(0, 0, 0, 0.25);">
          
          <!-- Header Branding -->
          <tr>
            <td align="center" style="padding: 36px 30px 20px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
                FlameHub
              </h1>
              <p style="margin: 6px 0 0 0; color: #a7f3d0; font-size: 12px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase;">
                University Social Community
              </p>
            </td>
          </tr>

          <!-- Inner White Card -->
          <tr>
            <td style="padding: 0 20px 24px 20px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; padding: 32px 24px; text-align: center;">
                
                <tr>
                  <td>
                    <h2 style="margin: 0 0 10px 0; color: #111827; font-size: 20px; font-weight: 700;">
                      Verify Your Email Address
                    </h2>
                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 14px; line-height: 22px;">
                      Hi <strong>${firstName}</strong>, thank you for joining FlameHub! Use the 6-digit verification code below to activate your student account.
                    </p>
                  </td>
                </tr>

                <!-- OTP Code Display Badge -->
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #f0fdf4; border: 2px dashed #006241; border-radius: 8px; padding: 14px 28px; margin-bottom: 22px;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #006241;">
                        ${otp}
                      </span>
                    </div>
                  </td>
                </tr>

                <!-- Security / Expiry Note -->
                <tr>
                  <td>
                    <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 18px;">
                      ⏱️ This code is valid for <strong>${expiresMinutes} minutes</strong>.<br>
                      If you did not request this verification, please disregard this email.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 0 30px 28px 30px; text-align: center;">
              <p style="margin: 0; color: #a7f3d0; font-size: 11px; line-height: 16px;">
                © 2026 FlameHub Platform. All rights reserved.<br>
                This is an automated security transmission. Do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
