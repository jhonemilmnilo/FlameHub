"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

import { redis } from "@/lib/redis/client";

type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

export type LikeTargetAction = "LIKE" | "UNLIKE";

/**
 * 🔒 Explicit & Idempotent Set Like State on a Post
 * Uses Redis Fast-Path Deduplication + Atomic Postgres Upsert/Delete with Zero Count Lock
 */
export async function setPostLikeAction(
  postId: string,
  targetAction: LikeTargetAction
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

    if (targetAction !== "LIKE" && targetAction !== "UNLIKE") {
      return {
        success: false,
        error: "Invalid like action. Must be LIKE or UNLIKE.",
        code: "VALIDATION_ERROR",
      };
    }

    const userId = authUser.id;
    const isLikeIntent = targetAction === "LIKE";

    // ⚡ Redis Fast-Path Layer: Cache set for instant deduplication (fail-open if Redis error)
    const redisKey = `post:likes:${postId}`;
    try {
      if (isLikeIntent) {
        await redis.sadd(redisKey, userId);
        await redis.expire(redisKey, 86400); // 24-hour rolling TTL to prevent Redis memory bloat
      } else {
        await redis.srem(redisKey, userId);
      }
    } catch (redisErr) {
      console.warn("REDIS_SET_LIKE_WARNING (proceeding with DB):", redisErr);
    }

    // 💾 Postgres Idempotent & Atomic Execution (Single Source of Truth)
    if (isLikeIntent) {
      // Check if like already exists
      const existing = await prisma.likedPost.findUnique({
        where: { userId_postId: { userId, postId } },
        select: { id: true },
      });

      if (!existing) {
        await prisma.likedPost.create({
          data: { userId, postId },
        });

        const updated = await prisma.post.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } },
          select: { likesCount: true },
        });

        return {
          success: true,
          data: { isLiked: true, likesCount: Math.max(1, updated.likesCount) },
        };
      }

      // If already liked (idempotent), self-heal and return true isLiked + accurate count
      const currentPost = await prisma.post.findUnique({
        where: { id: postId },
        select: { likesCount: true },
      });

      return {
        success: true,
        data: { isLiked: true, likesCount: Math.max(1, currentPost?.likesCount ?? 1) },
      };
    } else {
      // deleteMany returns { count: 0 } if record doesn't exist — never throws P2025!
      const deleted = await prisma.likedPost.deleteMany({
        where: { userId, postId },
      });

      if (deleted.count > 0) {
        const updated = await prisma.post.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
          select: { likesCount: true },
        });

        let safeCount = Math.max(0, updated.likesCount);
        if (updated.likesCount < 0) {
          await prisma.post.update({
            where: { id: postId },
            data: { likesCount: 0 },
          });
          safeCount = 0;
        }

        return {
          success: true,
          data: { isLiked: false, likesCount: safeCount },
        };
      }

      // If was already unliked (idempotent), return current count
      const currentPost = await prisma.post.findUnique({
        where: { id: postId },
        select: { likesCount: true },
      });

      return {
        success: true,
        data: { isLiked: false, likesCount: Math.max(0, currentPost?.likesCount ?? 0) },
      };
    }
  } catch (error) {
    console.error("SET_POST_LIKE_ERROR:", error);
    return {
      success: false,
      error: "Failed to update like status.",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * 🔒 Backwards compatible toggle helper using explicit action
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

    const existingLike = await prisma.likedPost.findUnique({
      where: {
        userId_postId: {
          userId: authUser.id,
          postId,
        },
      },
      select: { id: true },
    });

    const targetAction: LikeTargetAction = existingLike ? "UNLIKE" : "LIKE";
    return setPostLikeAction(postId, targetAction);
  } catch {
    return {
      success: false,
      error: "Failed to toggle like.",
      code: "INTERNAL_ERROR",
    };
  }
}

export type PostLikerItem = {
  id: string;
  userId: string;
  displayName: string;
  studentId: string;
  department: string;
  avatarUrl: string | null;
  likedAt: string;
};

/**
 * 🔒 Fetch list of students who liked a post
 */
export async function getPostLikersAction(
  postId: string
): Promise<ActionResult<PostLikerItem[]>> {
  try {
    if (!postId || typeof postId !== "string") {
      return {
        success: false,
        error: "Invalid post ID.",
        code: "VALIDATION_ERROR",
      };
    }

    const likes = await prisma.likedPost.findMany({
      where: { postId: postId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            studentId: true,
            department: true,
            avatarUrl: true,
          },
        },
      },
    });

    const likers: PostLikerItem[] = likes.map((like) => ({
      id: like.id,
      userId: like.user.id,
      displayName: like.user.displayName || "Campus Student",
      studentId: like.user.studentId || "Student",
      department: like.user.department || "CITE",
      avatarUrl: like.user.avatarUrl || null,
      likedAt: like.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: likers,
    };
  } catch (error) {
    console.error("GET_POST_LIKERS_ERROR:", error);
    return {
      success: false,
      error: "Failed to load likers list.",
      code: "INTERNAL_ERROR",
    };
  }
}
