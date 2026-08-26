"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import {
  getPostLikersAction,
  type PostLikerItem,
} from "@/features/feed/actions/post.liked.action";

/**
 * 👥 usePostLikers — TanStack Query Hook for Likers Modal
 *
 * Capabilities:
 * - 0ms instant display from cache on repeat opens
 * - Background stale-while-revalidate
 * - Enabled only when modal is open (saves network bandwidth)
 * - Automatic cache invalidation when like/unlike is triggered
 */
export function usePostLikers(postId: string | null | undefined, isOpen: boolean) {
  return useQuery<PostLikerItem[]>({
    queryKey: queryKeys.post.likers(postId ?? ""),
    queryFn: async () => {
      if (!postId) return [];
      const res = await getPostLikersAction(postId);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to load likers.");
      }
      return res.data;
    },
    enabled: Boolean(postId && isOpen),
    staleTime: 0,
    refetchOnMount: "always",
    gcTime: 5 * 60 * 1000,
  });
}
