"use server";

import { LoginSchema } from "../schemas";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkLoginLockout, recordFailedLoginAttempt, clearLoginLockout } from "@/lib/redis/login-limiter";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T; error?: never; fieldErrors?: never; lockout?: never }
  | {
      success: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[]>;
      requiresVerification?: boolean;
      email?: string;
      lockout?: { isLocked: boolean; remainingSeconds: number; tier: number };
      data?: never;
    };

/**
 * 🔒 Server Action: Direct Login with 5-Tier Rate Limiting Security
 * - Direct authentication without login OTP verification page.
 * - Enforces progressive lockouts: 3m (T1), 5m (T2), 10m (T3), 1hr (T4), 24hrs (T5).
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

    // 2. Pre-check: 5-Tier Brute-Force lockout status
    const lockout = await checkLoginLockout(email);
    if (lockout.isLocked) {
      const minutes = Math.ceil(lockout.remainingSeconds / 60);
      const timeStr = minutes >= 60 ? `${Math.ceil(minutes / 60)} hour(s)` : `${minutes} minute(s)`;
      return {
        success: false,
        error: `Account Locked (Tier ${lockout.tier}): Access temporarily disabled. Please wait ${timeStr} before trying again.`,
        code: "SECURITY_LOCKOUT",
        lockout: {
          isLocked: true,
          remainingSeconds: lockout.remainingSeconds,
          tier: lockout.tier,
        },
      };
    }

    // 3. Database User Verification: Check if email is registered in our database
    const dbUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, isEmailVerified: true },
    });

    if (!dbUser) {
      return {
        success: false,
        error: "No account found with this email address. Please sign up to create an account.",
        code: "USER_NOT_FOUND",
        fieldErrors: {
          email: ["This email is not registered yet."],
        },
      };
    }

    // 4. Authenticate with Supabase Server Client (Sets secure HttpOnly session cookie on success)
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
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
          tier: penalty.tier,
          error: authError?.message,
        })
      );

      // Handle unconfirmed email error specifically (directs them to verify from sign-up)
      if (authError?.message?.toLowerCase().includes("email not confirmed")) {
        return {
          success: false,
          error: "Your email address is not verified yet. Please complete verification with your signup code.",
          requiresVerification: true,
          email,
          code: "EMAIL_NOT_VERIFIED",
        };
      }

      if (penalty.isLocked) {
        const mins = Math.ceil(penalty.remainingSeconds / 60);
        const timeStr = mins >= 60 ? `${Math.ceil(mins / 60)} hour(s)` : `${mins} minute(s)`;
        return {
          success: false,
          error: `Account Locked (Tier ${penalty.tier}): 5 incorrect password attempts. Login is disabled for ${timeStr}.`,
          code: "SECURITY_LOCKOUT",
          lockout: {
            isLocked: true,
            remainingSeconds: penalty.remainingSeconds,
            tier: penalty.tier,
          },
        };
      }

      return {
        success: false,
        error: `Invalid email or password. (${penalty.remainingAttemptsInTier} attempt(s) remaining before lockdown).`,
        code: "INVALID_CREDENTIALS",
      };
    }

    // 4. Successful Login: Clear failed attempt history
    await clearLoginLockout(email);

    console.info(
      JSON.stringify({
        timestamp,
        level: "info",
        event: "USER_LOGIN_SUCCESS",
        userId: authData.user.id,
        email,
        ip: clientIp,
      })
    );

    return {
      success: true,
      data: { 
        redirectTo: "/" 
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
