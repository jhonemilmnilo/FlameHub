import React from "react";
import { HomeFeedDashboard } from "./home-feed-dashboard";
import { getFeedPostsAction } from "@/features/feed/actions/post.action";

interface HomeFeedStreamerProps {
  currentUser: {
    name: string;
    studentId: string;
    avatarUrl?: string | null;
    nickname?: string | null;
  };
}

/**
 * ⚡ Async Server Component Streamer for Home Feed
 * Streamed inside React Suspense boundary on page.tsx
 */
export async function HomeFeedStreamer({ currentUser }: HomeFeedStreamerProps) {
  // ⚡ Server-Side Fetch real posts
  const initialFeedData = await getFeedPostsAction({ limit: 30 });

  return (
    <HomeFeedDashboard
      currentUser={currentUser}
      initialPosts={initialFeedData.posts}
      initialNextCursor={initialFeedData.nextCursor}
      initialHasMore={initialFeedData.hasMore}
    />
  );
}
