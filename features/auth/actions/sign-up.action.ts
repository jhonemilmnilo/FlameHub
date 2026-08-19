"use server";

import { SignUpSchema } from "../schemas";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { authRateLimiter } from "@/lib/redis";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T; error?: never; fieldErrors?: never }
  | { success: false; error: string; code?: string; fieldErrors?: Record<string, string[]>; data?: never };

/**
 * 🔒 Server Action: Sign Up (Initiates Onboarding & Sends OTP)
 * - Honeypot & IP Rate Limiting
 * - Pre-flight student ID & email uniqueness checks
 * - Registers user in Supabase Auth (Triggers 6-digit confirmation OTP email)
 */
export async function signUpAction(rawInput: unknown): Promise<ActionResult<{ email: string }>> {
  const timestamp = new Date().toISOString();
  let clientIp = "127.0.0.1";

  try {
    const headerList = await headers();
    clientIp = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

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

    // 2. Anti-Brute-Force Rate Limiter (Max 5 attempts / 10 mins per IP)
    const rateLimit = await authRateLimiter.limit(`signup:${clientIp}`);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "Too many sign-up attempts from this network. Please try again in 10 minutes.",
        code: "RATE_LIMITED",
      };
    }

    // 3. Pre-flight Check in DB: Prevent duplicate Student IDs & Emails
    const [existingStudent, existingEmail] = await Promise.all([
      prisma.user.findUnique({ where: { studentId } }),
      prisma.user.findUnique({ where: { email } }),
    ]);

    if (existingStudent) {
      return {
        success: false,
        error: "This Student ID is already registered.",
        code: "STUDENT_ID_EXISTS",
      };
    }

    if (existingEmail) {
      return {
        success: false,
        error: "An account with this email address already exists.",
        code: "EMAIL_EXISTS",
      };
    }

    // 4. Supabase Auth Registration
    const supabase = await createClient();
    const displayName = `${firstName} ${lastName}`.trim();
    const username = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${studentId.replace(/[^a-z0-9]/g, "")}`;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          display_name: displayName,
          student_id: studentId,
          department,
          username,
          bio,
        },
      },
    });

    if (authError || !authData.user) {
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
        error: authError?.message || "Failed to initialize account.",
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
