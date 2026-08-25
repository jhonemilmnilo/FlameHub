"use server";

import { ResendOtpSchema } from "../schemas";
import { createClient } from "@/lib/supabase/server";
import { registerOtpSend, rollbackOtpSend } from "@/lib/redis/otp-send-limiter";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

/**
 * 🔒 Server Action: Resend OTP
 * - Strict Active OTP Gate: Max 1 OTP send per 120 seconds per Email
 * - Tracks total cumulative OTPs sent in Redis (24h)
 * - Triggers Supabase resend verification email
 * - Automatically rolls back reservation on mailer failure
 */
export async function resendOtpAction(rawInput: unknown): Promise<ActionResult<{ success: true; remainingSeconds: number }>> {
  const timestamp = new Date().toISOString();
  let clientIp = "127.0.0.1";
  let targetEmail: string | null = null;
  let didReserveOtp = false;

  try {
    const headerList = await headers();
    clientIp = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    // 1. Zod Validation
    const parsed = ResendOtpSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: "A valid email address is required.",
        code: "VALIDATION_ERROR",
      };
    }

    const { email } = parsed.data;
    targetEmail = email;

    // 2. Active OTP Send Gate (Renew lease and send fresh OTP email)
    const sendStatus = await registerOtpSend(email, 120, true);
    if (!sendStatus.success) {
      if (sendStatus.isDailyLimitReached) {
        return {
          success: false,
          error: "You have reached the maximum daily limit for verification requests on this account. Please try again in 24 hours.",
          code: "DAILY_LIMIT_REACHED",
        };
      }

      return {
        success: false,
        error: "Unable to process resend request. Please wait a moment and try again.",
        code: "RATE_LIMITED",
      };
    }

    didReserveOtp = true;

    const supabase = await createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (resendError) {
      // 🔄 Compensating Rollback: Refund daily attempt & remove cooldown
      await rollbackOtpSend(email);

      console.warn(
        JSON.stringify({
          timestamp,
          level: "warn",
          event: "OTP_RESEND_SUPABASE_ERROR_ROLLED_BACK",
          email,
          ip: clientIp,
          error: resendError.message,
        })
      );

      return {
        success: false,
        error: "Unable to send verification code. Please try again later.",
        code: "RESEND_FAILED",
      };
    }

    console.info(
      JSON.stringify({
        timestamp,
        level: "info",
        event: "OTP_RESENT_SUCCESS",
        email,
        ip: clientIp,
      })
    );

    return {
      success: true,
      data: { success: true, remainingSeconds: sendStatus.remainingSeconds },
    };
  } catch (err: unknown) {
    if (didReserveOtp && targetEmail) {
      await rollbackOtpSend(targetEmail);
    }

    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    console.error(
      JSON.stringify({
        timestamp,
        level: "error",
        event: "RESEND_OTP_EXCEPTION_ROLLED_BACK",
        ip: clientIp,
        error: errorMsg,
      })
    );

    return {
      success: false,
      error: "Unable to resend code. Please try again later.",
      code: "INTERNAL_ERROR",
    };
  }
}
