"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

/**
 * 🔒 Toggle Save/Bookmark on a Post
 * Business Rules & Security Directives:
 * 1. Authenticated session required (Zero-trust server check).
 * 2. Self-Save Prohibition: A user cannot save/bookmark their own post.
 * 3. Atomic toggle: If saved -> remove bookmark. If not saved -> create bookmark.
 * 4. Composite unique constraint `@@unique([userId, postId])` prevents duplicate saves.
 */
export async function toggleSavePostAction(
  postId: string
): Promise<ActionResult<{ isSaved: boolean }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return {
        success: false,
        error: "You must be logged in to save posts.",
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

    // 🔒 3. Self-Save Prohibition: A user cannot save their own post
    if (targetPost.userId === authUser.id) {
      return {
        success: false,
        error: "You cannot save your own post.",
        code: "FORBIDDEN",
      };
    }

    // 4. Check existing saved record
    const existingSave = await prisma.savedPost.findUnique({
      where: {
        userId_postId: {
          userId: authUser.id,
          postId: postId,
        },
      },
    });

    if (existingSave) {
      // UNSAVE: Remove from bookmarks
      await prisma.savedPost.delete({
        where: { id: existingSave.id },
      });

      return {
        success: true,
        data: { isSaved: false },
      };
    } else {
      // SAVE: Add to bookmarks
      await prisma.savedPost.create({
        data: {
          userId: authUser.id,
          postId: postId,
        },
      });

      return {
        success: true,
        data: { isSaved: true },
      };
    }
  } catch {
    return {
      success: false,
      error: "Unable to update bookmark. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
}
