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
 * 🛡️ Dual-Layer Rate Limiting (Redis + Supabase Postgres Database)
 *
 * Checks Upstash Redis first for ultra-low latency (<5ms).
 * Simultaneously records & enforces a persistent barrier in Postgres `rate_limits` table.
 *
 * @param identifier Unique key (e.g. "otp:resend:student@school.edu")
 * @param maxAttempts Maximum allowed attempts in window
 * @param windowMs Window duration in milliseconds (e.g. 60000 for 1 minute)
 */
export async function checkPersistentRateLimit(
  identifier: string,
  maxAttempts: number = 3,
  windowMs: number = 60000
): Promise<{ success: boolean; remaining: number; resetAt: Date }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);

  try {
    // 1. Fast Layer: Try Redis check first
    const redisKey = `ratelimit:db:${identifier}`;
    const redisCount = await redis.incr(redisKey);
    if (redisCount === 1) {
      await redis.pexpire(redisKey, windowMs);
    }

    if (redisCount > maxAttempts) {
      return {
        success: false,
        remaining: 0,
        resetAt: expiresAt,
      };
    }

    // 2. Persistent Storage Layer: Sync with Postgres `rate_limits` table
    const record = await prisma.rateLimit.upsert({
      where: { identifier },
      create: {
        identifier,
        count: 1,
        expiresAt,
      },
      update: {
        count: { increment: 1 },
      },
    });

    // If existing record was expired, reset it
    if (record.expiresAt < now) {
      await prisma.rateLimit.update({
        where: { identifier },
        data: {
          count: 1,
          expiresAt,
        },
      });
      return { success: true, remaining: maxAttempts - 1, resetAt: expiresAt };
    }

    const isAllowed = record.count <= maxAttempts;
    return {
      success: isAllowed,
      remaining: Math.max(0, maxAttempts - record.count),
      resetAt: record.expiresAt,
    };
  } catch (error) {
    console.error("RATE_LIMIT_CHECK_ERROR:", error);
    // Fail-safe: Allow operation if rate limiter backend encounters unexpected issue
    return { success: true, remaining: 1, resetAt: expiresAt };
  }
}
