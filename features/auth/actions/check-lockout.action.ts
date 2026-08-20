"use server";

import { checkOtpLockout } from "@/lib/redis/otp-verify-limiter";
import { checkActiveOtpSendStatus } from "@/lib/redis/otp-send-limiter";
import { checkLoginLockout } from "@/lib/redis/login-limiter";

/**
 * 🔒 Server Action: Check Live OTP Lockout and Send Cooldown Status for an Email
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

/**
 * 🔒 Server Action: Check Live Login Lockout Status
 */
export async function getLoginLockoutStatusAction(email: string) {
  try {
    if (!email) return { isLocked: false, remainingSeconds: 0, tier: 0 };
    return await checkLoginLockout(email);
  } catch {
    return { isLocked: false, remainingSeconds: 0, tier: 0 };
  }
}
