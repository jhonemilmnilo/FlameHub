/**
 * 🔑 Centralized Query Keys Registry
 * Prevents typo bugs and guarantees consistent invalidation across components.
 */
export const queryKeys = {
  post: {
    all: ["post"] as const,
    likers: (postId: string) => [...queryKeys.post.all, postId, "likers"] as const,
    comments: (postId: string) => [...queryKeys.post.all, postId, "comments"] as const,
  },
} as const;
