"use server";

import { ResendOtpSchema } from "../schemas";
import { createClient } from "@/lib/supabase/server";
import { authRateLimiter } from "@/lib/redis";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

/**
 * 🔒 Server Action: Resend OTP
 * - Enforces rate limiting against email flooding
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

    // Rate Limiter: Max 3 resend attempts per 10 minutes per email
    const rateLimit = await authRateLimiter.limit(`resend:${clientIp}:${email}`);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "Too many resend requests. Please wait a few minutes before trying again.",
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
