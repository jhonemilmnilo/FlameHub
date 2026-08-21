"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

/**
 * 🔒 Toggle Like/Unlike on a Post (Atomic Transaction)
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

    // 2. Check if the like already exists (Enforced by @unique([userId, postId]))
    const existingLike = await prisma.likedPost.findUnique({
      where: {
        userId_postId: {
          userId: authUser.id,
          postId: postId,
        },
      },
    });

    // 3. Atomic Toggle Operation
    if (existingLike) {
      // UNLIKE: Delete LikedPost and decrement counter safely
      const [, updatedPost] = await prisma.$transaction([
        prisma.likedPost.delete({
          where: { id: existingLike.id },
        }),
        prisma.post.update({
          where: { id: postId },
          data: {
            likesCount: {
              decrement: 1,
            },
          },
          select: {
            likesCount: true,
          },
        }),
      ]);

      return {
        success: true,
        data: {
          isLiked: false,
          likesCount: Math.max(0, updatedPost.likesCount),
        },
      };
    } else {
      // LIKE: Insert LikedPost (guaranteed once by composite unique key) and increment counter
      const [, updatedPost] = await prisma.$transaction([
        prisma.likedPost.create({
          data: {
            userId: authUser.id,
            postId: postId,
          },
        }),
        prisma.post.update({
          where: { id: postId },
          data: {
            likesCount: {
              increment: 1,
            },
          },
          select: {
            likesCount: true,
          },
        }),
      ]);

      return {
        success: true,
        data: {
          isLiked: true,
          likesCount: updatedPost.likesCount,
        },
      };
    }
  } catch {
    return {
      success: false,
      error: "Failed to update like status.",
      code: "INTERNAL_ERROR",
    };
  }
}
