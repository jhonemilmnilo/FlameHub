"use server";

import { SignUpSchema } from "../schemas";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { registerOtpSend } from "@/lib/redis/otp-send-limiter";
import { checkOtpLockout } from "@/lib/redis/otp-verify-limiter";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T; error?: never; fieldErrors?: never }
  | { success: false; error: string; code?: string; fieldErrors?: Record<string, string[]>; data?: never };

/**
 * 🔒 Server Action: Sign Up with Smart Orphan Account Recycling & Active OTP Guard
 */
export async function signUpAction(rawInput: unknown): Promise<ActionResult<{ email: string; isAlreadyActive?: boolean; remainingSeconds?: number }>> {
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

    // 2. Pre-check Lockout Gate: Is email currently locked down?
    const lockout = await checkOtpLockout(email);
    if (lockout.isLocked) {
      const mins = Math.ceil(lockout.remainingSeconds / 60);
      return {
        success: false,
        error: `Verification is temporarily locked (Tier ${lockout.tier}). Please wait ${mins} minute(s) before trying again.`,
        code: "SECURITY_LOCKOUT",
      };
    }

    // 3. Check PostgreSQL for verified, active students
    const [existingStudent, existingEmailUser] = await Promise.all([
      prisma.user.findUnique({ where: { studentId } }),
      prisma.user.findUnique({ where: { email } }),
    ]);

    if (existingStudent) {
      return {
        success: false,
        error: "This Student ID is already registered to an active account.",
        code: "STUDENT_ID_EXISTS",
      };
    }

    if (existingEmailUser) {
      return {
        success: false,
        error: "An account with this email address already exists. Please log in.",
        code: "EMAIL_EXISTS",
      };
    }

    // 4. Active OTP Send Gate: Check 120s lease (5-second threshold)
    const otpSendStatus = await registerOtpSend(email, 120);

    // If an OTP is still active (> 5s remaining), do not dispatch new email; guide user to verify
    if (otpSendStatus.isAlreadyActive) {
      return {
        success: true,
        data: {
          email,
          isAlreadyActive: true,
          remainingSeconds: otpSendStatus.remainingSeconds,
        },
      };
    }

    // 5. Smart Orphan Account Check in Supabase Auth (Solution 2)
    const adminSupabase = createAdminClient();
    const { data: userList } = await adminSupabase.auth.admin.listUsers();
    const existingAuthUser = userList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    const displayName = `${firstName} ${lastName}`.trim();
    const username = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${studentId.replace(/[^a-z0-9]/g, "")}`;

    if (existingAuthUser && !existingAuthUser.email_confirmed_at) {
      // 👻 Ghost Account Found: Delete the abandoned unconfirmed auth record so user can restart cleanly
      console.info(
        JSON.stringify({
          timestamp,
          level: "info",
          event: "RECYCLING_ABANDONED_AUTH_USER",
          email,
          userId: existingAuthUser.id,
        })
      );
      await adminSupabase.auth.admin.deleteUser(existingAuthUser.id);
    }

    // 6. Supabase Auth Registration & OTP Dispatch
    const supabase = await createClient();
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
