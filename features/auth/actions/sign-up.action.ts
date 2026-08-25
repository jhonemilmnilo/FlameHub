"use server";

import { SignUpSchema } from "../schemas";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { registerOtpSend } from "@/lib/redis/otp-send-limiter";
import { checkOtpLockout } from "@/lib/redis/otp-verify-limiter";
import { redis } from "@/lib/redis/client";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T; error?: never; fieldErrors?: never }
  | { success: false; error: string; code?: string; fieldErrors?: Record<string, string[]>; data?: never };

/**
 * 🔒 Server Action: Sign Up with Smart Orphan Account Recycling & Active OTP Guard
 */
export async function signUpAction(rawInput: unknown): Promise<ActionResult<{ email: string; isAlreadyActive?: boolean }>> {
  const timestamp = new Date().toISOString();
  let clientIp = "127.0.0.1";

  try {
    const headerList = await headers();
    clientIp = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    // 🛡️ IP Rate Limiter: Max 10 registration submissions per hour per IP to prevent bulk enumeration
    try {
      const ipSignupKey = `ratelimit:signup:${clientIp}`;
      const signupCount = await redis.incr(ipSignupKey);
      if (signupCount === 1) {
        await redis.expire(ipSignupKey, 3600);
      }
      if (signupCount > 10) {
        return {
          success: false,
          error: "Too many registration attempts from this network. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
        };
      }
    } catch {
      // Continue on Redis failure to avoid blocking legitimate users
    }

    // 1. Validate payload via Zod
    const parsed = SignUpSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: "Please correct the highlighted errors in the form.",
        fieldErrors: parsed.error.flatten().fieldErrors,
        code: "VALIDATION_ERROR",
      };
    }

    const { email, password, firstName, lastName, studentId, department, bio, honeypot } = parsed.data;

    // Reject bot honeypot
    if (honeypot && honeypot.length > 0) {
      return { success: false, error: "Invalid submission.", code: "BOT_DETECTED" };
    }

    // 2. Pre-check Lockout Gate: Is email currently locked down?
    const lockout = await checkOtpLockout(email);
    if (lockout.isLocked) {
      return {
        success: false,
        error: "Verification is temporarily locked due to multiple failed attempts. Please try again later.",
        code: "SECURITY_LOCKOUT",
      };
    }

    // 3. Check PostgreSQL for verified, active students (Unified Anti-Enumeration Guard)
    const [existingStudent, existingEmailUser] = await Promise.all([
      prisma.user.findUnique({ where: { studentId } }),
      prisma.user.findUnique({ where: { email } }),
    ]);

    if (existingStudent || existingEmailUser) {
      return {
        success: false,
        error: "An account with these credentials already exists. Please log in or use account recovery.",
        code: "ACCOUNT_EXISTS",
      };
    }

    // 4. Active OTP Send Gate: Check 120s lease (5-second threshold) and daily quota
    const otpSendStatus = await registerOtpSend(email, 120);

    if (!otpSendStatus.success) {
      if (otpSendStatus.isDailyLimitReached) {
        return {
          success: false,
          error: "You have reached the maximum daily limit for verification requests on this account. Please try again in 24 hours.",
          code: "DAILY_LIMIT_REACHED",
        };
      }

      return {
        success: false,
        error: "Unable to process registration at this time. Please try again later.",
        code: "RATE_LIMITED",
      };
    }

    // If an OTP is still active (> 5s remaining), do not dispatch new email; guide user to verify
    if (otpSendStatus.isAlreadyActive) {
      return {
        success: true,
        data: {
          email,
          isAlreadyActive: true,
        },
      };
    }

    // 5. Supabase Auth Registration & OTP Dispatch
    const displayName = `${firstName} ${lastName}`.trim();
    const username = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${studentId.replace(/[^a-z0-9]/g, "")}`;
    const userMetadata = {
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      student_id: studentId,
      department,
      username,
      bio,
    };

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userMetadata,
      },
    });

    // 👻 O(1) Smart Orphan Recovery: If Supabase returns conflict but User is NOT in verified DB
    if (authError && (authError.message.toLowerCase().includes("already registered") || authError.status === 422)) {
      // Resend OTP directly to existing unconfirmed auth user
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (!resendError) {
        console.info(
          JSON.stringify({
            timestamp,
            level: "info",
            event: "RECYCLED_UNCONFIRMED_GHOST_USER_DIRECT",
            email,
            ip: clientIp,
          })
        );

        return {
          success: true,
          data: { email },
        };
      }
    }

    if (authError || !authData?.user) {
      console.error(
        JSON.stringify({
          timestamp,
          level: "error",
          event: "SUPABASE_SIGNUP_FAILED",
          ip: clientIp,
          error: authError?.message,
        })
      );

      return {
        success: false,
        error: "Unable to process registration. Please try again later.",
        code: "AUTH_ERROR",
      };
    }

    console.info(
      JSON.stringify({
        timestamp,
        level: "info",
        event: "SIGNUP_OTP_SENT",
        email,
        studentId,
        ip: clientIp,
      })
    );

    return {
      success: true,
      data: { email },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    console.error(
      JSON.stringify({
        timestamp,
        level: "error",
        event: "SIGNUP_ACTION_EXCEPTION",
        ip: clientIp,
        error: errorMsg,
      })
    );

    return {
      success: false,
      error: "Unable to process registration. Please try again later.",
      code: "INTERNAL_ERROR",
    };
  }
}
