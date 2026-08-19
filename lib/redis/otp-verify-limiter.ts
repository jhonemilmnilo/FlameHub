import { redis } from "./client";

/**
 * 🏰 4-Tier Perpetual Progressive Lockdown Architecture (By Email)
 * - Tier 1: 3 Failed attempts -> 5 Minutes Lockdown (300s)
 * - Tier 2: 6 Failed attempts -> 15 Minutes Lockdown (900s)
 * - Tier 3: 9 Failed attempts -> 1 Hour Lockdown (3,600s)
 * - Tier 4: 12 Failed attempts -> 24 Hours Lockdown (86,400s)
 * - After Tier 4 TTL expires -> Resets back to Tier 1 (Perpetual Loop)
 */

export interface OtpLockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  tier: number;
}

export async function checkOtpLockout(email: string): Promise<OtpLockoutStatus> {
  const normalizedEmail = email.toLowerCase().trim();
  const lockoutKey = `otp:lockout:${normalizedEmail}`;

  try {
    const [ttl, tierVal] = await Promise.all([
      redis.ttl(lockoutKey),
      redis.get<string>(lockoutKey),
    ]);

    if (ttl > 0) {
      let tier = 1;
      if (tierVal === "tier_4") tier = 4;
      else if (tierVal === "tier_3") tier = 3;
      else if (tierVal === "tier_2") tier = 2;

      return {
        isLocked: true,
        remainingSeconds: ttl,
        tier,
      };
    }

    return { isLocked: false, remainingSeconds: 0, tier: 0 };
  } catch (error) {
    console.error("OTP_LOCKOUT_CHECK_ERROR:", error);
    return { isLocked: false, remainingSeconds: 0, tier: 0 };
  }
}

export async function recordFailedOtpAttempt(
  email: string
): Promise<{ isLocked: boolean; remainingSeconds: number; remainingAttemptsInTier: number; tier: number }> {
  const normalizedEmail = email.toLowerCase().trim();
  const failsKey = `otp:fails:${normalizedEmail}`;
  const lockoutKey = `otp:lockout:${normalizedEmail}`;

  try {
    // Increment failed attempt counter
    const fails = await redis.incr(failsKey);
    if (fails === 1) {
      await redis.expire(failsKey, 86400 * 2); // 48 hours TTL
    }

    let lockoutDuration = 0;
    let tier = 0;

    // 🎯 EXACT THRESHOLDS: 3, 6, 9, 12+
    if (fails >= 12) {
      // Tier 4: 24 hours lockout (86400 seconds) - Resets fails counter upon expiry
      lockoutDuration = 86400;
      tier = 4;
      await redis.expire(failsKey, 86400);
    } else if (fails === 9) {
      // Tier 3: 1 hour lockout (3600 seconds)
      lockoutDuration = 3600;
      tier = 3;
    } else if (fails === 6) {
      // Tier 2: 15 minutes lockout (900 seconds)
      lockoutDuration = 900;
      tier = 2;
    } else if (fails === 3) {
      // Tier 1: 5 minutes lockout (300 seconds)
      lockoutDuration = 300;
      tier = 1;
    }

    if (lockoutDuration > 0) {
      await redis.set(lockoutKey, `tier_${tier}`, { ex: lockoutDuration });
      return {
        isLocked: true,
        remainingSeconds: lockoutDuration,
        remainingAttemptsInTier: 0,
        tier,
      };
    }

    // Remaining attempts before the NEXT tier penalty
    const attemptsLeft = 3 - (fails % 3);

    return {
      isLocked: false,
      remainingSeconds: 0,
      remainingAttemptsInTier: attemptsLeft === 0 ? 3 : attemptsLeft,
      tier: 0,
    };
  } catch (error) {
    console.error("RECORD_FAILED_OTP_ERROR:", error);
    return { isLocked: false, remainingSeconds: 0, remainingAttemptsInTier: 1, tier: 0 };
  }
}

export async function clearOtpLockout(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const failsKey = `otp:fails:${normalizedEmail}`;
  const lockoutKey = `otp:lockout:${normalizedEmail}`;

  try {
    await Promise.all([redis.del(failsKey), redis.del(lockoutKey)]);
  } catch (error) {
    console.error("CLEAR_OTP_LOCKOUT_ERROR:", error);
  }
}
