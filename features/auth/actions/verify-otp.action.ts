"use server";

import { VerifyOtpSchema } from "../schemas";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkOtpLockout, recordFailedOtpAttempt, clearOtpLockout } from "@/lib/redis/otp-verify-limiter";
import { clearActiveOtpSend } from "@/lib/redis/otp-send-limiter";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T; error?: never; fieldErrors?: never }
  | {
      success: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[]>;
      lockout?: { isLocked: boolean };
      data?: never;
    };

/**
 * 🔒 Server Action: Verify OTP with 4-Tier Perpetual Progressive Lockdown (By Email)
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

    // 2. Pre-check: Is this email currently locked down?
    const lockoutStatus = await checkOtpLockout(email);
    if (lockoutStatus.isLocked) {
      return {
        success: false,
        error: "Verification temporarily disabled due to multiple failed attempts. Please try again later.",
        code: "SECURITY_LOCKOUT",
        lockout: { isLocked: true },
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
      // 🚨 Record failed attempt & evaluate 4-tier lockout penalty
      const penalty = await recordFailedOtpAttempt(email);

      console.warn(
        JSON.stringify({
          timestamp,
          level: "warn",
          event: "OTP_VERIFICATION_FAILED",
          email,
          ip: clientIp,
          isLocked: penalty.isLocked,
          tier: penalty.tier,
          error: authError?.message,
        })
      );

      if (penalty.isLocked) {
        return {
          success: false,
          error: "Verification temporarily disabled due to multiple failed attempts. Please try again later.",
          code: "SECURITY_LOCKOUT",
          lockout: { isLocked: true },
        };
      }

      return {
        success: false,
        error: "Invalid or expired verification code. Please check and try again.",
        code: "INVALID_OTP",
      };
    }

    // 4. Verification Successful: Wipe lockout and active OTP lease
    await Promise.all([clearOtpLockout(email), clearActiveOtpSend(email)]);

    const meta = authData.user.user_metadata || {};
    const firstName = meta.first_name || "";
    const lastName = meta.last_name || "";
    const displayName = meta.display_name || `${firstName} ${lastName}`.trim() || "Student";
    const studentId = meta.student_id || null;
    const department = meta.department || null;
    const bio = meta.bio || "";
    const now = new Date();

    // 5. Resilient Database Upsert with Exponential Backoff Retries
    let upsertSuccess = false;
    let lastUpsertError: unknown = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await prisma.user.upsert({
          where: { id: authData.user.id },
          update: {
            email,
            displayName,
            firstName,
            lastName,
            studentId,
            department,
            bio,
            isEmailVerified: true,
            emailVerifiedAt: now,
          },
          create: {
            id: authData.user.id,
            email,
            nickname: null,
            displayName,
            firstName,
            lastName,
            studentId,
            department,
            bio,
            isEmailVerified: true,
            emailVerifiedAt: now,
          },
        });
        upsertSuccess = true;
        break;
      } catch (upsertErr) {
        lastUpsertError = upsertErr;
        console.warn(
          `PRISMA_UPSERT_ATTEMPT_${attempt}_FAILED: Retrying in ${attempt * 200}ms...`,
          upsertErr
        );
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 200));
        }
      }
    }

    if (!upsertSuccess) {
      console.error(
        JSON.stringify({
          timestamp,
          level: "error",
          event: "CRITICAL_PRISMA_UPSERT_DESYNC_FAILURE",
          userId: authData.user.id,
          email,
          error: lastUpsertError instanceof Error ? lastUpsertError.message : String(lastUpsertError),
        })
      );
    }

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
