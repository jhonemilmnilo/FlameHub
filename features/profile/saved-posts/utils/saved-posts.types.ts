import { PostFeedItem } from "@/features/feed/actions/post.action";

export interface GetSavedPostsParams {
  cursor?: string | null;
  limit?: number;
}

export interface GetSavedPostsResult {
  posts: PostFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
}
