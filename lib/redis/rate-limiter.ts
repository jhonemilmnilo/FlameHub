import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./client";
import { prisma } from "@/lib/prisma";

/**
 * 🔒 Enterprise Upstash Sliding Window Rate Limiters
 */

// 1. Post Creation Gate (Max 5 posts per minute per user)
export const postRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
  prefix: "ratelimit:posts",
});

// 2. Auth & Login Gate (Max 5 attempts per 10 minutes per IP/User to prevent brute-force)
export const authRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  analytics: true,
  prefix: "ratelimit:auth",
});

// 3. Comments & Reactions Gate (Max 30 actions per minute)
export const commentRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: true,
  prefix: "ratelimit:comments",
});

// 4. Direct Messaging Gate (Max 20 messages per minute)
export const messageRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  analytics: true,
  prefix: "ratelimit:messages",
});

/**
 * 🛡️ OTP Send Rate Limiting by Email
 * - Max 3 OTP sends per 120 seconds per email
 */
export async function trackOtpRateLimit(
  email: string,
  maxAttempts: number = 3,
  windowSeconds: number = 120
): Promise<{ success: boolean; count: number; remaining: number; resetAt: Date }> {
  const normalizedEmail = email.toLowerCase().trim();
  const redisKey = `otp:${normalizedEmail}`;
  const windowMs = windowSeconds * 1000;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);

  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    if (count > maxAttempts) {
      return {
        success: false,
        count,
        remaining: 0,
        resetAt: expiresAt,
      };
    }

    const record = await prisma.rateLimit.upsert({
      where: { key: redisKey },
      create: {
        key: redisKey,
        count: 1,
        expiresAt,
      },
      update: {
        count: { increment: 1 },
      },
    });

    if (record.expiresAt < now) {
      await prisma.rateLimit.update({
        where: { key: redisKey },
        data: {
          count: 1,
          expiresAt,
        },
      });
      return { success: true, count: 1, remaining: maxAttempts - 1, resetAt: expiresAt };
    }

    const isAllowed = record.count <= maxAttempts;
    return {
      success: isAllowed,
      count: record.count,
      remaining: Math.max(0, maxAttempts - record.count),
      resetAt: record.expiresAt,
    };
  } catch (error) {
    console.error("OTP_RATE_LIMIT_ERROR:", error);
    return { success: true, count: 1, remaining: 1, resetAt: expiresAt };
  }
}

/**
 * 🔍 Check Remaining OTP Send Cooldown TTL in Redis
 * Used on page load so refreshing does not reset the 120s timer
 */
export async function getOtpCooldownRemaining(email: string): Promise<number> {
  const normalizedEmail = email.toLowerCase().trim();
  const redisKey = `otp:${normalizedEmail}`;

  try {
    const ttl = await redis.ttl(redisKey);
    return ttl > 0 ? ttl : 0;
  } catch (error) {
    console.error("GET_OTP_COOLDOWN_ERROR:", error);
    return 0;
  }
}

/**
 * 🏰 4-Tier Perpetual Progressive Lockdown Architecture (By Email)
 * - Tier 1: 3 Failed attempts -> 5 Minutes Lockdown (300s)
 * - Tier 2: 6 Failed attempts -> 15 Minutes Lockdown (900s)
 * - Tier 3: 9 Failed attempts -> 1 Hour Lockdown (3,600s)
 * - Tier 4: 12 Failed attempts -> 24 Hours Lockdown (86,400s)
 * - After Tier 4 TTL expires -> Resets back to 0 (Perpetual Loop)
 */

export async function checkOtpLockout(
  email: string
): Promise<{ isLocked: boolean; remainingSeconds: number; tier: number }> {
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
      // Tier 4: 24 hours lockout (86400 seconds) - Resets fails counter to loop back to Tier 1 upon expiry!
      lockoutDuration = 86400;
      tier = 4;
      // Set failsKey TTL equal to Tier 4 lockout duration so they expire and reset together!
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
