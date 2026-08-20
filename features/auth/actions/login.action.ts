"use server";

import { LoginSchema } from "../schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { checkLoginLockout, recordFailedLoginAttempt, clearLoginLockout } from "@/lib/redis/login-limiter";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T; error?: never; fieldErrors?: never }
  | {
      success: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[]>;
      requiresVerification?: boolean;
      email?: string;
      data?: never;
    };

/**
 * 🔒 Server Action: Enterprise Login with Zero-Trust Security & Rate Limiting
 */
export async function loginAction(rawInput: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const timestamp = new Date().toISOString();
  let clientIp = "127.0.0.1";

  try {
    const headerList = await headers();
    clientIp = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    // 1. Zod Validation
    const parsed = LoginSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: "Please provide a valid email and password.",
        fieldErrors: parsed.error.flatten().fieldErrors,
        code: "VALIDATION_ERROR",
      };
    }

    const { email, password, honeypot } = parsed.data;

    // Reject bot honeypot
    if (honeypot && honeypot.length > 0) {
      return { success: false, error: "Invalid submission.", code: "BOT_DETECTED" };
    }

    // 2. Pre-check: Brute-Force lockout status
    const lockout = await checkLoginLockout(email);
    if (lockout.isLocked) {
      const minutes = Math.ceil(lockout.remainingSeconds / 60);
      return {
        success: false,
        error: `Too many failed login attempts. Account access is temporarily locked. Please wait ${minutes} minute(s) before trying again.`,
        code: "SECURITY_LOCKOUT",
      };
    }

    // 3. Supabase Auth Verification (Headless / Zero-Session)
    // We use the admin client with no session persistence to test credentials,
    // ensuring NO session cookie is set in the user's browser until they verify OTP.
    const adminSupabase = createAdminClient();
    const { data: authData, error: authError } = await adminSupabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      const penalty = await recordFailedLoginAttempt(email);

      console.warn(
        JSON.stringify({
          timestamp,
          level: "warn",
          event: "LOGIN_FAILED",
          email,
          ip: clientIp,
          isLocked: penalty.isLocked,
          error: authError?.message,
        })
      );

      // Handle unconfirmed email error specifically
      if (authError?.message?.toLowerCase().includes("email not confirmed")) {
        return {
          success: false,
          error: "Your email address is not verified yet. Please complete verification.",
          requiresVerification: true,
          email,
          code: "EMAIL_NOT_VERIFIED",
        };
      }

      if (penalty.isLocked) {
        const mins = Math.ceil(penalty.remainingSeconds / 60);
        return {
          success: false,
          error: `Too many failed attempts. Login is locked for ${mins} minutes.`,
          code: "SECURITY_LOCKOUT",
        };
      }

      return {
        success: false,
        error: "Invalid email or password.",
        code: "INVALID_CREDENTIALS",
      };
    }

    // 4. Successful Password Check: Clear failed attempt history
    await clearLoginLockout(email);

    // 5. Dispatch 6-digit OTP code to the user's email
    await adminSupabase.auth.resend({
      type: "signup",
      email,
    });

    console.info(
      JSON.stringify({
        timestamp,
        level: "info",
        event: "LOGIN_CREDENTIALS_VERIFIED_OTP_SENT",
        userId: authData.user.id,
        email,
        ip: clientIp,
      })
    );

    return {
      success: true,
      data: { 
        redirectTo: `/auth/verify?email=${encodeURIComponent(email)}` 
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    console.error(
      JSON.stringify({
        timestamp,
        level: "error",
        event: "LOGIN_ACTION_EXCEPTION",
        ip: clientIp,
        error: errorMsg,
      })
    );

    return {
      success: false,
      error: "Unable to process login. Please try again later.",
      code: "INTERNAL_ERROR",
    };
  }
}
