"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageSquareMore,
  MoreHorizontal,
  Eye,
  Link2,
  Flag,
  Ghost,
  Bookmark,
} from "lucide-react";
import { SendHorizontalIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { type PostFeedItem } from "@/features/feed/actions/post.action";
import { setPostLikeAction } from "@/features/feed/actions/post.liked.action";
import { toggleSavePostAction } from "@/features/feed/actions/post.saved.action";
import { unhidePostAction } from "@/features/feed/actions/post.hide.action";
import { createCommentAction } from "@/features/feed/actions/comment.action";
import { getHiddenPostsAction } from "../actions/get-hidden-posts.action";
import { EmptyHiddenPosts } from "./empty-hidden-posts";
import { CommentDrawerModal } from "@/features/feed/components/comment-drawer-modal";
import { PostLikersModal } from "@/features/feed/components/post-likers-modal";

function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

function PostCardSkeleton() {
  return (
    <div
      style={{ borderRadius: "10px" }}
      className="bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-5 flex flex-col justify-between space-y-4 shadow-xl select-none h-full animate-pulse"
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

interface HiddenPostsFeedProps {
  currentSessionUser?: {
    id?: string;
    studentId?: string;
    name?: string;
    avatarUrl?: string | null;
  } | null;
}

export function HiddenPostsFeed({ currentSessionUser }: HiddenPostsFeedProps) {
  const queryClient = useQueryClient();
  const [posts, setPosts] = useState<PostFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Interaction States
  const [activeHeartBursts, setActiveHeartBursts] = useState<Record<string, number>>({});
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [activeDiscussionPost, setActiveDiscussionPost] = useState<PostFeedItem | null>(null);
  const [activeLikersPostId, setActiveLikersPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [sendingComments, setSendingComments] = useState<Record<string, boolean>>({});

  // Refs for race-condition-free event listeners
  const postsRef = useRef(posts);
  const nextCursorRef = useRef(nextCursor);
  const hasMoreRef = useRef(hasMore);
  const isLoadingMoreRef = useRef(isLoadingMore);

  // Sync refs safely in effect
  useEffect(() => {
    postsRef.current = posts;
    nextCursorRef.current = nextCursor;
    hasMoreRef.current = hasMore;
    isLoadingMoreRef.current = isLoadingMore;
  }, [posts, nextCursor, hasMore, isLoadingMore]);

  // Initial Fetch
  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      setIsLoading(true);
      try {
        const res = await getHiddenPostsAction({ limit: 20 });
        if (isMounted && res.success && res.data) {
          setPosts(res.data.posts);
          setNextCursor(res.data.nextCursor);
          setHasMore(res.data.hasMore);
        }
      } catch {
        if (isMounted) {
          toast.error("Failed to load hidden posts.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  // Infinite Scroll Trigger
  useEffect(() => {
    const handleScroll = async () => {
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 600
      ) {
        if (hasMoreRef.current && !isLoadingMoreRef.current && nextCursorRef.current) {
          setIsLoadingMore(true);
          try {
            const res = await getHiddenPostsAction({
              cursor: nextCursorRef.current,
              limit: 20,
            });

            if (res.success && res.data) {
              const incoming = res.data.posts;
              setPosts((prev) => {
                const existingIds = new Set(prev.map((p) => p.id));
                const uniqueNew = incoming.filter((p) => !existingIds.has(p.id));
                return [...prev, ...uniqueNew];
              });
              setNextCursor(res.data.nextCursor);
              setHasMore(res.data.hasMore);
            }
          } catch {
            // Silently fail on scroll error
          } finally {
            setIsLoadingMore(false);
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-menu-container]")) {
        setActiveMenuPostId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Toggle Like Handler
  const handleToggleLike = async (postId: string) => {
    const targetPost = postsRef.current.find((p) => p.id === postId) || (activeDiscussionPost?.id === postId ? activeDiscussionPost : null);
    if (!targetPost) return;

    const nextIsLiked = !targetPost.isLiked;
    const nextLikesCount = nextIsLiked
      ? targetPost.likesCount + 1
      : Math.max(0, targetPost.likesCount - 1);

    if (nextIsLiked) {
      setActiveHeartBursts((prev) => ({ ...prev, [postId]: Date.now() }));
    }

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isLiked: nextIsLiked, likesCount: nextLikesCount } : p))
    );

    setActiveDiscussionPost((prev) =>
      prev && prev.id === postId
        ? {
            ...prev,
            isLiked: nextIsLiked,
            likesCount: nextLikesCount,
          }
        : prev
    );

    try {
      await setPostLikeAction(postId, nextIsLiked ? "LIKE" : "UNLIKE");
      queryClient.invalidateQueries({ queryKey: ["post"] });
    } catch {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLiked: targetPost.isLiked, likesCount: targetPost.likesCount }
            : p
        )
      );
      setActiveDiscussionPost((prev) =>
        prev && prev.id === postId
          ? {
              ...prev,
              isLiked: targetPost.isLiked,
              likesCount: targetPost.likesCount,
            }
          : prev
      );
    }
  };

  // Toggle Save Handler
  const handleToggleSave = async (post: PostFeedItem) => {
    setActiveMenuPostId(null);
    const previousIsSaved = post.isSaved;
    const previousSavedAt = post.savedAt;
    const nextIsSaved = !previousIsSaved;
    const nextSavedAt = nextIsSaved ? new Date().toISOString() : null;

    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, isSaved: nextIsSaved, savedAt: nextSavedAt } : p))
    );

    setActiveDiscussionPost((prev) =>
      prev && prev.id === post.id
        ? { ...prev, isSaved: nextIsSaved, savedAt: nextSavedAt }
        : prev
    );

    if (nextIsSaved) {
      toast.success("Post saved.");
    } else {
      toast.success("Post removed from saved.");
    }

    try {
      const res = await toggleSavePostAction(post.id);
      if (!res.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, isSaved: previousIsSaved, savedAt: previousSavedAt } : p))
        );
        setActiveDiscussionPost((prev) =>
          prev && prev.id === post.id
            ? { ...prev, isSaved: previousIsSaved, savedAt: previousSavedAt }
            : prev
        );
        toast.error(res.error || "Unable to update saved post.");
      } else if (res.data) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? { ...p, isSaved: res.data.isSaved, savedAt: res.data.savedAt ?? null }
              : p
          )
        );
        setActiveDiscussionPost((prev) =>
          prev && prev.id === post.id
            ? { ...prev, isSaved: res.data.isSaved, savedAt: res.data.savedAt ?? null }
            : prev
        );
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, isSaved: previousIsSaved, savedAt: previousSavedAt } : p))
      );
      setActiveDiscussionPost((prev) =>
        prev && prev.id === post.id
          ? { ...prev, isSaved: previousIsSaved, savedAt: previousSavedAt }
          : prev
      );
      toast.error("Network error while updating saved post.");
    }
  };

  // 👁️ Unhide Post Handler with Smooth Optimistic Removal
  const handleUnhidePost = async (post: PostFeedItem) => {
    setActiveMenuPostId(null);

    // Optimistic removal from hidden feed
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    toast.success("Post restored to your feed.");

    try {
      const res = await unhidePostAction(post.id);
      if (!res.success) {
        // Rollback on failure
        setPosts((prev) => [post, ...prev]);
        toast.error(res.error || "Unable to unhide post.");
      } else {
        queryClient.invalidateQueries({ queryKey: ["post"] });
      }
    } catch {
      setPosts((prev) => [post, ...prev]);
      toast.error("Network error while unhiding post.");
    }
  };

  // Inline Quick Comment Submission
  const handleSubmitComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || sendingComments[postId]) return;

    setSendingComments((prev) => ({ ...prev, [postId]: true }));
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
    );

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

  return (
    <div className="space-y-5">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      ) : posts.length === 0 ? (
        <EmptyHiddenPosts />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch [grid-auto-flow:dense]">
          <AnimatePresence initial={false}>
            {posts.map((post) => (
              <motion.article
                key={post.id}
                layout="position"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  layout: { type: "spring", stiffness: 140, damping: 22, mass: 0.9 },
                  opacity: { duration: 0.35, ease: "easeOut" },
                }}
                onClick={() => setActiveDiscussionPost(post)}
                style={{ borderRadius: "10px" }}
                className="bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-5 flex flex-col justify-between space-y-4 shadow-xl hover:border-[#8CC497]/60 hover:shadow-2xl transition-colors cursor-pointer group select-none h-full relative"
              >
                {/* 🔖 Classic Hanging Bookmark Ribbon (Color: #8CC497) if saved */}
                {post.isSaved && (
                  <div
                    className="absolute top-0 right-5 z-20 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
                    title="Saved Post"
                  >
                    <svg
                      width="22"
                      height="32"
                      viewBox="0 0 22 32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="animate-in slide-in-from-top-2 duration-300"
                    >
                      <path d="M0 0H22V28L11 21L0 28V0Z" fill="#8CC497" />
                      <path
                        d="M8 7H14C14.55 7 15 7.45 15 8V16L11 13.5L7 16V8C7 7.45 7.45 7 8 7Z"
                        fill="#002f1f"
                      />
                    </svg>
                  </div>
                )}

                {/* Header: Avatar + Author + Dept + Hidden Timestamp */}
                <div className="flex items-center gap-3 pr-6">
                  {!post.isAuthor && !post.isAnonymous && post.authorId ? (
                    <Link
                      href={`/profile/${post.authorId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-3 group/author min-w-0"
                      title={`View ${post.authorName}'s profile`}
                    >
                      <div className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center font-black text-sm relative overflow-hidden shadow-inner bg-[#002f1f] border border-[#8CC497] text-[#8CC497] group-hover/author:border-white group-hover/author:scale-105 transition-all">
                        {post.authorAvatarUrl ? (
                          <Image
                            src={post.authorAvatarUrl}
                            alt={post.authorName}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <span>{post.authorName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-bold text-xs sm:text-sm text-white truncate flex items-center gap-1.5 font-heading group-hover/author:text-[#8CC497] group-hover/author:underline transition-colors">
                          <span>{post.authorName}</span>
                          {post.authorNickname && (
                            <span className="text-[#8CC497] font-semibold text-[11px] sm:text-xs">
                              | @{post.authorNickname}
                            </span>
                          )}
                        </h3>
                        <p className="text-[11px] text-[#8CC497] font-medium tracking-wide flex items-center gap-1.5">
                          <span>{post.department}</span>
                          {post.hiddenAt && (
                            <>
                              <span className="text-[#8CC497]/40">•</span>
                              <span className="text-[#8CC497]/80 font-normal">
                                Hidden {formatRelativeTime(post.hiddenAt)}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 cursor-default min-w-0 select-none">
                      <div
                        className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center font-black text-sm relative overflow-hidden shadow-inner ${
                          post.isAnonymous && !post.isAuthor
                            ? "bg-purple-950/80 border border-purple-500/40 text-purple-300"
                            : "bg-[#002f1f] border border-[#8CC497] text-[#8CC497]"
                        }`}
                      >
                        {post.isAnonymous && !post.isAuthor ? (
                          <Ghost className="w-5 h-5 text-purple-300" />
                        ) : post.authorAvatarUrl ? (
                          <Image
                            src={post.authorAvatarUrl}
                            alt={post.authorName}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <span>{post.authorName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-bold text-xs sm:text-sm text-white truncate flex items-center gap-1.5 font-heading">
                          <span>{post.authorName}</span>
                          {post.authorNickname && (
                            <span className="text-[#8CC497] font-semibold text-[11px] sm:text-xs">
                              | @{post.authorNickname}
                            </span>
                          )}
                        </h3>
                        <p className="text-[11px] text-[#8CC497] font-medium tracking-wide flex items-center gap-1.5">
                          <span>{post.isAnonymous && !post.isAuthor ? "Flame" : post.department}</span>
                          {post.hiddenAt && (
                            <>
                              <span className="text-[#8CC497]/40">•</span>
                              <span className="text-[#8CC497]/80 font-normal">
                                Hidden {formatRelativeTime(post.hiddenAt)}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-sans whitespace-pre-wrap line-clamp-4 min-h-[48px]">
                  {post.content}
                </p>

                {/* Action Bar */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Heart Button with Particle Burst */}
                      <div className="relative flex items-center justify-center">
                        <AnimatePresence>
                          {activeHeartBursts[post.id] && (
                            <motion.div
                              key={activeHeartBursts[post.id]}
                              initial={{ opacity: 0, scale: 0.4, y: 0 }}
                              animate={{
                                opacity: [0, 1, 1, 0],
                                scale: [0.4, 1.4, 1.2, 0.8],
                                y: -36,
                                rotate: [0, -10, 10, 0],
                              }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.75, ease: "easeOut" }}
                              className="absolute pointer-events-none z-30 select-none text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]"
                            >
                              <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLike(post.id);
                          }}
                          className="p-1 -ml-1 text-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                          title="Like"
                        >
                          <Heart
                            className={`w-5 h-5 transition-colors ${
                              post.isLiked
                                ? "fill-rose-500 text-rose-500 animate-in zoom-in-75 duration-200"
                                : "text-white hover:text-rose-400"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Discussion Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDiscussionPost(post);
                        }}
                        className="p-1 text-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                        title="Discussion"
                      >
                        <MessageSquareMore className="w-5 h-5 text-white hover:text-[#8CC497] transition-colors" />
                      </button>
                    </div>

                    {/* 3-Dots Dropdown Menu */}
                    <div className="relative" data-menu-container>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuPostId((prev) => (prev === post.id ? null : post.id));
                        }}
                        className="p-1 -mr-1 text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                        title="More options"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>

                      {activeMenuPostId === post.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{ borderRadius: "10px" }}
                          className="absolute right-0 bottom-full mb-2 w-48 bg-[#002f1f] border border-[#005a3c] rounded-[10px] shadow-2xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-150"
                        >
                          {/* 👁️ Unhide Post Button */}
                          <button
                            type="button"
                            onClick={() => handleUnhidePost(post)}
                            style={{ borderRadius: "10px" }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-100 hover:text-white hover:bg-[#004e34] rounded-[10px] transition-colors text-left cursor-pointer"
                          >
                            <Eye className="w-4 h-4 text-[#8CC497]" />
                            <span>Unhide Post</span>
                          </button>

                          {/* Save/Unsave Button */}
                          {!post.isAuthor && (
                            <button
                              type="button"
                              onClick={() => handleToggleSave(post)}
                              style={{ borderRadius: "10px" }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-100 hover:text-white hover:bg-[#004e34] rounded-[10px] transition-colors text-left cursor-pointer"
                            >
                              <Bookmark
                                className={`w-4 h-4 ${
                                  post.isSaved
                                    ? "fill-[#8CC497] text-[#8CC497]"
                                    : "text-[#8CC497]"
                                }`}
                              />
                              <span>{post.isSaved ? "Unsave post" : "Save post"}</span>
                            </button>
                          )}

                          {/* Copy Link */}
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `${window.location.origin}/?post=${post.id}`
                              );
                              setActiveMenuPostId(null);
                              toast.success("Post link copied to clipboard!");
                            }}
                            style={{ borderRadius: "10px" }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-100 hover:text-white hover:bg-[#004e34] rounded-[10px] transition-colors text-left cursor-pointer"
                          >
                            <Link2 className="w-4 h-4 text-[#8CC497]" />
                            <span>Copy Link</span>
                          </button>

                          {/* Report Post */}
                          {!post.isAuthor && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuPostId(null);
                                toast.info("Report feature submitted for review.");
                              }}
                              style={{ borderRadius: "10px" }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 rounded-[10px] transition-colors text-left cursor-pointer"
                            >
                              <Flag className="w-4 h-4 text-rose-400" />
                              <span>Report Post</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats (Likes & Comments count) & Relative timestamp */}
                  <div className="flex items-center justify-between text-[11px] text-white/80 font-medium">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLikersPostId(post.id);
                        }}
                        className="hover:text-[#8CC497] hover:underline cursor-pointer transition-colors"
                        title="See who liked this post"
                      >
                        {post.likesCount} {post.likesCount === 1 ? "like" : "likes"}
                      </button>
                      <span className="text-[#8CC497]/40">•</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDiscussionPost(post);
                        }}
                        className="hover:text-[#8CC497] hover:underline cursor-pointer transition-colors"
                      >
                        {post.commentsCount} {post.commentsCount === 1 ? "comment" : "comments"}
                      </button>
                    </div>
                    <time
                      dateTime={post.repostedAt || post.createdAt}
                      suppressHydrationWarning
                      className="text-[#8CC497] font-medium text-[11px] flex items-center gap-1"
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
                      {post.isEdited && (
                        <>
                          <span className="text-[#8CC497]/40">•</span>
                          <span className="text-[10px] text-[#8CC497]/70 font-normal italic">Edited</span>
                        </>
                      )}
                    </time>
                  </div>

                  {/* Comment Input Box */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="relative flex items-center pt-0.5"
                  >
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      value={commentInputs[post.id] || ""}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSubmitComment(post.id);
                      }}
                      style={{ borderRadius: "10px" }}
                      className="w-full bg-[#002f1f] border border-[#005a3c] rounded-[10px] pl-4 pr-11 py-2.5 text-xs sm:text-sm text-white placeholder-[#8CC497]/40 focus:outline-none focus:border-[#8CC497] shadow-inner transition-all"
                    />

                    <button
                      type="button"
                      onClick={() => handleSubmitComment(post.id)}
                      disabled={!commentInputs[post.id]?.trim() || sendingComments[post.id]}
                      className="absolute right-2 p-1.5 rounded-[10px] text-[#8CC497] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all cursor-pointer group flex items-center justify-center"
                      title={sendingComments[post.id] ? "Sending..." : "Send Comment"}
                    >
                      {sendingComments[post.id] ? (
                        <span className="w-4 h-4 text-[#8CC497] animate-spin inline-block">⏳</span>
                      ) : (
                        <div className="pointer-events-none flex items-center justify-center">
                          <SendHorizontalIcon
                            isAnimated={Boolean(sendingComments[post.id])}
                            size={16}
                            duration={1.5}
                            color="#8CC497"
                            className="group-hover:scale-110 group-active:scale-90 transition-transform"
                          />
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>

          {/* Skeleton Loaders on Scroll */}
          {isLoadingMore && (
            <>
              <PostCardSkeleton />
              <PostCardSkeleton />
            </>
          )}
        </div>
      )}

      {/* Discussion Modal */}
      {activeDiscussionPost && (
        <CommentDrawerModal
          post={activeDiscussionPost}
          isOpen={Boolean(activeDiscussionPost)}
          onClose={() => setActiveDiscussionPost(null)}
          onCommentAdded={(postId) => {
            setPosts((prev) =>
              prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
            );
          }}
          onPostLikeToggled={handleToggleLike}
          onToggleSavePost={handleToggleSave}
          onUnhidePost={(p) => {
            setActiveDiscussionPost(null);
            handleUnhidePost(p);
          }}
        />
      )}

      {/* Likers Modal */}
      {activeLikersPostId && (
        <PostLikersModal
          postId={activeLikersPostId}
          isOpen={Boolean(activeLikersPostId)}
          onClose={() => setActiveLikersPostId(null)}
          currentStudentId={currentSessionUser?.studentId}
        />
      )}
    </div>
  );
}
