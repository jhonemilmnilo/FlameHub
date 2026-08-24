"use server";

import { ResendOtpSchema } from "../schemas";
import { createClient } from "@/lib/supabase/server";
import { registerOtpSend } from "@/lib/redis/otp-send-limiter";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

/**
 * 🔒 Server Action: Resend OTP
 * - Strict Active OTP Gate: Max 1 OTP send per 120 seconds per Email
 * - Tracks total cumulative OTPs sent in Redis (24h)
 * - Triggers Supabase resend verification email
 */
export async function resendOtpAction(rawInput: unknown): Promise<ActionResult<{ success: true; remainingSeconds: number }>> {
  const timestamp = new Date().toISOString();
  let clientIp = "127.0.0.1";

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

    // 2. Active OTP Send Gate (Cannot resend if an active OTP is already running)
    const sendStatus = await registerOtpSend(email, 120);
    if (!sendStatus.success) {
      return {
        success: false,
        error: "A verification code was already sent recently. Please check your inbox or wait before requesting another.",
        code: "RATE_LIMITED",
      };
    }

    const supabase = await createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (resendError) {
      console.warn(
        JSON.stringify({
          timestamp,
          level: "warn",
          event: "OTP_RESEND_SUPABASE_ERROR",
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
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    console.error(
      JSON.stringify({
        timestamp,
        level: "error",
        event: "RESEND_OTP_EXCEPTION",
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
