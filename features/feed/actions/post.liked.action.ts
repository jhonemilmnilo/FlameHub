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

    // 1. Check if the like already exists
    const existingLike = await prisma.likedPost.findUnique({
      where: {
        userId_postId: {
          userId: authUser.id,
          postId: postId,
        },
      },
    });

    // 2. Atomic Toggle Operation
    if (existingLike) {
      // UNLIKE: Delete LikedPost and decrement counter
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
      // LIKE: Insert LikedPost and increment counter
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
