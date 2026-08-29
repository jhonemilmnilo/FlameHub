"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const CreateCommentSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment cannot exceed 1,000 characters"),
  isAnonymous: z.boolean().optional().default(false),
});

export type CommentFeedItem = {
  id: string;
  postId: string;
  authorId?: string | null;
  authorName: string;
  authorNickname?: string | null;
  authorAvatarUrl?: string | null;
  department: string;
  studentId: string;
  content: string;
  isAnonymous: boolean;
  likesCount: number;
  commentCounts?: number;
  createdAt: string;
  isAuthor: boolean;
};

type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

/**
 * 🔒 Create Comment (Atomic Transaction with zero-leak anonymity)
 */
export async function createCommentAction(
  rawInput: unknown
): Promise<ActionResult<CommentFeedItem>> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return {
        success: false,
        error: "You must be logged in to comment.",
        code: "UNAUTHORIZED",
      };
    }

    const parsed = CreateCommentSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid comment.",
        code: "VALIDATION_ERROR",
      };
    }

    const { postId, content, isAnonymous } = parsed.data;

    // 1. Ensure user record exists
    let userRecord = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    const meta = authUser.user_metadata || {};
    if (!userRecord) {
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

    // 2. Perform atomic comment creation + post commentCount increment
    const [newComment] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          userId: userRecord.id,
          postId,
          content,
          isAnonymous: Boolean(isAnonymous),
          likesCount: 0,
        },
        include: {
          user: {
            select: {
              displayName: true,
              nickname: true,
              avatarUrl: true,
              studentId: true,
              department: true,
            },
          },
        },
      }),
      prisma.post.update({
        where: { id: postId },
        data: {
          commentsCount: {
            increment: 1,
          },
        },
      }),
    ]);

    revalidatePath("/");

    const authorDisplayName = userRecord.displayName || "Student";
    const authorNickname = userRecord.nickname || null;
    const authorAvatarUrl = userRecord.avatarUrl || null;
    const isAnon = newComment.isAnonymous;

    return {
      success: true,
      data: {
        id: newComment.id,
        postId: newComment.postId,
        authorId: userRecord.id,
        authorName: isAnon ? `${authorDisplayName} (Anonymous)` : authorDisplayName,
        authorNickname: authorNickname,
        authorAvatarUrl: authorAvatarUrl,
        department: isAnon ? "Flame" : (userRecord.department || "CITE"),
        studentId: isAnon ? "Hidden ID" : (userRecord.studentId || "00-0000-000000"),
        content: newComment.content,
        isAnonymous: isAnon,
        likesCount: newComment.likesCount,
        createdAt: newComment.createdAt.toISOString(),
        isAuthor: true,
      },
    };
  } catch {
    return {
      success: false,
      error: "Unable to post comment. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * 🔒 Get Comments for a Post
 */
export async function getPostCommentsAction(
  postId: string
): Promise<ActionResult<CommentFeedItem[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const currentUserId = authUser?.id || null;

    const rawComments = await prisma.comment.findMany({
      where: {
        postId,
        isDeleted: false,
      },
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
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const sanitizedComments: CommentFeedItem[] = rawComments.map((c) => {
      const isAnon = c.isAnonymous;
      const isAuthor = currentUserId === c.userId;
      const canViewIdentity = !isAnon || isAuthor;

      return {
        id: c.id,
        postId: c.postId,
        authorId: isAnon && !isAuthor ? null : c.userId,
        authorName: isAnon ? (isAuthor ? `${c.user?.displayName || "You"} (Anonymous)` : "Anonymous") : c.user?.displayName || "Student",
        authorNickname: canViewIdentity ? c.user?.nickname : null,
        authorAvatarUrl: canViewIdentity ? c.user?.avatarUrl : null,
        department: isAnon && !isAuthor ? "Flame" : (c.user?.department || "CITE"),
        studentId: isAnon && !isAuthor ? "Hidden ID" : (c.user?.studentId || "00-0000-000000"),
        content: c.content,
        isAnonymous: isAnon,
        likesCount: c.likesCount,
        createdAt: c.createdAt.toISOString(),
        isAuthor,
      };
    });

    return {
      success: true,
      data: sanitizedComments,
    };
  } catch {
    return {
      success: false,
      error: "Failed to load comments.",
      code: "INTERNAL_ERROR",
    };
  }
}
