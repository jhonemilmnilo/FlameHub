import { type PostFeedItem } from "@/features/feed/actions/post.action";

export type GetHiddenPostsParams = {
  cursor?: string | null;
  limit?: number;
};

export type GetHiddenPostsResult = {
  posts: PostFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
};
