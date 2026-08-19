"use server";

import { SignUpSchema } from "./schemas";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { authRateLimiter } from "@/lib/redis";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T; error?: never; fieldErrors?: never }
  | { success: false; error: string; code?: string; fieldErrors?: Record<string, string[]>; data?: never };

/**
 * 🔒 Server Action: Sign Up Student
 * - Validates input with Zod
 * - Enforces Upstash Rate Limiting against bot attacks
 * - Registers user in Supabase Auth (Zero-trust JWT)
 * - Records User profile in PostgreSQL Prisma DB
 */
export async function signUpAction(rawInput: unknown): Promise<ActionResult<{ userId: string }>> {
  try {
    // 1. Anti-Brute-Force Rate Limiting by IP
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const rateLimit = await authRateLimiter.limit(`signup:${ip}`);

    if (!rateLimit.success) {
      return {
        success: false,
        error: "Too many sign-up attempts. Please try again in 10 minutes.",
        code: "RATE_LIMITED",
      };
    }

    // 2. Validate Inbound Payload with Zod
    const parsed = SignUpSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: "Please correct the errors in the form.",
        fieldErrors: parsed.error.flatten().fieldErrors,
        code: "VALIDATION_ERROR",
      };
    }

    const { email, password, firstName, lastName, studentId, department, bio } = parsed.data;

    // 3. Check if Student ID is already registered in DB
    const existingStudent = await prisma.user.findUnique({
      where: { studentId },
    });

    if (existingStudent) {
      return {
        success: false,
        error: "This Student ID is already registered.",
        code: "STUDENT_EXISTS",
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
        },
      },
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || "Failed to create Supabase account.",
        code: "AUTH_ERROR",
      };
    }

    // 5. Create Profile in PostgreSQL via Prisma
    await prisma.user.upsert({
      where: { id: authData.user.id },
      update: {
        email,
        username,
        displayName,
        firstName,
        lastName,
        studentId,
        department,
        bio,
      },
      create: {
        id: authData.user.id,
        email,
        username,
        displayName,
        firstName,
        lastName,
        studentId,
        department,
        bio,
      },
    });

    return {
      success: true,
      data: { userId: authData.user.id },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    console.error("SIGNUP_ACTION_FAILED:", errorMsg);
    return {
      success: false,
      error: "Unable to create your account. Please try again later.",
      code: "INTERNAL_ERROR",
    };
  }
}
