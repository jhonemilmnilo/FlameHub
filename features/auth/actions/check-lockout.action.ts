"use server";

import { checkOtpLockout, getOtpCooldownRemaining } from "@/lib/redis/rate-limiter";

/**
 * 🔒 Server Action: Check Live Lockout and OTP Cooldown Status for an Email
 * Called by the client on page load so the countdown and disable states appear immediately and don't reset.
 */
export async function getEmailLockoutStatusAction(email: string) {
  try {
    if (!email) return { isLocked: false, remainingSeconds: 0, tier: 0, cooldownRemaining: 0 };
    const [lockout, cooldownRemaining] = await Promise.all([
      checkOtpLockout(email),
      getOtpCooldownRemaining(email),
    ]);

    return {
      ...lockout,
      cooldownRemaining,
    };
  } catch {
    return { isLocked: false, remainingSeconds: 0, tier: 0, cooldownRemaining: 0 };
  }
}
