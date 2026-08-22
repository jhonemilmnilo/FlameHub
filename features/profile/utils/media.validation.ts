import { z } from "zod";

/**
 * 🔒 Shared Single Source of Truth for Media Validation
 * Used symmetrically across:
 * 1. Client-Side File Picker
 * 2. Client-Side Image Compressor
 * 3. Server Action Upload Gate
 * 4. Database Mutation Gate
 */

export const AVATAR_RULES = {
  maxRawSizeMB: 10,
  maxRawSizeBytes: 10 * 1024 * 1024,
  maxCompressedSizeBytes: 2 * 1024 * 1024, // 2MB max after compression
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  maxWidthOrHeight: 1200,
  quality: 0.85,
} as const;

export const POST_MEDIA_RULES = {
  maxRawSizeMB: 15,
  maxRawSizeBytes: 15 * 1024 * 1024,
  maxCompressedSizeBytes: 5 * 1024 * 1024, // 5MB max after compression
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  maxWidthOrHeight: 2048,
  quality: 0.88,
} as const;

export const AvatarValidationSchema = z.object({
  size: z.number().max(AVATAR_RULES.maxCompressedSizeBytes, "File size cannot exceed 2MB."),
  type: z.enum(["image/jpeg", "image/png", "image/webp"], {
    errorMap: () => ({ message: "Only JPEG, PNG, and WebP images are allowed." }),
  }),
});

/**
 * 🛡️ Helper function to pre-validate a client File
 */
export function validateClientFile(file: File, type: "avatar" | "post" = "avatar"): {
  isValid: boolean;
  error?: string;
} {
  const rules = type === "avatar" ? AVATAR_RULES : POST_MEDIA_RULES;

  if (file.size > rules.maxRawSizeBytes) {
    return {
      isValid: false,
      error: `File is too large. Maximum raw size is ${rules.maxRawSizeMB}MB.`,
    };
  }

  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  const allowedExts = rules.allowedExtensions as readonly string[];
  if (!allowedExts.includes(extension)) {
    return {
      isValid: false,
      error: `Forbidden file extension '${extension}'. Allowed: ${rules.allowedExtensions.join(", ")}`,
    };
  }

  const allowedMimes = rules.allowedMimeTypes as readonly string[];
  if (!allowedMimes.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported image format (${file.type}). Allowed: JPEG, PNG, WebP.`,
    };
  }

  return { isValid: true };
}
