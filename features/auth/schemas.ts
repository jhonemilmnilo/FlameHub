import { z } from "zod";

/**
 * 🔒 Fortress-Grade Password Validation Pattern
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password cannot exceed 72 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

/**
 * 🔒 Fortress-Grade Sign Up Schema
 */
export const SignUpSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name cannot exceed 50 characters")
      .regex(/^[a-zA-Z\s.'-]+$/, "First name contains invalid characters"),
    lastName: z
      .string()
      .trim()
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name cannot exceed 50 characters")
      .regex(/^[a-zA-Z\s.'-]+$/, "Last name contains invalid characters"),
    studentId: z
      .string()
      .trim()
      .min(3, "Student ID must be at least 3 characters")
      .max(30, "Student ID cannot exceed 30 characters")
      .regex(/^[a-zA-Z0-9-]+$/, "Student ID can only contain letters, numbers, and hyphens"),
    email: z
      .string()
      .trim()
      .email("Please provide a valid email address")
      .toLowerCase(),
    department: z
      .string()
      .trim()
      .min(2, "Department is required")
      .max(80, "Department cannot exceed 80 characters"),
    password: passwordSchema,
    confirmPassword: passwordSchema,
    bio: z
      .string()
      .trim()
      .max(500, "Bio cannot exceed 500 characters")
      .optional()
      .default(""),
    // 🪤 Honeypot field for anti-bot scraping
    honeypot: z.string().max(0, "Bot detected").optional().default(""),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof SignUpSchema>;

/**
 * 🔒 Verify OTP Schema
 */
export const VerifyOtpSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  token: z.string().length(6, "Verification code must be exactly 6 digits").regex(/^[0-9]+$/, "Code must contain only numbers"),
});

export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

/**
 * 🔒 Resend OTP Schema
 */
export const ResendOtpSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
});

export type ResendOtpInput = z.infer<typeof ResendOtpSchema>;
