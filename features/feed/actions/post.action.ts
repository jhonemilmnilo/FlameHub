"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const CreatePostSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Post content cannot be empty")
    .max(2000, "Post content cannot exceed 2,000 characters"),
  isAnonymous: z.boolean().optional().default(false),
});

export type PostFeedItem = {
  id: string;
  authorId?: string | null;
  authorName: string;
  authorNickname?: string | null;
  authorAvatarUrl?: string | null;
  department: string;
  studentId: string;
  content: string;
  isAnonymous: boolean;
  isEdited: boolean;
  likesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  commentsCount: number;
  createdAt: string;
  updatedAt?: string | null;
  repostedAt?: string | null;
  savedAt?: string | null;
  isAuthor: boolean;
};

type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

export type PaginatedFeedResult = {
  posts: PostFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

const EditPostSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  content: z
    .string()
    .trim()
    .min(1, "Post content cannot be empty")
    .max(2000, "Post content cannot exceed 2,000 characters"),
  isAnonymous: z.boolean().optional(),
});

/**
 * 🔒 Fetch paginated real posts from PostgreSQL via Prisma (Facebook-Style Cursor Stream)
 */
export async function getFeedPostsAction(options?: {
  cursor?: string;
  limit?: number;
}): Promise<PaginatedFeedResult> {
  const limit = options?.limit ?? 30;
  const cursor = options?.cursor;

  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const currentUserId = authUser?.id || null;

    // Build cursor condition
    const whereClause: Record<string, unknown> = {
      isDeleted: false,
      ...(currentUserId
        ? {
            hiddenPosts: {
              none: {
                userId: currentUserId,
              },
            },
          }
        : {}),
    };

    const rawPosts = await prisma.post.findMany({
      where: whereClause,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            nickname: true,
            avatarUrl: true,
            studentId: true,
            department: true,
          },
        },
        department: {
          select: {
            code: true,
          },
        },
        likedPosts: currentUserId
          ? {
              where: {
                userId: currentUserId,
              },
              select: {
                id: true,
              },
            }
          : undefined,
        savedPosts: currentUserId
          ? {
              where: {
                userId: currentUserId,
              },
              select: {
                id: true,
                savedAt: true,
              },
            }
          : undefined,
      },
      // Order initially by active repost activity then creation date with ID tiebreaker
      orderBy: [
        { repostedAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
        { id: "desc" },
      ],
    });

    // ⚡ Sort posts by Unified Effective Activity Timestamp: max(createdAt, repostedAt) with deterministic ID tiebreaker
    const sortedPosts = [...rawPosts].sort((a, b) => {
      const timeA = Math.max(a.createdAt.getTime(), a.repostedAt ? a.repostedAt.getTime() : 0);
      const timeB = Math.max(b.createdAt.getTime(), b.repostedAt ? b.repostedAt.getTime() : 0);
      if (timeB !== timeA) return timeB - timeA;
      return b.id.localeCompare(a.id);
    });

    const hasMore = sortedPosts.length > limit;
    const postsToReturn = hasMore ? sortedPosts.slice(0, limit) : sortedPosts;
    const nextCursor = hasMore && postsToReturn.length > 0 ? postsToReturn[postsToReturn.length - 1].id : null;

    const formattedPosts: PostFeedItem[] = postsToReturn.map((p) => {
      const isAnon = p.isAnonymous;
      const isLiked = currentUserId ? Array.isArray(p.likedPosts) && p.likedPosts.length > 0 : false;
      const savedRecord = currentUserId && Array.isArray(p.savedPosts) && p.savedPosts.length > 0 ? p.savedPosts[0] : null;
      const isSaved = Boolean(savedRecord);
      const isAuthor = currentUserId === p.userId;

      // 🛡️ Privacy Guard: If anonymous, ONLY author sees their own avatar & info. Others see Anonymous Ghost state.
      const canViewIdentity = !isAnon || isAuthor;

      return {
        id: p.id,
        authorId: isAnon && !isAuthor ? null : p.userId,
        authorName: isAnon ? (isAuthor ? `${p.user?.displayName || "You"} (Anonymous)` : "Anonymous") : p.user?.displayName || "Campus Student",
        authorNickname: canViewIdentity ? p.user?.nickname : null,
        authorAvatarUrl: canViewIdentity ? p.user?.avatarUrl : null,
        department: isAnon && !isAuthor ? "Flame" : (p.department?.code || p.user?.department || "CITE"),
        studentId: isAnon && !isAuthor ? "Hidden ID" : p.user?.studentId || "00-0000-000000",
        content: p.content,
        isAnonymous: isAnon,
        isEdited: p.isEdited ?? false,
        likesCount: p.likesCount,
        isLiked: isLiked,
        isSaved: isSaved,
        savedAt: savedRecord?.savedAt ? savedRecord.savedAt.toISOString() : null,
        commentsCount: p.commentsCount,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
        repostedAt: p.repostedAt ? p.repostedAt.toISOString() : null,
        isAuthor,
      };
    });

    return {
      posts: formattedPosts,
      nextCursor,
      hasMore,
    };
  } catch {
    return {
      posts: [],
      nextCursor: null,
      hasMore: false,
    };
  }
}

