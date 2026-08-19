"use server";

import { VerifyOtpSchema } from "../schemas";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { authRateLimiter } from "@/lib/redis";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T; error?: never; fieldErrors?: never }
  | { success: false; error: string; code?: string; fieldErrors?: Record<string, string[]>; data?: never };

/**
 * 🔒 Server Action: Verify OTP
 * - Protects against OTP brute-force guessing with Upstash Rate Limiter
 * - Verifies 6-digit token with Supabase Auth
 * - Provisions official User record in PostgreSQL Prisma DB
 * - Returns verified authenticated session
 */
export async function verifyOtpAction(rawInput: unknown): Promise<ActionResult<{ userId: string }>> {
  const timestamp = new Date().toISOString();
  let clientIp = "127.0.0.1";

  try {
    const headerList = await headers();
    clientIp = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    // 1. Zod Validation
    const parsed = VerifyOtpSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: "Please enter a valid 6-digit code.",
        fieldErrors: parsed.error.flatten().fieldErrors,
        code: "VALIDATION_ERROR",
      };
    }

    const { email, token } = parsed.data;

    // 2. Anti-Brute-Force Rate Limiting on OTP (Max 5 attempts / 10 mins per IP+Email)
    const rateLimit = await authRateLimiter.limit(`otp:${clientIp}:${email}`);
    if (!rateLimit.success) {
      console.warn(
        JSON.stringify({
          timestamp,
          level: "security",
          event: "OTP_RATE_LIMIT_TRIGGERED",
          ip: clientIp,
          email,
        })
      );

      return {
        success: false,
        error: "Too many incorrect attempts. Please request a new code or try again in 10 minutes.",
        code: "RATE_LIMITED",
      };
    }

    // 3. Supabase OTP Verification
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (authError || !authData.user) {
      console.warn(
        JSON.stringify({
          timestamp,
          level: "warn",
          event: "OTP_VERIFICATION_FAILED",
          email,
          ip: clientIp,
          error: authError?.message,
        })
      );

      return {
        success: false,
        error: authError?.message || "Invalid or expired verification code.",
        code: "INVALID_OTP",
      };
    }

    // 4. Extract User Metadata & Provision User Profile in PostgreSQL DB
    const meta = authData.user.user_metadata || {};
    const firstName = meta.first_name || "";
    const lastName = meta.last_name || "";
    const displayName = meta.display_name || `${firstName} ${lastName}`.trim() || "Student";
    const studentId = meta.student_id || null;
    const department = meta.department || null;
    const username = meta.username || `user_${authData.user.id.slice(0, 8)}`;
    const bio = meta.bio || "";

    await prisma.user.upsert({
      where: { id: authData.user.id },
      update: {
        email,
        username,
        displayName,
        firstName,
        lastName,
        studentId,
        department,
        bio,
      },
      create: {
        id: authData.user.id,
        email,
        username,
        displayName,
        firstName,
        lastName,
        studentId,
        department,
        bio,
      },
    });

    console.info(
      JSON.stringify({
        timestamp,
        level: "info",
        event: "USER_EMAIL_VERIFIED_SUCCESS",
        userId: authData.user.id,
        email,
        ip: clientIp,
      })
    );

    return {
      success: true,
      data: { userId: authData.user.id },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    console.error(
      JSON.stringify({
        timestamp,
        level: "error",
        event: "VERIFY_OTP_EXCEPTION",
        ip: clientIp,
        error: errorMsg,
      })
    );

    return {
      success: false,
      error: "Failed to verify code. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
}
