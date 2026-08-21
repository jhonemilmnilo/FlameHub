"use client";

import React, { useState, useEffect } from "react";
import {
  Filter,
  Search,
  Heart,
  MessageSquareMore,
  MoreHorizontal,
  Send,
  Share2,
  Bookmark,
  Pencil,
  Trash2,
  Ghost,
  UserCheck,
  Repeat2,
} from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { CommentDrawerModal } from "@/features/feed/components/comment-drawer-modal";
import {
  createPostAction,
  editPostAction,
  deletePostAction,
  repostPostAction,
  type PostFeedItem,
} from "@/features/feed/actions/post.action";
import { toggleLikePostAction } from "@/features/feed/actions/post.liked.action";
import { toggleSavePostAction } from "@/features/feed/actions/post.saved.action";
import { createCommentAction } from "@/features/feed/actions/comment.action";
import { toast } from "sonner";

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInSeconds / 86400);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

// 💀 High-End Shimmer Skeleton Card Component matching theme
function PostCardSkeleton() {
  return (
    <div
      style={{ borderRadius: "10px" }}
      className="bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-5 flex flex-col justify-between space-y-4 shadow-xl animate-pulse"
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-[#8CC497]/30 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 bg-white/20 rounded-md w-3/5" />
          <div className="h-2.5 bg-[#8CC497]/20 rounded-md w-2/5" />
        </div>
      </div>
      <div className="space-y-2 py-1">
        <div className="h-3 bg-white/15 rounded-md w-full" />
        <div className="h-3 bg-white/15 rounded-md w-4/5" />
      </div>
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-white/15" />
            <div className="w-5 h-5 rounded-full bg-white/15" />
          </div>
          <div className="w-5 h-5 rounded-full bg-white/15" />
        </div>
        <div className="h-2.5 bg-[#8CC497]/20 rounded-md w-1/4" />
        <div className="h-8 bg-[#002f1f] rounded-[10px] w-full" />
      </div>
    </div>
  );
}

interface ProfileActivityFeedProps {
  initialPosts: PostFeedItem[];
  initialNextCursor?: string | null;
  initialHasMore?: boolean;
  targetUserId?: string;
  isSelf: boolean;
  userName: string;
}

export function ProfileActivityFeed({
  initialPosts,
  initialNextCursor = null,
  initialHasMore = false,
  targetUserId,
  isSelf,
  userName,
}: ProfileActivityFeedProps) {
  const [posts, setPosts] = useState<PostFeedItem[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 🔒 Ref trackers for smooth window scroll listener without re-binds
  const nextCursorRef = React.useRef<string | null>(initialNextCursor);
  const hasMoreRef = React.useRef<boolean>(initialHasMore);
  const isLoadingMoreRef = React.useRef<boolean>(false);
  const postsRef = React.useRef<PostFeedItem[]>(initialPosts);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  // 🔄 Fetch more posts on reaching bottom (Infinite Scroll)
  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMoreRef.current) return;

    const currentCursor =
      nextCursorRef.current ||
      (postsRef.current.length > 0 ? postsRef.current[postsRef.current.length - 1].id : null);

    if (!currentCursor) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const { getUserPostsAction } = await import("@/features/profile/actions/profile.action");
      const res = await getUserPostsAction({
        targetUserId,
        cursor: currentCursor,
        limit: 12,
      });

      if (res.success && res.data && res.data.posts && res.data.posts.length > 0) {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newUnique = res.data!.posts.filter((p: PostFeedItem) => !existingIds.has(p.id));
          const merged = [...prev, ...newUnique];
          postsRef.current = merged;
          return merged;
        });

        nextCursorRef.current = res.data.nextCursor;
        hasMoreRef.current = res.data.hasMore;
        setNextCursor(res.data.nextCursor);
        setHasMore(res.data.hasMore);
      } else {
        hasMoreRef.current = false;
        setHasMore(false);
      }
    } catch {
      // Ignore network hiccups
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [targetUserId]);

  // 🌐 Global Window Scroll Engine (requestAnimationFrame Throttled)
  useEffect(() => {
    let ticking = false;

    const checkScrollPosition = () => {
      if (isLoadingMoreRef.current || !hasMoreRef.current) {
        ticking = false;
        return;
      }

      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const currentScroll = window.scrollY || document.documentElement.scrollTop;

      // When user is within 800px of page bottom, fetch next batch
      if (currentScroll + windowHeight >= documentHeight - 800) {
        handleLoadMore();
      }

      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(checkScrollPosition);
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleLoadMore]);

  const [searchQuery, setSearchQuery] = useState("");
  const [contentType, setContentType] = useState("Post");
  const [sortBy, setSortBy] = useState("Latest");

  // Post Actions
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [sendingComments, setSendingComments] = useState<Record<string, boolean>>({});
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [activeDiscussionPost, setActiveDiscussionPost] = useState<PostFeedItem | null>(null);

  // Modals
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  const [editingPost, setEditingPost] = useState<PostFeedItem | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editIsAnonymous, setEditIsAnonymous] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [deletingPost, setDeletingPost] = useState<PostFeedItem | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Close menus on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-menu-container]")) {
        setActiveMenuPostId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const filteredPosts = React.useMemo(() => {
    let result = [...posts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.authorName.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q) ||
          p.studentId.toLowerCase().includes(q)
      );
    }

    if (sortBy === "Most Liked") {
      result.sort((a, b) => b.likesCount - a.likesCount);
    } else if (sortBy === "Latest") {
      result.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return result;
  }, [posts, searchQuery, sortBy]);

  const handleToggleLike = async (postId: string) => {
    const targetPost = posts.find((p) => p.id === postId);
    if (!targetPost) return;

    const previousIsLiked = targetPost.isLiked;
    const previousLikesCount = targetPost.likesCount;
    const nextIsLiked = !previousIsLiked;
    const nextLikesCount = nextIsLiked ? previousLikesCount + 1 : Math.max(0, previousLikesCount - 1);

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, isLiked: nextIsLiked, likesCount: nextLikesCount } : p
      )
    );

    try {
      const res = await toggleLikePostAction(postId);
      if (!res.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, isLiked: previousIsLiked, likesCount: previousLikesCount } : p
          )
        );
        toast.error(res.error || "Failed to update like.");
      } else if (res.data) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isLiked: res.data.isLiked, likesCount: res.data.likesCount }
              : p
          )
        );
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, isLiked: previousIsLiked, likesCount: previousLikesCount } : p
        )
      );
    }
  };

  const handleToggleSave = async (post: PostFeedItem) => {
    setActiveMenuPostId(null);
    if (post.isAuthor) {
      toast.error("You cannot save your own post.");
      return;
    }

    const previousIsSaved = post.isSaved;
    const nextIsSaved = !previousIsSaved;

    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, isSaved: nextIsSaved } : p))
    );

    toast.success(nextIsSaved ? "Post saved to your bookmarks." : "Post removed from bookmarks.");

    try {
      const res = await toggleSavePostAction(post.id);
      if (!res.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, isSaved: previousIsSaved } : p))
        );
        toast.error(res.error || "Unable to update bookmark.");
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, isSaved: previousIsSaved } : p))
      );
    }
  };

  const handleSendComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || sendingComments[postId]) return;

    setSendingComments((prev) => ({ ...prev, [postId]: true }));
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
    );
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));

    try {
      const res = await createCommentAction({
        postId,
        content: text,
        isAnonymous: false,
      });

      if (!res.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) } : p
          )
        );
        setCommentInputs((prev) => ({ ...prev, [postId]: text }));
        toast.error(res.error || "Unable to post comment.");
      } else {
        toast.success("Comment submitted successfully.");
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) } : p
        )
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: text }));
    } finally {
      setTimeout(() => {
        setSendingComments((prev) => ({ ...prev, [postId]: false }));
      }, 500);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || isSubmittingPost) return;

    setIsSubmittingPost(true);
    try {
      const res = await createPostAction({
        content: newPostContent.trim(),
        isAnonymous,
      });

      if (res.success && res.data) {
        setPosts((prev) => [res.data, ...prev]);
        setNewPostContent("");
        setIsAnonymous(false);
        setIsComposerOpen(false);
        toast.success("Post created successfully!");
      } else {
        toast.error(res.error || "Unable to create post.");
      }
    } catch {
      toast.error("Network error while creating post.");
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleSaveEditPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost || !editContent.trim() || isSubmittingEdit) return;

    setIsSubmittingEdit(true);
    try {
      const res = await editPostAction({
        postId: editingPost.id,
        content: editContent.trim(),
        isAnonymous: editIsAnonymous,
      });

      if (res.success && res.data) {
        setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? res.data : p)));
        setEditingPost(null);
        toast.success("Post updated successfully.");
      } else {
        toast.error(res.error || "Unable to update post.");
      }
    } catch {
      toast.error("Network error while updating post.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmDeletePost = async () => {
    if (!deletingPost || isSubmittingDelete) return;

    const targetPostId = deletingPost.id;
    setIsSubmittingDelete(true);
    const originalPosts = posts;
    setPosts((prev) => prev.filter((p) => p.id !== targetPostId));
    setDeletingPost(null);

    try {
      const res = await deletePostAction(targetPostId);
      if (res.success) {
        toast.success("Post removed successfully.");
      } else {
        setPosts(originalPosts);
        toast.error(res.error || "Failed to remove post.");
      }
    } catch {
      setPosts(originalPosts);
      toast.error("Network error while removing post.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const [repostingPostId, setRepostingPostId] = useState<string | null>(null);

  const handleRepostPost = async (post: PostFeedItem) => {
    if (repostingPostId) return;

    // Check client-side cooldown first
    const now = new Date();
    const lastTimestamp = post.repostedAt ? new Date(post.repostedAt) : new Date(post.createdAt);
    const diffInHours = (now.getTime() - lastTimestamp.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      const remainingHours = Math.ceil(24 - diffInHours);
      toast.error(`You can only repost this once every 24 hours. Please wait ${remainingHours}h.`);
      return;
    }

    setRepostingPostId(post.id);
    try {
      const res = await repostPostAction(post.id);
      if (res.success && res.data) {
        toast.success("Post reposted to top of campus feed! 🚀");
        setPosts((prev) => {
          const target = prev.find((p) => p.id === post.id);
          if (!target) return prev;
          const updated = { ...target, repostedAt: res.data.repostedAt };
          const others = prev.filter((p) => p.id !== post.id);
          return [updated, ...others];
        });
      } else {
        toast.error(res.error || "Unable to repost.");
      }
    } catch {
      toast.error("Network error while reposting.");
    } finally {
      setRepostingPostId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Activity Heading */}
      <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight">
        Activity
      </h2>

      {/* Activity Composer Pill Bar matching screenshot */}
      {isSelf && (
        <div
          style={{ borderRadius: "10px" }}
          className="w-full bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-4 md:p-5 shadow-xl"
        >
          <button
            type="button"
            onClick={() => setIsComposerOpen(true)}
            className="w-full text-left bg-[#002f1f]/80 hover:bg-[#002f1f] border border-[#8CC497]/30 hover:border-[#8CC497]/70 rounded-full px-6 py-3.5 text-xs sm:text-sm text-[#8CC497]/80 hover:text-[#8CC497] transition-all cursor-pointer shadow-inner active:scale-[0.99]"
          >
            Is there something you need to share?
          </button>
        </div>
      )}

      {/* 2-Column Cards Grid matching mockup */}
      {filteredPosts.length === 0 ? (
        <div
          style={{ borderRadius: "10px" }}
          className="bg-[#003F2A]/60 border border-[#005a3c] rounded-[10px] p-10 text-center space-y-3"
        >
          <p className="text-sm text-[#8CC497]/70">No activity posts found yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              style={{ borderRadius: "10px" }}
              className="bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-5 flex flex-col justify-between space-y-4 shadow-xl hover:border-[#8CC497]/40 transition-all"
            >
              {/* Header: Light Green Avatar + Author + Dept + Student ID */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#8CC497] shrink-0 flex items-center justify-center text-[#003F2A] font-black text-base shadow-inner">
                  {post.isAnonymous ? "A" : post.authorName.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-xs sm:text-sm text-white truncate">
                    {post.isAnonymous ? "Anonymous" : post.authorName}{" "}
                    <span className="text-[#8CC497] font-semibold">
                      | {post.isAnonymous ? "Flame" : post.department}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#8CC497] font-medium">
                    {post.isAnonymous ? "Hidden ID" : post.studentId}
                  </p>
                </div>
              </div>

              {/* Body Text */}
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed min-h-[44px]">
                {post.content}
              </p>

              {/* Action Strip */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Like */}
                    <button
                      type="button"
                      onClick={() => handleToggleLike(post.id)}
                      className="p-1 -ml-1 text-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                      title="Like"
                    >
                      <Heart
                        className={`w-5 h-5 transition-colors ${
                          post.isLiked
                            ? "fill-rose-500 text-rose-500"
                            : "text-white/80 hover:text-white"
                        }`}
                      />
                    </button>

                    {/* Open Comments Drawer */}
                    <button
                      type="button"
                      onClick={() => setActiveDiscussionPost(post)}
                      className="p-1 text-white/80 hover:text-[#8CC497] hover:scale-110 active:scale-95 transition-all cursor-pointer"
                      title="Comments"
                    >
                      <MessageSquareMore className="w-5 h-5" />
                    </button>

                    {/* Repost Button (For Author) OR Share Button (For Non-Authors) */}
                    {post.isAuthor ? (
                      <button
                        type="button"
                        onClick={() => handleRepostPost(post)}
                        disabled={Boolean(repostingPostId)}
                        className={`p-1 transition-all cursor-pointer ${
                          repostingPostId === post.id
                            ? "animate-spin text-[#8CC497]"
                            : "text-[#8CC497] hover:text-white hover:scale-110 active:scale-95"
                        }`}
                        title="Repost to feed (Once every 24h)"
                      >
                        <Repeat2 className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(window.location.href);
                            toast.success("Post link copied to clipboard!");
                          }
                        }}
                        className="p-1 text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                        title="Share post"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* 3-Dots Menu */}
                  <div className="relative" data-menu-container>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuPostId((prev) => (prev === post.id ? null : post.id));
                      }}
                      className="p-1 text-white/60 hover:text-white transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {activeMenuPostId === post.id && (
                      <div
                        style={{ borderRadius: "10px" }}
                        className="absolute right-0 bottom-full mb-2 w-44 bg-[#002f1f] border border-[#005a3c] rounded-[10px] shadow-2xl p-1.5 z-30 animate-in fade-in zoom-in-95 backdrop-blur-md"
                      >
                        {post.isAuthor && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuPostId(null);
                                setEditingPost(post);
                                setEditContent(post.content);
                                setEditIsAnonymous(post.isAnonymous);
                              }}
                              style={{ borderRadius: "10px" }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#8CC497] hover:text-white hover:bg-[#004e34] rounded-[10px] transition-colors text-left cursor-pointer"
                            >
                              <Pencil className="w-4 h-4 text-[#8CC497]" />
                              <span>Edit Post</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuPostId(null);
                                setDeletingPost(post);
                              }}
                              style={{ borderRadius: "10px" }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 rounded-[10px] transition-colors text-left cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 text-rose-400" />
                              <span>Delete Post</span>
                            </button>
                          </>
                        )}

                        {!post.isAuthor && (
                          <button
                            type="button"
                            onClick={() => handleToggleSave(post)}
                            style={{ borderRadius: "10px" }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-100 hover:text-white hover:bg-[#004e34] rounded-[10px] transition-colors text-left cursor-pointer"
                          >
                            <Bookmark
                              className={`w-4 h-4 ${
                                post.isSaved ? "fill-emerald-400 text-emerald-400" : "text-[#8CC497]"
                              }`}
                            />
                            <span>{post.isSaved ? "Unsave" : "Save"}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats (Likes & Comments count beside each other) & Relative timestamp */}
                <div className="flex items-center justify-between text-[11px] text-white/80 font-medium">
                  <div className="flex items-center gap-2.5">
                    <span>{post.likesCount} {post.likesCount === 1 ? "like" : "likes"}</span>
                    <span className="text-[#8CC497]/40">•</span>
                    <button
                      type="button"
                      onClick={() => setActiveDiscussionPost(post)}
                      className="hover:text-[#8CC497] hover:underline cursor-pointer transition-colors"
                    >
                      {post.commentsCount} {post.commentsCount === 1 ? "comment" : "comments"}
                    </button>
                  </div>
                  <time
                    dateTime={post.repostedAt || post.createdAt}
                    suppressHydrationWarning
                    className="text-[#8CC497] font-medium text-[11px]"
                  >
                    {post.repostedAt ? (
                      <span className="text-[#8CC497] font-semibold">
                        Reposted {formatRelativeTime(post.repostedAt)}
                      </span>
                    ) : (
                      <span className="text-[#8CC497]/80">
                        {formatRelativeTime(post.createdAt)}
                      </span>
                    )}
                  </time>
                </div>

                {/* Comment Input Box matching home feed exactly */}
                <div className="relative flex items-center pt-0.5">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={commentInputs[post.id] || ""}
                    onChange={(e) =>
                      setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendComment(post.id);
                    }}
                    style={{ borderRadius: "10px" }}
                    className="w-full bg-[#002f1f] border border-[#005a3c] rounded-[10px] pl-4 pr-11 py-2.5 text-xs sm:text-sm text-white placeholder-[#8CC497]/40 focus:outline-none focus:border-[#8CC497] shadow-inner transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendComment(post.id)}
                    disabled={!commentInputs[post.id]?.trim() || sendingComments[post.id]}
                    className="absolute right-2 p-1.5 rounded-[10px] text-[#8CC497] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all cursor-pointer group"
                    title={sendingComments[post.id] ? "Sending..." : "Send Comment"}
                  >
                    <Send className="w-4 h-4 text-[#8CC497] group-hover:text-white transition-colors" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 💀 Skeleton Loading Cards during Infinite Scroll */}
      {isLoadingMore && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      )}

      {/* 🎯 Auto Sentinel + Explicit Trigger Fallback */}
      {hasMore && !isLoadingMore && (
        <div className="pt-6 pb-2 text-center select-none flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => handleLoadMore()}
            style={{ borderRadius: "10px" }}
            className="px-6 py-2.5 rounded-[10px] bg-[#003F2A] hover:bg-[#004e34] border border-[#005a3c] hover:border-[#8CC497]/50 text-xs font-bold text-[#8CC497] hover:text-white transition-all cursor-pointer shadow-sm"
          >
            Load More Posts
          </button>
          <span className="text-[11px] text-[#8CC497]/60">or scroll down to auto-load</span>
        </div>
      )}

      {/* 🏁 End of Feed State */}
      {!hasMore && posts.length > 0 && (
        <div className="pt-8 pb-4 text-center select-none">
          <div
            style={{ borderRadius: "10px" }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#003F2A] border border-[#005a3c] text-xs font-semibold text-[#8CC497] shadow-sm"
          >
            <span>🔥</span>
            <span>You’re all caught up with all {posts.length} profile posts!</span>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-[#003F2A] border border-[#005a3c] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#005a3c] pb-3">
              <h3 className="font-extrabold text-base text-white font-heading">
                Create Post
              </h3>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="text-white/60 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <textarea
                rows={4}
                autoFocus
                placeholder="Share your campus thoughts..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="w-full bg-[#002f1f] border border-[#005a3c] rounded-2xl p-3.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#8CC497] transition-all resize-none"
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setIsAnonymous((prev) => !prev)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isAnonymous
                      ? "bg-purple-950/80 text-purple-200 border border-purple-400/60"
                      : "bg-[#002f1f] text-[#8CC497] border border-[#005a3c]"
                  }`}
                >
                  {isAnonymous ? (
                    <>
                      <Ghost className="w-4 h-4 text-purple-300" />
                      <span>Post as Anonymous</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 text-[#8CC497]" />
                      <span>Public Identity</span>
                    </>
                  )}
                </button>

                <button
                  type="submit"
                  disabled={!newPostContent.trim() || isSubmittingPost}
                  className="px-6 py-2 rounded-full bg-[#8CC497] hover:bg-[#a1d7ab] text-[#003F2A] font-extrabold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPost ? "POSTING..." : "POST"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-[#003F2A] border border-[#005a3c] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#005a3c] pb-3">
              <h3 className="font-extrabold text-base text-white font-heading">
                Edit Post
              </h3>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="text-white/60 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditPost} className="space-y-4">
              <textarea
                rows={4}
                autoFocus
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-[#002f1f] border border-[#005a3c] rounded-2xl p-3.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#8CC497] transition-all resize-none"
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setEditIsAnonymous((prev) => !prev)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    editIsAnonymous
                      ? "bg-purple-950/80 text-purple-200 border border-purple-400/60"
                      : "bg-[#002f1f] text-[#8CC497] border border-[#005a3c]"
                  }`}
                >
                  {editIsAnonymous ? (
                    <>
                      <Ghost className="w-4 h-4 text-purple-300" />
                      <span>Anonymous</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 text-[#8CC497]" />
                      <span>Public</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPost(null)}
                    className="px-4 py-2 rounded-full text-xs font-bold text-white/70 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!editContent.trim() || isSubmittingEdit}
                    className="px-6 py-2 rounded-full bg-[#8CC497] hover:bg-[#a1d7ab] text-[#003F2A] font-extrabold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingEdit ? "SAVING..." : "SAVE"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deletingPost)}
        onClose={() => setDeletingPost(null)}
        onConfirm={handleConfirmDeletePost}
        title="Delete Post?"
        description="Are you sure you want to delete this post? This action cannot be undone."
        previewText={deletingPost?.content}
        confirmText="DELETE"
        confirmLoadingText="DELETING..."
        isLoading={isSubmittingDelete}
        variant="danger"
      />

      {/* Comments Drawer */}
      <CommentDrawerModal
        post={activeDiscussionPost}
        isOpen={Boolean(activeDiscussionPost)}
        onClose={() => setActiveDiscussionPost(null)}
        onCommentAdded={(postId) => {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
            )
          );
        }}
      />
    </div>
  );
}