/**
 * 🔒 Create real post attached to authenticated user and their department
 */
export async function createPostAction(rawInput: unknown): Promise<ActionResult<PostFeedItem>> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return {
        success: false,
        error: "You must be logged in to create a post.",
        code: "UNAUTHORIZED",
      };
    }

    const parsed = CreatePostSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid post content.",
        code: "VALIDATION_ERROR",
      };
    }

    // 1. Find or ensure User record in DB
    let userRecord = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    const meta = authUser.user_metadata || {};
    const metaDept = meta.department || "CITE";

    if (!userRecord) {
      const firstName = meta.first_name || "";
      const lastName = meta.last_name || "";
      const displayName = meta.display_name || `${firstName} ${lastName}`.trim() || "Student";
      const studentId = meta.student_id || "00-0000-000000";

      userRecord = await prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email,
          displayName,
          firstName,
          lastName,
          studentId,
          department: metaDept,
          isEmailVerified: true,
        },
      });
    }

    // 2. Resolve DepartmentType record by department code (e.g. CITE, CEA)
    const userDeptCode = userRecord.department || metaDept || "CITE";
    let deptRecord = await prisma.departmentType.findUnique({
      where: { code: userDeptCode },
    });

    // Auto-seed DepartmentType if not yet existing
    if (!deptRecord) {
      try {
        deptRecord = await prisma.departmentType.create({
          data: {
            code: userDeptCode,
            name: userDeptCode,
          },
        });
      } catch {
        // If conflict occurs during race condition, find it again
        deptRecord = await prisma.departmentType.findUnique({
          where: { code: userDeptCode },
        });
      }
    }

    // 3. Create the Post with isAnonymous and linked departmentId
    const newPost = await prisma.post.create({
      data: {
        userId: userRecord.id,
        departmentId: deptRecord?.id || null,
        content: parsed.data.content,
        isAnonymous: parsed.data.isAnonymous,
        likesCount: 0,
        commentsCount: 0,
      },
      include: {
        user: true,
        department: true,
      },
    });

    revalidatePath("/");

    const isAnon = newPost.isAnonymous;
    const authorDisplayName = userRecord.displayName || "Campus Student";

    return {
      success: true,
      data: {
        id: newPost.id,
        authorId: userRecord.id,
        authorName: isAnon ? `${authorDisplayName} (Anonymous)` : authorDisplayName,
        authorNickname: userRecord.nickname || null,
        authorAvatarUrl: userRecord.avatarUrl || null,
        department: deptRecord?.code || userDeptCode,
        studentId: userRecord.studentId || "00-0000-000000",
        content: newPost.content,
        isAnonymous: isAnon,
        isEdited: false,
        likesCount: newPost.likesCount,
        isLiked: false,
        isSaved: false,
        commentsCount: newPost.commentsCount,
        createdAt: newPost.createdAt.toISOString(),
        updatedAt: newPost.updatedAt.toISOString(),
        repostedAt: null,
        isAuthor: true,
      },
    };
  } catch {
    return {
      success: false,
      error: "Failed to publish post. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * 🔒 Edit Post Action with strict IDOR verification & 1-Time Edit Maximum Rule
 */
export async function editPostAction(rawInput: unknown): Promise<ActionResult<PostFeedItem>> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return {
        success: false,
        error: "You must be logged in to edit a post.",
        code: "UNAUTHORIZED",
      };
    }

    const parsed = EditPostSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid post data.",
        code: "VALIDATION_ERROR",
      };
    }

    const { postId, content, isAnonymous } = parsed.data;

    // 1. Confirm post exists and belongs to this user
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      return {
        success: false,
        error: "Post not found.",
        code: "NOT_FOUND",
      };
    }

    if (existingPost.userId !== authUser.id) {
      return {
        success: false,
        error: "Forbidden: You are not authorized to edit this post.",
        code: "FORBIDDEN",
      };
    }

    // 🔒 1-Time Edit Anti-Spam Guard
    if (existingPost.isEdited) {
      return {
        success: false,
        error: "This post has already been edited and can no longer be modified.",
        code: "EDIT_LIMIT_REACHED",
      };
    }

    // 2. Perform atomic update setting isEdited to true
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        content,
        isEdited: true,
        ...(isAnonymous !== undefined ? { isAnonymous } : {}),
      },
      include: {
        user: true,
        department: true,
        likedPosts: {
          where: {
            userId: authUser.id,
          },
          select: {
            id: true,
          },
        },
        savedPosts: {
          where: {
            userId: authUser.id,
          },
          select: {
            id: true,
          },
        },
      },
    });

    revalidatePath("/");

    const isAnon = updatedPost.isAnonymous;
    const isLiked = Array.isArray(updatedPost.likedPosts) && updatedPost.likedPosts.length > 0;
    const isSaved = Array.isArray(updatedPost.savedPosts) && updatedPost.savedPosts.length > 0;
    const authorDisplayName = updatedPost.user?.displayName || "Campus Student";

    return {
      success: true,
      data: {
        id: updatedPost.id,
        authorId: authUser.id,
        authorName: isAnon ? `${authorDisplayName} (Anonymous)` : authorDisplayName,
        authorNickname: updatedPost.user?.nickname || null,
        authorAvatarUrl: updatedPost.user?.avatarUrl || null,
        department: updatedPost.department?.code || updatedPost.user?.department || "CITE",
        studentId: updatedPost.user?.studentId || "00-0000-000000",
        content: updatedPost.content,
        isAnonymous: isAnon,
        isEdited: true,
        likesCount: updatedPost.likesCount,
        isLiked,
        isSaved,
        commentsCount: updatedPost.commentsCount,
        createdAt: updatedPost.createdAt.toISOString(),
        updatedAt: updatedPost.updatedAt.toISOString(),
        repostedAt: updatedPost.repostedAt ? updatedPost.repostedAt.toISOString() : null,
        isAuthor: true,
      },
    };
  } catch {
    return {
      success: false,
      error: "Unable to update post. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * 🔒 Hard Delete Post Action with strict IDOR verification & Cascading Cleanup
 */
export async function deletePostAction(postId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return {
        success: false,
        error: "You must be logged in to delete a post.",
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

    // 1. Fetch post to confirm existence
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return {
        success: false,
        error: "Post not found or already deleted.",
        code: "NOT_FOUND",
      };
    }

    // 🔒 2. Multi-Tier IDOR Protection: Strictly verify author ownership
    if (post.userId !== authUser.id) {
      return {
        success: false,
        error: "Forbidden: You are not authorized to delete this post.",
        code: "FORBIDDEN",
      };
    }

    // 🔒 3. Atomic Scoped Deletion: Deletes ONLY if ID matches AND Author ID matches authenticated session
    const deleteResult = await prisma.post.deleteMany({
      where: {
        id: postId,
        userId: authUser.id,
      },
    });

    if (deleteResult.count === 0) {
      return {
        success: false,
        error: "Forbidden: Unable to delete post. Permission denied.",
        code: "FORBIDDEN",
      };
    }

    revalidatePath("/");

    return {
      success: true,
      data: { id: postId },
    };
  } catch {
    return {
      success: false,
      error: "Failed to delete post. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * 🔁 Repost / Bump Own Post to Feed (Strict 24-Hour Cooldown Limit)
 */
export async function repostPostAction(postId: string): Promise<ActionResult<{ repostedAt: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return {
        success: false,
        error: "Unauthorized: Please log in to repost your post.",
        code: "UNAUTHORIZED",
      };
    }

    // 1. Fetch post to verify ownership & previous repost timestamp
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        userId: true,
        repostedAt: true,
        createdAt: true,
        isDeleted: true,
      },
    });

    if (!post || post.isDeleted) {
      return {
        success: false,
        error: "Post not found or deleted.",
        code: "NOT_FOUND",
      };
    }

    // 🔒 2. Authorization: Only author can repost their own post
    if (post.userId !== authUser.id) {
      return {
        success: false,
        error: "You can only repost your own post.",
        code: "FORBIDDEN",
      };
    }

    // 🔒 3. 24-Hour Cooldown Validation
    const now = new Date();
    const isFirstTimeRepost = !post.repostedAt;
    const lastTimestamp = post.repostedAt || post.createdAt;
    const diffInMs = now.getTime() - lastTimestamp.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 24) {
      const remainingHours = Math.ceil(24 - diffInHours);
      const errorMessage = isFirstTimeRepost
        ? "This post was recently published. You can repost it after 24 hours."
        : `This post was recently bumped. You can repost it again in ${remainingHours}h.`;

      return {
        success: false,
        error: errorMessage,
        code: "COOLDOWN_ACTIVE",
      };
    }

    // 4. Update repostedAt timestamp to bump to top of feed
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        repostedAt: now,
      },
      select: {
        repostedAt: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/profile");

    return {
      success: true,
      data: {
        repostedAt: updatedPost.repostedAt ? updatedPost.repostedAt.toISOString() : now.toISOString(),
      },
    };
  } catch (error) {
    console.error("REPOST_POST_ERROR:", error);
    return {
      success: false,
      error: "Unable to repost. Please try again later.",
      code: "INTERNAL_ERROR",
    };
  }
}

