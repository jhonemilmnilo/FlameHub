"use server";

import { checkOtpLockout } from "@/lib/redis/otp-verify-limiter";
import { checkActiveOtpSendStatus } from "@/lib/redis/otp-send-limiter";

/**
 * 🔒 Server Action: Check Live Lockout and OTP Cooldown Status for an Email
 * Called by the client on page load so the countdown and disable states appear immediately and don't reset.
 */
export async function getEmailLockoutStatusAction(email: string) {
  try {
    if (!email) return { isLocked: false, remainingSeconds: 0, tier: 0, cooldownRemaining: 0 };
    const [lockout, sendStatus] = await Promise.all([
      checkOtpLockout(email),
      checkActiveOtpSendStatus(email),
    ]);

    return {
      ...lockout,
      cooldownRemaining: sendStatus.remainingSeconds,
    };
  } catch {
    return { isLocked: false, remainingSeconds: 0, tier: 0, cooldownRemaining: 0 };
  }
}
