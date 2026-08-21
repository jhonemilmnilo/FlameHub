"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

/**
 * 🔒 Toggle Like/Unlike on a Post (Atomic Transaction with Exact Relational Count Synchronization)
 */
export async function toggleLikePostAction(
  postId: string
): Promise<ActionResult<{ isLiked: boolean; likesCount: number }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return {
        success: false,
        error: "You must be logged in to like posts.",
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

    // 2. Check if post exists and is not deleted
    const targetPost = await prisma.post.findFirst({
      where: { id: postId, isDeleted: false },
    });

    if (!targetPost) {
      return {
        success: false,
        error: "Post not found or has been deleted.",
        code: "NOT_FOUND",
      };
    }

    // 3. Check existing like status
    const existingLike = await prisma.likedPost.findUnique({
      where: {
        userId_postId: {
          userId: authUser.id,
          postId: postId,
        },
      },
    });

    let nextIsLiked = false;

    // 4. Atomic Transaction: Perform Insert/Delete AND Sync exact COUNT(*)
    const actualLikesCount = await prisma.$transaction(async (tx) => {
      if (existingLike) {
        // UNLIKE: Remove the row
        await tx.likedPost.delete({
          where: { id: existingLike.id },
        });
        nextIsLiked = false;
      } else {
        // LIKE: Insert row (enforces unique composite constraint)
        await tx.likedPost.create({
          data: {
            userId: authUser.id,
            postId: postId,
          },
        });
        nextIsLiked = true;
      }

      // 🛡️ EXACT RELATIONAL COUNT: Count real remaining rows in LikedPosts
      const realCount = await tx.likedPost.count({
        where: { postId: postId },
      });

      // Update the cached counter to match reality 100%
      await tx.post.update({
        where: { id: postId },
        data: {
          likesCount: realCount,
        },
      });

      return realCount;
    });

    return {
      success: true,
      data: {
        isLiked: nextIsLiked,
        likesCount: actualLikesCount,
      },
    };
  } catch {
    return {
      success: false,
      error: "Failed to update like status.",
      code: "INTERNAL_ERROR",
    };
  }
}
