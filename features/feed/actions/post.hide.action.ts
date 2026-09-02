"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

/**
 * 🔒 Hide a Post from the Authenticated User's Feed
 * Business Rules & Security Directives:
 * 1. Authenticated session required (Zero-trust server verification).
 * 2. Self-Hide Prohibition: Users cannot hide their own posts (they should delete them instead).
 * 3. Composite unique constraint `@@unique([userId, postId])` prevents duplicate entries.
 * 4. Automatic cascading on delete for both user and post.
 */
export async function hidePostAction(
  postId: string
): Promise<ActionResult<{ isHidden: boolean }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return {
        success: false,
        error: "You must be logged in to hide posts.",
        code: "UNAUTHORIZED",
      };
    }

    if (!postId || typeof postId !== "string") {
      return {
        success: false,
        error: "Invalid post ID.",
        code: "VALIDATION_ERROR",
      };
    }

    // 1. Ensure user record exists in Postgres
    let userRecord = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (!userRecord) {
      const meta = authUser.user_metadata || {};
      const firstName = meta.first_name || "";
      const lastName = meta.last_name || "";
      const displayName = meta.display_name || `${firstName} ${lastName}`.trim() || "Student";
      const studentId = meta.student_id || "00-0000-000000";
      const department = meta.department || "CITE";

      userRecord = await prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email,
          displayName,
          firstName,
          lastName,
          studentId,
          department,
          isEmailVerified: true,
        },
      });
    }

    // 2. Fetch the target post to verify existence and authorship
    const targetPost = await prisma.post.findFirst({
      where: {
        id: postId,
        isDeleted: false,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!targetPost) {
      return {
        success: false,
        error: "Post not found or has been removed.",
        code: "NOT_FOUND",
      };
    }

    // 🔒 3. Self-Hide Prohibition: Users cannot hide their own post
    if (targetPost.userId === authUser.id) {
      return {
        success: false,
        error: "You cannot hide your own post.",
        code: "FORBIDDEN",
      };
    }

    // 4. Upsert / Create HiddenPost entry (idempotent)
    await prisma.hiddenPost.upsert({
      where: {
        userId_postId: {
          userId: authUser.id,
          postId: postId,
        },
      },
      create: {
        userId: authUser.id,
        postId: postId,
      },
      update: {},
    });

    return {
      success: true,
      data: { isHidden: true },
    };
  } catch {
    return {
      success: false,
      error: "Unable to hide post. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * 🔒 Unhide a Previously Hidden Post
 * Business Rules & Security Directives:
 * 1. Authenticated session required.
 * 2. Delete HiddenPost entry matching composite [userId, postId].
 * 3. Restores post visibility on main feed and profile.
 */
export async function unhidePostAction(
  postId: string
): Promise<ActionResult<{ isHidden: boolean }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return {
        success: false,
        error: "You must be logged in to unhide posts.",
        code: "UNAUTHORIZED",
      };
    }

    if (!postId || typeof postId !== "string") {
      return {
        success: false,
        error: "Invalid post ID.",
        code: "VALIDATION_ERROR",
      };
    }

    // Delete HiddenPost entry if exists
    await prisma.hiddenPost.deleteMany({
      where: {
        userId: authUser.id,
        postId: postId,
      },
    });

    return {
      success: true,
      data: { isHidden: false },
    };
  } catch {
    return {
      success: false,
      error: "Unable to unhide post. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
}
