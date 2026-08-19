import { z } from "zod";

/**
 * 🔒 Post Creation Schema
 * Defends against XSS, oversized captions, and malicious injection.
 */
export const CreatePostSchema = z.object({
  caption: z
    .string()
    .trim()
    .min(1, "Caption cannot be empty")
    .max(2200, "Caption cannot exceed 2200 characters"),
  mediaUrls: z
    .array(z.string().url("Invalid media URL"))
    .max(10, "Maximum 10 media files per post")
    .default([]),
  tags: z
    .array(z.string().trim().regex(/^[a-zA-Z0-9_]+$/, "Tags can only contain alphanumeric characters"))
    .max(30, "Maximum 30 hashtags allowed")
    .default([]),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

/**
 * 🔒 User Profile Update Schema
 */
export const UpdateProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, underscores, and dots"),
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(50, "Display name cannot exceed 50 characters"),
  bio: z
    .string()
    .trim()
    .max(160, "Bio cannot exceed 160 characters")
    .optional()
    .default(""),
  avatarUrl: z.string().url("Invalid avatar URL").optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
