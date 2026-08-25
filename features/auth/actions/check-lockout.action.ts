"use server";

import { checkOtpLockout } from "@/lib/redis/otp-verify-limiter";
import { checkActiveOtpSendStatus } from "@/lib/redis/otp-send-limiter";
import { checkLoginLockout } from "@/lib/redis/login-limiter";
import { redis } from "@/lib/redis/client";
import { headers } from "next/headers";
import { z } from "zod";

const EmailQuerySchema = z.string().email().max(255);

/**
 * 🛡️ Helper: IP Rate Limiter for Status Checks (Sliding Window: 15 queries per 60s per IP)
 * Prevents automated adversary bots from continuously polling and profiling user accounts.
 */
async function checkStatusQueryRateLimit(ip: string): Promise<boolean> {
  try {
    const rateLimitKey = `ratelimit:status_check:${ip}`;
    const count = await redis.incr(rateLimitKey);
    if (count === 1) {
      await redis.expire(rateLimitKey, 60); // 60-second window
    }
    return count <= 15; // Max 15 queries per minute
  } catch {
    // Fail-safe: allow on redis error to not block legitimate clients
    return true;
  }
}

/**
 * 🔒 Server Action: Check Live OTP Lockout and Send Cooldown Status for an Email
 * - Enforces IP rate limiting to prevent reconnaissance probing.
 * - Validates email format strictly with Zod.
 */
export async function getEmailLockoutStatusAction(rawEmail: string) {
  try {
    const headerList = await headers();
    const clientIp = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    // 1. Enforce IP Rate Limiting
    const allowed = await checkStatusQueryRateLimit(clientIp);
    if (!allowed) {
      return { isLocked: false };
    }

    // 2. Validate email structure
    const parsed = EmailQuerySchema.safeParse(rawEmail?.trim().toLowerCase());
    if (!parsed.success) {
      return { isLocked: false };
    }

    const email = parsed.data;
    const [lockout, sendStatus] = await Promise.all([
      checkOtpLockout(email),
      checkActiveOtpSendStatus(email),
    ]);

    return {
      isLocked: lockout.isLocked,
      remainingCooldownSeconds: sendStatus.remainingSeconds,
      isDailyLimitReached: sendStatus.isDailyLimitReached,
    };
  } catch {
    return { isLocked: false, remainingCooldownSeconds: 0, isDailyLimitReached: false };
  }
}

/**
 * 🔒 Server Action: Check Live Login Lockout Status
 * - Enforces IP rate limiting to prevent reconnaissance probing.
 * - Validates email format strictly with Zod.
 */
export async function getLoginLockoutStatusAction(rawEmail: string) {
  try {
    const headerList = await headers();
    const clientIp = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    // 1. Enforce IP Rate Limiting
    const allowed = await checkStatusQueryRateLimit(clientIp);
    if (!allowed) {
      return { isLocked: false };
    }

    // 2. Validate email structure
    const parsed = EmailQuerySchema.safeParse(rawEmail?.trim().toLowerCase());
    if (!parsed.success) {
      return { isLocked: false };
    }

    const email = parsed.data;
    const status = await checkLoginLockout(email);
    return { isLocked: status.isLocked };
  } catch {
    return { isLocked: false };
  }
}

