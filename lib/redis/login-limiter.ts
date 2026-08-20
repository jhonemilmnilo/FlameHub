import { redis } from "./client";

/**
 * 🏰 5-Tier Progressive Brute-Force Login Limiter (Per Email)
 * 
 * Exact Tier Directives:
 * - 1st 5 failed attempts  -> Tier 1: 3 Minutes Lockdown (180s)
 * - Next 5 failed attempts -> Tier 2: 5 Minutes Lockdown (300s)
 * - Next 5 failed attempts -> Tier 3: 10 Minutes Lockdown (600s)
 * - Next 5 failed attempts -> Tier 4: 1 Hour Lockdown (3,600s)
 * - Next 5 failed attempts -> Tier 5: 24 Hours Lockdown (86,400s)
 */

export interface LoginLockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  tier: number;
}

export async function checkLoginLockout(email: string): Promise<LoginLockoutStatus> {
  const normalizedEmail = email.toLowerCase().trim();
  const lockoutKey = `login:lockout:${normalizedEmail}`;
  const tierKey = `login:tier:${normalizedEmail}`;

  try {
    const [ttl, tierVal] = await Promise.all([
      redis.ttl(lockoutKey),
      redis.get<number>(tierKey),
    ]);

    if (ttl > 0) {
      return {
        isLocked: true,
        remainingSeconds: ttl,
        tier: Number(tierVal) || 1,
      };
    }

    return { isLocked: false, remainingSeconds: 0, tier: 0 };
  } catch (error) {
    console.error("LOGIN_LOCKOUT_CHECK_CRITICAL_ERROR:", error);
    return { isLocked: false, remainingSeconds: 0, tier: 0 };
  }
}

export async function recordFailedLoginAttempt(
  email: string
): Promise<{ isLocked: boolean; remainingSeconds: number; remainingAttemptsInTier: number; tier: number }> {
  const normalizedEmail = email.toLowerCase().trim();
  const failsKey = `login:fails:${normalizedEmail}`;
  const lockoutKey = `login:lockout:${normalizedEmail}`;
  const tierKey = `login:tier:${normalizedEmail}`;

  try {
    // 1. Increment total failed attempts
    const fails = await redis.incr(failsKey);
    if (fails === 1) {
      await redis.expire(failsKey, 86400 * 3); // 72 hours rolling window
    }

    // 2. Compute current tier based on attempt ranges
    let tier = 0;
    let lockoutDuration = 0;

    if (fails >= 25) {
      tier = 5;
      lockoutDuration = 86400; // 24 Hours
    } else if (fails >= 20) {
      tier = 4;
      lockoutDuration = 3600; // 1 Hour
    } else if (fails >= 15) {
      tier = 3;
      lockoutDuration = 600; // 10 Minutes
    } else if (fails >= 10) {
      tier = 2;
      lockoutDuration = 300; // 5 Minutes
    } else if (fails >= 5) {
      tier = 1;
      lockoutDuration = 180; // 3 Minutes
    }

    // 3. Trigger lockout when crossing exact thresholds (5, 10, 15, 20, 25+)
    if (fails % 5 === 0 || fails >= 25) {
      await Promise.all([
        redis.set(lockoutKey, "locked", { ex: lockoutDuration }),
        redis.set(tierKey, tier, { ex: 86400 * 3 }), // Keep tier record
      ]);

      return {
        isLocked: true,
        remainingSeconds: lockoutDuration,
        remainingAttemptsInTier: 0,
        tier,
      };
    }

    // Attempts remaining in current tier before reaching the next 5-attempt threshold
    const attemptsLeft = 5 - (fails % 5);

    return {
      isLocked: false,
      remainingSeconds: 0,
      remainingAttemptsInTier: attemptsLeft,
      tier,
    };
  } catch (error) {
    console.error("RECORD_FAILED_LOGIN_ERROR:", error);
    return { isLocked: false, remainingSeconds: 0, remainingAttemptsInTier: 4, tier: 0 };
  }
}

export async function clearLoginLockout(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const failsKey = `login:fails:${normalizedEmail}`;
  const lockoutKey = `login:lockout:${normalizedEmail}`;
  const tierKey = `login:tier:${normalizedEmail}`;

  try {
    await Promise.all([
      redis.del(failsKey),
      redis.del(lockoutKey),
      redis.del(tierKey),
    ]);
  } catch (error) {
    console.error("CLEAR_LOGIN_LOCKOUT_ERROR:", error);
  }
}
