"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  type PostFeedItem,
  type PaginatedFeedResult,
} from "@/features/feed/actions/post.action";

export type UserProfileData = {
  id: string;
  email: string | null;
  nickname: string | null;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  studentId: string | null;
  department: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  stats: {
    postsCount: number;
    followersCount: number;
    followingCount: number;
  };
  isSelf: boolean;
};

export type FollowerItem = {
  id: string;
  displayName: string;
  studentId: string | null;
  department: string | null;
  avatarUrl: string | null;
};

type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

/**
 * 🔒 Fetch User Profile data securely from database with Supabase user sync fallback
 */
export async function getUserProfileAction(targetUserId?: string): Promise<ActionResult<UserProfileData>> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const userId = targetUserId || authUser.id;
    const isSelf = authUser.id === userId;

    let dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            posts: {
              where: { isDeleted: false },
            },
          },
        },
      },
    });

    // Auto-upsert profile for current user if missing in Postgres table
    if (!dbUser && isSelf) {
      const meta = authUser.user_metadata || {};
      const firstName = meta.first_name || null;
      const lastName = meta.last_name || null;
      const displayName =
        meta.display_name || `${firstName || ""} ${lastName || ""}`.trim() || authUser.email?.split("@")[0] || "Student";
      const studentId = meta.student_id || null;
      const department = meta.department || "CITE";

      dbUser = await prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email,
          displayName,
          firstName,
          lastName,
          studentId,
          department,
          bio: meta.bio || "Student at PHINMA Education. Passionate about technology, learning, and campus community discussions.",
          avatarUrl: meta.avatar_url || null,
        },
        include: {
          _count: {
            select: {
              posts: {
                where: { isDeleted: false },
              },
            },
          },
        },
      });
    }

    if (!dbUser) {
      return { success: false, error: "User profile not found." };
    }

    // Default stats
    const postsCount = dbUser._count?.posts ?? 0;
    const followersCount = 27;
    const followingCount = 20;

    return {
      success: true,
      data: {
        id: dbUser.id,
        email: dbUser.email,
        nickname: dbUser.nickname,
        displayName: dbUser.displayName || `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim() || "FlameHub User",
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        studentId: dbUser.studentId,
        department: dbUser.department || "CITE",
        bio:
          dbUser.bio ||
          "Student at PHINMA Education. Passionate about learning, campus community, and tech discussions.",
        avatarUrl: dbUser.avatarUrl,
        createdAt: dbUser.createdAt.toISOString(),
        stats: {
          postsCount,
          followersCount,
          followingCount,
        },
        isSelf,
      },
    };
  } catch (error) {
    console.error("GET_USER_PROFILE_ERROR:", error);
    return { success: false, error: "Failed to load user profile." };
  }
}

/**
 * 🔒 Fetch User Posts / Activity
 */
export async function getUserPostsAction(options?: {
  targetUserId?: string;
  cursor?: string;
  limit?: number;
}): Promise<ActionResult<PaginatedFeedResult>> {
  const limit = options?.limit ?? 12;
  const cursor = options?.cursor;

  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const currentUserId = authUser?.id || null;
    const userId = options?.targetUserId || currentUserId;

    if (!userId) {
      return { success: false, error: "User ID is required." };
    }

    const rawPosts = await prisma.post.findMany({
      where: {
        userId: userId,
        isDeleted: false,
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [
        {
          repostedAt: { sort: "desc", nulls: "last" },
        },
        {
          createdAt: "desc",
        },
      ],
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
          : false,
        savedPosts: currentUserId
          ? {
              where: {
                userId: currentUserId,
              },
              select: {
                id: true,
              },
            }
          : false,
      },
    });

    const hasMore = rawPosts.length > limit;
    const postsToReturn = hasMore ? rawPosts.slice(0, limit) : rawPosts;
    const nextCursor = hasMore && postsToReturn.length > 0 ? postsToReturn[postsToReturn.length - 1].id : null;

    const posts: PostFeedItem[] = postsToReturn.map((p) => {
      const isPostAuthor = currentUserId === p.userId;
      const displayAuthorName = p.isAnonymous && !isPostAuthor ? "Anonymous" : p.user.displayName;
      const displayStudentId = p.isAnonymous && !isPostAuthor ? "Hidden ID" : p.user.studentId || "Student";
      const displayDepartment = p.department?.code || p.user.department || "CITE";

      return {
        id: p.id,
        authorName: displayAuthorName,
        department: displayDepartment,
        studentId: displayStudentId,
        content: p.content,
        isAnonymous: p.isAnonymous,
        likesCount: p.likesCount,
        isLiked: Array.isArray(p.likedPosts) && p.likedPosts.length > 0,
        isSaved: Array.isArray(p.savedPosts) && p.savedPosts.length > 0,
        commentsCount: p.commentsCount,
        createdAt: p.createdAt.toISOString(),
        repostedAt: p.repostedAt ? p.repostedAt.toISOString() : null,
        isAuthor: isPostAuthor,
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
  } catch (error) {
    console.error("GET_USER_POSTS_ERROR:", error);
    return { success: false, error: "Failed to load user posts." };
  }
}

/**
 * 🔒 Fetch Sample / Related Followers for User
 */
export async function getFollowersAction(): Promise<ActionResult<FollowerItem[]>> {
  try {
    const followers: FollowerItem[] = [
      {
        id: "f1",
        displayName: "Juan Dela Cruz",
        studentId: "03-1819-034333",
        department: "CITE",
        avatarUrl: null,
      },
      {
        id: "f2",
        displayName: "Maria Santos",
        studentId: "03-2021-019283",
        department: "CEA",
        avatarUrl: null,
      },
      {
        id: "f3",
        displayName: "Angelo Reyes",
        studentId: "03-2122-094821",
        department: "CMA",
        avatarUrl: null,
      },
      {
        id: "f4",
        displayName: "Patricia Gomez",
        studentId: "03-2223-049182",
        department: "CAHS",
        avatarUrl: null,
      },
      {
        id: "f5",
        displayName: "Joshua Bautista",
        studentId: "03-1920-038291",
        department: "CITE",
        avatarUrl: null,
      },
    ];

    return { success: true, data: followers };
  } catch (error) {
    console.error("GET_FOLLOWERS_ERROR:", error);
    return { success: false, error: "Failed to load followers." };
  }
}

const UpdateBioSchema = z.object({
  bio: z.string().trim().max(500, "Bio cannot exceed 500 characters"),
});

/**
 * 🔒 Update User Bio
 */
export async function updateBioAction(input: { bio: string }): Promise<ActionResult<{ bio: string }>> {
  try {
    const validated = UpdateBioSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0]?.message || "Invalid input." };
    }

    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, error: "Unauthorized." };
    }

    await prisma.user.update({
      where: { id: authUser.id },
      data: { bio: validated.data.bio },
    });

    revalidatePath("/profile");
    return { success: true, data: { bio: validated.data.bio } };
  } catch (error) {
    console.error("UPDATE_BIO_ERROR:", error);
    return { success: false, error: "Failed to update bio." };
  }
}

const UpdateProfileDetailsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name cannot exceed 50 characters"),
  nickname: z
    .string()
    .trim()
    .max(30, "Nickname cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_]*$/, "Nickname can only contain letters, numbers, and underscores")
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim().toLowerCase() : null)),
  firstName: z.string().trim().max(50).optional().nullable(),
  lastName: z.string().trim().max(50).optional().nullable(),
  department: z.string().trim().max(30).optional().nullable(),
});

export type UpdateProfileDetailsInput = z.infer<typeof UpdateProfileDetailsSchema>;

/**
 * 🔒 Fortress-Grade Update User Profile Details (Anti-IDOR & Nickname Conflict Prevention)
 */
export async function updateProfileDetailsAction(
  input: UpdateProfileDetailsInput
): Promise<ActionResult<{ user: Partial<UserProfileData> }>> {
  try {
    const validated = UpdateProfileDetailsSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message || "Invalid profile data.",
        code: "VALIDATION_ERROR",
      };
    }

    // 🔒 1. Zero Client Trust: Strictly resolve authenticated user session
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return {
        success: false,
        error: "Unauthorized: Please log in to edit your profile.",
        code: "UNAUTHORIZED",
      };
    }

    const { displayName, nickname, firstName, lastName, department } = validated.data;

    // 🔒 2. Unique Nickname Conflict Detection
    if (nickname) {
      const existingNicknameOwner = await prisma.user.findFirst({
        where: {
          nickname: {
            equals: nickname,
            mode: "insensitive",
          },
          id: {
            not: authUser.id,
          },
        },
        select: { id: true },
      });

      if (existingNicknameOwner) {
        return {
          success: false,
          error: `The nickname "@${nickname}" is already taken by another student.`,
          code: "NICKNAME_TAKEN",
        };
      }
    }

    // 🔒 3. Atomic Scoped Update targeting ONLY authenticated user ID
    const updatedUser = await prisma.user.update({
      where: {
        id: authUser.id,
      },
      data: {
        displayName,
        nickname: nickname || null,
        firstName: firstName || null,
        lastName: lastName || null,
        department: department || "CITE",
      },
    });

    revalidatePath("/profile");
    revalidatePath("/");

    return {
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          displayName: updatedUser.displayName,
          nickname: updatedUser.nickname,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          department: updatedUser.department,
        },
      },
    };
  } catch (error) {
    console.error("UPDATE_PROFILE_DETAILS_ERROR:", error);
    return {
      success: false,
      error: "Unable to update profile. Please try again later.",
      code: "INTERNAL_ERROR",
    };
  }
}

