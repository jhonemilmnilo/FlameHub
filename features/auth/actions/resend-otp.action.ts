"use server";

import { ResendOtpSchema } from "../schemas";
import { createClient } from "@/lib/supabase/server";
import { trackOtpRateLimit } from "@/lib/redis/rate-limiter";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

/**
 * 🔒 Server Action: Resend OTP
 * - Dual-Layer Rate Limiting (Redis + PostgreSQL `RateLimits` table)
 * - Max 3 resend attempts per 120 seconds per Email
 * - Triggers Supabase resend verification email
 */
export async function resendOtpAction(rawInput: unknown): Promise<ActionResult<{ success: boolean }>> {
  const timestamp = new Date().toISOString();
  let clientIp = "127.0.0.1";

  try {
    const headerList = await headers();
    clientIp = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    const parsed = ResendOtpSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid email address.",
        code: "VALIDATION_ERROR",
      };
    }

    const { email } = parsed.data;

    // 🛡️ Dual-Layer Rate Limiter: Max 3 resends per 120 seconds (Key: "otp:email@domain.com")
    const rateLimit = await trackOtpRateLimit(email, 3, 120);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "Too many resend requests for this email. Please wait 2 minutes before trying again.",
        code: "RATE_LIMITED",
      };
    }

    const supabase = await createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (resendError) {
      return {
        success: false,
        error: resendError.message || "Failed to resend verification code.",
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
      data: { success: true },
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
