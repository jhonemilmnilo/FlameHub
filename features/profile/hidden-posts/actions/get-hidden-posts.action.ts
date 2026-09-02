"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { type PostFeedItem } from "@/features/feed/actions/post.action";
import { type GetHiddenPostsParams, type GetHiddenPostsResult } from "../utils/hidden-posts.types";

type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

/**
 * 🔒 Fetch Paginated Hidden Posts for Current Authenticated User
 * Business Rules & Security Directives:
 * 1. Zero-Trust Authenticated Session Check.
 * 2. Query HiddenPost -> Post -> Author & Department.
 * 3. Filter out soft-deleted posts.
 * 4. Order by hiddenAt DESC (Most recently hidden first).
 */
export async function getHiddenPostsAction(
  params?: GetHiddenPostsParams
): Promise<ActionResult<GetHiddenPostsResult>> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return {
        success: false,
        error: "You must be logged in to view hidden posts.",
        code: "UNAUTHORIZED",
      };
    }

    const limit = Math.min(Math.max(params?.limit || 20, 1), 50);
    const cursor = params?.cursor;

    // 1. Fetch hidden posts records
    const hiddenRecords = await prisma.hiddenPost.findMany({
      where: {
        userId: authUser.id,
        post: {
          isDeleted: false,
        },
      },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      orderBy: { hiddenAt: "desc" },
      include: {
        post: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                firstName: true,
                lastName: true,
                studentId: true,
                department: true,
                avatarUrl: true,
                nickname: true,
              },
            },
            department: {
              select: {
                code: true,
                name: true,
              },
            },
            likedPosts: {
              where: { userId: authUser.id },
              select: { id: true },
            },
            savedPosts: {
              where: { userId: authUser.id },
              select: { id: true, savedAt: true },
            },
          },
        },
      },
    });

    const hasMore = hiddenRecords.length > limit;
    const items = hasMore ? hiddenRecords.slice(0, limit) : hiddenRecords;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Map records to PostFeedItem
    const posts: PostFeedItem[] = items.map((rec) => {
      const p = rec.post;
      const isAuthor = p.userId === authUser.id;
      const isAnonymousPost = p.isAnonymous && !isAuthor;
      const savedRecord = p.savedPosts.length > 0 ? p.savedPosts[0] : null;

      return {
        id: p.id,
        authorId: isAnonymousPost ? null : p.user.id,
        authorName: isAnonymousPost ? "Flame" : p.user.displayName,
        authorNickname: isAnonymousPost ? null : p.user.nickname,
        authorAvatarUrl: isAnonymousPost ? null : p.user.avatarUrl,
        studentId: isAnonymousPost ? "Anonymous" : p.user.studentId || "00-0000-000000",
        department: isAnonymousPost
          ? "Campus Secret"
          : p.department?.code || p.user.department || "CITE",
        content: p.content,
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        isLiked: p.likedPosts.length > 0,
        isSaved: Boolean(savedRecord),
        isEdited: p.isEdited,
        isAuthor,
        isAnonymous: p.isAnonymous,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
        repostedAt: p.repostedAt ? p.repostedAt.toISOString() : null,
        savedAt: savedRecord?.savedAt ? savedRecord.savedAt.toISOString() : null,
        hiddenAt: rec.hiddenAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        posts,
        nextCursor,
        hasMore,
      },
    };
  } catch {
    return {
      success: false,
      error: "Unable to load hidden posts. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
}
