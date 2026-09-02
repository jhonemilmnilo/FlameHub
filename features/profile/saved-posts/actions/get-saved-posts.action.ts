"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { type PostFeedItem } from "@/features/feed/actions/post.action";
import { type GetSavedPostsParams, type GetSavedPostsResult } from "../utils/saved-posts.types";

type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

/**
 * 🔒 Fetch Paginated Saved/Bookmarked Posts for Current Authenticated User
 * Business Rules & Security Directives:
 * 1. Zero-Trust Authenticated Session Check.
 * 2. Join SavedPost -> Post -> Author & Department.
 * 3. Filter out deleted posts and posts hidden by the user.
 * 4. Maintain isSaved: true flag across all returned items.
 */
export async function getSavedPostsAction(
  params?: GetSavedPostsParams
): Promise<ActionResult<GetSavedPostsResult>> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return {
        success: false,
        error: "You must be logged in to view saved posts.",
        code: "UNAUTHORIZED",
      };
    }

    const limit = Math.min(Math.max(params?.limit || 20, 1), 50);
    const cursor = params?.cursor;

    // 1. Fetch saved posts records (Include all saved posts for user even if hidden from main feed)
    const savedRecords = await prisma.savedPost.findMany({
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
      orderBy: { savedAt: "desc" },
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
              select: { id: true },
            },
          },
        },
      },
    });

    const hasMore = savedRecords.length > limit;
    const items = hasMore ? savedRecords.slice(0, limit) : savedRecords;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Map records to PostFeedItem
    const posts: PostFeedItem[] = items.map((rec) => {
      const p = rec.post;
      const isAuthor = p.userId === authUser.id;
      const isAnonymousPost = p.isAnonymous && !isAuthor;

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
        isSaved: true, // It is in the saved list, guaranteed true
        isEdited: p.isEdited,
        isAuthor,
        isAnonymous: p.isAnonymous,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
        repostedAt: p.repostedAt ? p.repostedAt.toISOString() : null,
        savedAt: rec.savedAt ? rec.savedAt.toISOString() : null,
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
      error: "Unable to load saved posts. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
}
