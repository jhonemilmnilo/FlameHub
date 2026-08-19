"use server";

import { checkOtpLockout } from "@/lib/redis/rate-limiter";

/**
 * 🔒 Server Action: Check Live Lockout Status for an Email
 * Called by the client on page load so the countdown and disable states appear immediately.
 */
export async function getEmailLockoutStatusAction(email: string) {
  try {
    if (!email) return { isLocked: false, remainingSeconds: 0, tier: 0 };
    return await checkOtpLockout(email);
  } catch {
    return { isLocked: false, remainingSeconds: 0, tier: 0 };
  }
}
