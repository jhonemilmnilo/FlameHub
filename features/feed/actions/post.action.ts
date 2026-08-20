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
  authorName: string;
  department: string;
  studentId: string;
  content: string;
  isAnonymous: boolean;
  likesCount: number;
  isLiked: boolean;
  commentsCount: number;
  createdAt: string;
};

type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

export type PaginatedFeedResult = {
  posts: PostFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

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
    };

    const rawPosts = await prisma.post.findMany({
      where: whereClause,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      include: {
        user: {
          select: {
            displayName: true,
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const hasMore = rawPosts.length > limit;
    const postsToReturn = hasMore ? rawPosts.slice(0, limit) : rawPosts;
    const nextCursor = hasMore && postsToReturn.length > 0 ? postsToReturn[postsToReturn.length - 1].id : null;

    const formattedPosts: PostFeedItem[] = postsToReturn.map((p) => {
      const isAnon = p.isAnonymous;
      const isLiked = currentUserId ? Array.isArray(p.likedPosts) && p.likedPosts.length > 0 : false;

      return {
        id: p.id,
        authorName: isAnon ? "Anonymous Flame" : p.user?.displayName || "Campus Student",
        department: p.department?.code || p.user?.department || "CITE",
        studentId: isAnon ? "Hidden ID" : p.user?.studentId || "00-0000-000000",
        content: p.content,
        isAnonymous: isAnon,
        likesCount: p.likesCount,
        isLiked: isLiked,
        commentsCount: p.commentsCount,
        createdAt: p.createdAt.toISOString(),
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

    return {
      success: true,
      data: {
        id: newPost.id,
        authorName: isAnon ? "Anonymous Flame" : userRecord.displayName,
        department: deptRecord?.code || userDeptCode,
        studentId: isAnon ? "Hidden ID" : userRecord.studentId || "00-0000-000000",
        content: newPost.content,
        isAnonymous: isAnon,
        likesCount: newPost.likesCount,
        isLiked: false,
        commentsCount: newPost.commentsCount,
        createdAt: newPost.createdAt.toISOString(),
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
