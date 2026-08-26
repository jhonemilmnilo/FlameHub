"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Home,
  Bell,
  HelpCircle,
  Info,
  LogOut,
  Heart,
  MessageSquareMore,
  MoreHorizontal,
  Send,
  Filter,
  Search,
  ChevronDown,
  UserCheck,
  Ghost,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Flag,
  EyeOff,
  Bookmark,
  Copy,
  Pencil,
  Trash2,
  AlertTriangle,
  Repeat2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";

import {
  createPostAction,
  getFeedPostsAction,
  editPostAction,
  deletePostAction,
  repostPostAction,
  type PostFeedItem,
} from "@/features/feed/actions/post.action";
import {
  toggleLikePostAction,
  setPostLikeAction,
  type LikeTargetAction,
  type PostLikerItem,
} from "@/features/feed/actions/post.liked.action";
import { toggleSavePostAction } from "@/features/feed/actions/post.saved.action";
import { hidePostAction } from "@/features/feed/actions/post.hide.action";
import { createCommentAction } from "@/features/feed/actions/comment.action";
import { CommentDrawerModal } from "@/features/feed/components/comment-drawer-modal";
import { PostLikersModal } from "@/features/feed/components/post-likers-modal";
import { CustomSelect } from "@/components/ui/custom-select";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
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
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

interface HomeFeedDashboardProps {
  currentUser?: {
    name: string;
    studentId: string;
    avatarUrl?: string | null;
    nickname?: string | null;
  };
  initialPosts?: PostFeedItem[];
  initialNextCursor?: string | null;
  initialHasMore?: boolean;
}

// 💀 High-End Shimmer Skeleton Card Component
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

export function HomeFeedDashboard({
  currentUser = {
    name: "Campus Student",
    studentId: "03-2122-000000",
  },
  initialPosts = [],
  initialNextCursor = null,
  initialHasMore = false,
}: HomeFeedDashboardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [posts, setPosts] = useState<PostFeedItem[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isInitialLoading = initialPosts.length === 0;

  // 🔒 Ref trackers to always provide freshest values to observer without triggering re-binds
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

  // 🔝 Disable browser automatic scroll restoration to always start at the top on refresh/reload
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [sendingComments, setSendingComments] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("ALL");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [newPostContent, setNewPostContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [activeDiscussionPost, setActiveDiscussionPost] = useState<PostFeedItem | null>(null);
  const [activeLikersPostId, setActiveLikersPostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<PostFeedItem | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editIsAnonymous, setEditIsAnonymous] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [deletingPost, setDeletingPost] = useState<PostFeedItem | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [activeHeartBursts, setActiveHeartBursts] = useState<Record<string, number>>({});

  // 🧠 Client-Side Live Filter & Smart Controversial Sort Algorithm
  const filteredAndSortedPosts = React.useMemo(() => {
    let result = [...posts];

    // 1. Department Filter
    if (selectedDept !== "ALL") {
      result = result.filter(
        (p) => p.department?.toUpperCase() === selectedDept.toUpperCase()
      );
    }

    // 2. Search Query Filter (Searches content, author, department, and studentId)
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

    // Helper to calculate effective timestamp (whichever is newest: creation or repost)
    const getEffectiveTime = (p: PostFeedItem) => {
      const createdTime = new Date(p.createdAt).getTime();
      const repostedTime = p.repostedAt ? new Date(p.repostedAt).getTime() : 0;
      return Math.max(createdTime, repostedTime);
    };

    // 3. Sort / Category Filter
    if (sortBy === "Saved") {
      result = result.filter((p) => p.isSaved);
      result.sort((a, b) => getEffectiveTime(b) - getEffectiveTime(a));
    } else if (sortBy === "Controversial") {
      // ⚡ Controversial Score = Combined high activity (Likes + Comments engagement balance)
      result.sort((a, b) => {
        const scoreA = a.likesCount + a.commentsCount * 2;
        const scoreB = b.likesCount + b.commentsCount * 2;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return getEffectiveTime(b) - getEffectiveTime(a);
      });
    } else if (sortBy === "Most Liked") {
      result.sort((a, b) => {
        if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
        return getEffectiveTime(b) - getEffectiveTime(a);
      });
    } else if (sortBy === "Latest" || sortBy === "ALL") {
      // ⚡ Sort strictly by whichever is most recent: latest post or latest repost
      result.sort((a, b) => getEffectiveTime(b) - getEffectiveTime(a));
    } else {
      result.sort((a, b) => getEffectiveTime(b) - getEffectiveTime(a));
    }

    return result;
  }, [posts, selectedDept, searchQuery, sortBy]);

  // Close dropdown menu when clicking outside
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

  // 🔒 Lock background scrolling when Create Post modal is open
  useEffect(() => {
    if (isComposerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isComposerOpen]);

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
      const res = await getFeedPostsAction({
        cursor: currentCursor,
        limit: 30,
      });

      if (res.posts && res.posts.length > 0) {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newUnique = res.posts.filter((p) => !existingIds.has(p.id));
          const merged = [...prev, ...newUnique];
          postsRef.current = merged;
          return merged;
        });

        nextCursorRef.current = res.nextCursor;
        hasMoreRef.current = res.hasMore;
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
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
  }, []);

  // 🌐 Facebook-Style Global Window Scroll Engine (requestAnimationFrame Throttled)
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
    window.addEventListener("resize", handleScroll, { passive: true });

    // Initial check in case viewport is tall
    checkScrollPosition();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [handleLoadMore]);

  // ⚡ Debounce buffer and sequence-intent tracker for rapid like/unlike spamming per postId
  const likeDebounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const likeIntentSequenceRef = useRef<number>(0);
  const pendingLikeIntentsRef = useRef<
    Map<
      string,
      {
        targetAction: LikeTargetAction;
        sequenceId: number;
        originalIsLiked: boolean;
        originalLikesCount: number;
      }
    >
  >(new Map());

  const handleToggleLike = React.useCallback(async (postId: string) => {
    const targetPost = postsRef.current.find((p) => p.id === postId);
    if (!targetPost) return;

    const previousIsLiked = targetPost.isLiked;
    const previousLikesCount = targetPost.likesCount;
    const nextIsLiked = !previousIsLiked;
    const nextLikesCount = nextIsLiked
      ? previousLikesCount + 1
      : Math.max(0, previousLikesCount - 1);
    const targetAction: LikeTargetAction = nextIsLiked ? "LIKE" : "UNLIKE";
    
    // Monotonic sequence ID: deterministic, pure, and immune to clock skew
    const currentIntentSequence = ++likeIntentSequenceRef.current;

    // Preserve the true original baseline before spam began
    const existingIntent = pendingLikeIntentsRef.current.get(postId);
    const baseOriginalIsLiked = existingIntent
      ? existingIntent.originalIsLiked
      : previousIsLiked;
    const baseOriginalLikesCount = existingIntent
      ? existingIntent.originalLikesCount
      : previousLikesCount;

    pendingLikeIntentsRef.current.set(postId, {
      targetAction,
      sequenceId: currentIntentSequence,
      originalIsLiked: baseOriginalIsLiked,
      originalLikesCount: baseOriginalLikesCount,
    });

    // 1. Instant 0ms Optimistic UI toggle for both feed card and open discussion modal
    if (nextIsLiked) {
      setActiveHeartBursts((prev) => ({ ...prev, [postId]: Date.now() }));
    }

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: nextIsLiked,
              likesCount: nextLikesCount,
            }
          : post
      )
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

    // ⚡ Instant Optimistic Update for Post Likers Cache
    queryClient.setQueryData<PostLikerItem[]>(
      queryKeys.post.likers(postId),
      (prevLikers) => {
        const currentList = prevLikers ? [...prevLikers] : [];
        if (nextIsLiked) {
          const alreadyInList = currentList.some(
            (u) => u.displayName === (currentUser?.name || "Campus Student") || u.studentId === (currentUser?.studentId || "Student")
          );
          if (!alreadyInList) {
            return [
              {
                id: `temp-${Date.now()}`,
                userId: "current-user",
                displayName: currentUser?.name || "Campus Student",
                studentId: currentUser?.studentId || "Student",
                department: "FlameHub",
                avatarUrl: currentUser?.avatarUrl || null,
                likedAt: new Date().toISOString(),
              },
              ...currentList,
            ];
          }
          return currentList;
        } else {
          return currentList.filter(
            (u) =>
              u.displayName !== (currentUser?.name || "Campus Student") &&
              u.studentId !== (currentUser?.studentId || "Student")
          );
        }
      }
    );

    // 2. Clear any existing debounce timer for this specific post
    if (likeDebounceTimersRef.current[postId]) {
      clearTimeout(likeDebounceTimersRef.current[postId]);
    }

    // 3. Buffer server call: Wait 350ms after the last click before writing to DB
    likeDebounceTimersRef.current[postId] = setTimeout(async () => {
      delete likeDebounceTimersRef.current[postId];

      // Check if this execution is still the latest registered intent for this post
      const intent = pendingLikeIntentsRef.current.get(postId);
      if (!intent || intent.sequenceId !== currentIntentSequence) {
        return;
      }

      try {
        const res = await setPostLikeAction(postId, intent.targetAction);

        // Discard result if user started clicking again while network request was in flight
        const latestIntent = pendingLikeIntentsRef.current.get(postId);
        if (latestIntent && latestIntent.sequenceId !== currentIntentSequence) {
          return;
        }

        pendingLikeIntentsRef.current.delete(postId);

        if (!res.success) {
          // Rollback to true pre-spam baseline
          setPosts((prev) =>
            prev.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    isLiked: baseOriginalIsLiked,
                    likesCount: baseOriginalLikesCount,
                  }
                : post
            )
          );
          setActiveDiscussionPost((prev) =>
            prev && prev.id === postId
              ? {
                  ...prev,
                  isLiked: baseOriginalIsLiked,
                  likesCount: baseOriginalLikesCount,
                }
              : prev
          );
          toast.error(res.error || "Failed to update like status.");
        } else if (res.data) {
          // Sync with database truth
          setPosts((prev) =>
            prev.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    isLiked: res.data.isLiked,
                    likesCount: res.data.likesCount,
                  }
                : post
            )
          );
          setActiveDiscussionPost((prev) =>
            prev && prev.id === postId
              ? {
                  ...prev,
                  isLiked: res.data.isLiked,
                  likesCount: res.data.likesCount,
                }
              : prev
          );
        }
      } catch {
        const latestIntent = pendingLikeIntentsRef.current.get(postId);
        if (latestIntent && latestIntent.sequenceId !== currentIntentSequence) {
          return;
        }
        pendingLikeIntentsRef.current.delete(postId);

        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  isLiked: baseOriginalIsLiked,
                  likesCount: baseOriginalLikesCount,
                }
              : post
          )
        );
        setActiveDiscussionPost((prev) =>
          prev && prev.id === postId
            ? {
                ...prev,
                isLiked: baseOriginalIsLiked,
                likesCount: baseOriginalLikesCount,
              }
            : prev
        );
      }
    }, 350);
  }, [queryClient, currentUser]);

  const handleOpenLikersModal = React.useCallback(async (postId: string) => {
    setActiveLikersPostId(postId);

    // ⚡ Flush pending like debounce if user just liked/unliked right before opening the modal
    const existingTimer = likeDebounceTimersRef.current[postId];
    if (existingTimer) {
      clearTimeout(existingTimer);
      delete likeDebounceTimersRef.current[postId];
      const intent = pendingLikeIntentsRef.current.get(postId);
      if (intent) {
        pendingLikeIntentsRef.current.delete(postId);
        try {
          await setPostLikeAction(postId, intent.targetAction);
        } catch {
          // Error handled silently as optimistic UI already reacted
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.post.likers(postId) });
  }, [queryClient]);

  const handleToggleSave = async (post: PostFeedItem) => {
    setActiveMenuPostId(null);

    // 🔒 Self-Save Prohibition Rule
    if (post.isAuthor) {
      toast.error("You cannot save your own post.");
      return;
    }

    const previousIsSaved = post.isSaved;
    const nextIsSaved = !previousIsSaved;

    // ⚡ Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, isSaved: nextIsSaved } : p))
    );

    if (nextIsSaved) {
      toast.success("Post saved to your bookmarks.");
    } else {
      toast.success("Post removed from your bookmarks.");
    }

    try {
      const res = await toggleSavePostAction(post.id);
      if (!res.success) {
        // Rollback on server error
        setPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, isSaved: previousIsSaved } : p))
        );
        toast.error(res.error || "Unable to update bookmark.");
      } else if (res.data) {
        setPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, isSaved: res.data.isSaved } : p))
        );
      }
    } catch {
      // Rollback on network failure
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, isSaved: previousIsSaved } : p))
      );
      toast.error("Network error while saving post.");
    }
  };

  const handleHidePost = async (post: PostFeedItem) => {
    setActiveMenuPostId(null);

    // 🔒 Self-Hide Prohibition Rule
    if (post.isAuthor) {
      toast.error("You cannot hide your own post.");
      return;
    }

    // ⚡ Optimistic UI removal
    const originalPosts = posts;
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    toast.success("Post hidden from your feed.");

    try {
      const res = await hidePostAction(post.id);
      if (!res.success) {
        // Rollback on server error
        setPosts(originalPosts);
        toast.error(res.error || "Unable to hide post.");
      }
    } catch {
      // Rollback on network failure
      setPosts(originalPosts);
      toast.error("Network error while hiding post.");
    }
  };

  const handleCommentChange = (postId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }));
  };

  const handleSendComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || sendingComments[postId]) return;

    setSendingComments((prev) => ({ ...prev, [postId]: true }));

    // ⚡ Optimistic update: increment count and clear input immediately
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
        // Rollback on server error
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) }
              : p
          )
        );
        setCommentInputs((prev) => ({ ...prev, [postId]: text }));
        toast.error(res.error || "Unable to post comment. Please try again.");
      } else {
        toast.success("Comment submitted successfully.");
      }
    } catch {
      // Rollback on network error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) }
            : p
        )
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: text }));
      toast.error("Network connection error. Please check your connection.");
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
        isAnonymous: isAnonymous,
      });

      if (res.success && res.data) {
        setPosts((prev) => [res.data, ...prev]);
        setNewPostContent("");
        setIsAnonymous(false);
        setIsComposerOpen(false);
        toast.success(
          isAnonymous
            ? "Anonymous post published successfully."
            : "Post published successfully."
        );
      } else {
        toast.error(res.error || "Unable to publish post. Please try again.");
      }
    } catch {
      toast.error("An unexpected error occurred while publishing your post.");
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleOpenEdit = (post: PostFeedItem) => {
    setActiveMenuPostId(null);
    setEditingPost(post);
    setEditContent(post.content);
    setEditIsAnonymous(post.isAnonymous);
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
        setPosts((prev) =>
          prev.map((p) => (p.id === editingPost.id ? res.data : p))
        );
        setEditingPost(null);
        toast.success("Post updated successfully.");
      } else {
        toast.error(res.error || "Unable to update post. Please try again.");
      }
    } catch {
      toast.error("An unexpected error occurred while updating the post.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleOpenDelete = (post: PostFeedItem) => {
    setActiveMenuPostId(null);
    setDeletingPost(post);
  };

  const handleConfirmDeletePost = async () => {
    if (!deletingPost || isSubmittingDelete) return;

    const targetPostId = deletingPost.id;
    setIsSubmittingDelete(true);

    // Optimistic remove
    const originalPosts = posts;
    setPosts((prev) => prev.filter((p) => p.id !== targetPostId));
    setDeletingPost(null);

    try {
      const res = await deletePostAction(targetPostId);
      if (res.success) {
        toast.success("Post removed successfully.");
      } else {
        // Rollback on server error
        setPosts(originalPosts);
        toast.error(res.error || "Unable to remove post. Please try again.");
      }
    } catch {
      setPosts(originalPosts);
      toast.error("Network error while deleting post. Please try again.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.refresh();
      router.push("/");
    } catch {
      router.push("/");
    }
  };

  const [repostingPostId, setRepostingPostId] = useState<string | null>(null);

  const handleRepostPost = async (post: PostFeedItem) => {
    if (repostingPostId) return;

    const now = new Date();
    const isFirstTimeRepost = !post.repostedAt;
    const lastTimestamp = post.repostedAt ? new Date(post.repostedAt) : new Date(post.createdAt);
    const diffInHours = (now.getTime() - lastTimestamp.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      const remainingHours = Math.ceil(24 - diffInHours);
      if (isFirstTimeRepost) {
        toast.error("This post was recently published. You can repost it after 24 hours.");
      } else {
        toast.error(`This post was recently bumped. You can repost it again in ${remainingHours}h.`);
      }
      return;
    }

    setRepostingPostId(post.id);
    try {
      const res = await repostPostAction(post.id);
      if (res.success && res.data) {
        toast.success("Post reposted to top of campus feed.");
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
    <div className="min-h-screen bg-[#006241] text-white flex flex-col md:flex-row font-sans selection:bg-[#8CC497]/30 selection:text-white">
      {/* ========================================================================= */}
      {/* 🌲 LEFT SIDEBAR NAVIGATION */}
      {/* ========================================================================= */}
      <aside
        className={`bg-[#003F2A] border-b md:border-b-0 md:border-r border-[#005a3c]/60 shrink-0 md:sticky md:top-0 md:h-screen flex flex-col justify-between z-30 transition-all duration-300 ease-in-out ${
          isSidebarHidden
            ? "w-0 p-0 overflow-hidden opacity-0 border-none pointer-events-none"
            : "w-full md:w-64 lg:w-72 p-6 overflow-y-auto opacity-100 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        }`}
      >
        <div className="space-y-6">
          {/* User Profile Header & Collapse Toggle */}
          <div className="flex items-center justify-between gap-2 select-none pt-2">
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="flex items-center gap-3.5 overflow-hidden text-left cursor-pointer group hover:opacity-90 transition-opacity"
            >
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-[#002f1f] border-2 border-[#8CC497] overflow-hidden flex items-center justify-center shrink-0 shadow-md text-[#8CC497] font-black text-lg relative">
                {currentUser.avatarUrl ? (
                  <Image
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <span>{currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}</span>
                )}
              </div>
              <div className="overflow-hidden">
                <h2 className="font-extrabold text-sm lg:text-base text-white truncate tracking-tight font-heading group-hover:text-[#8CC497] transition-colors">
                  {currentUser.name}
                </h2>
                <p className="text-xs text-[#8CC497] font-medium tracking-wide">
                  {currentUser.studentId}
                </p>
              </div>
            </button>

            {/* Toggle Button to Hide Sidebar */}
            <button
              type="button"
              onClick={() => setIsSidebarHidden(true)}
              title="Hide Sidebar"
              className="p-1.5 rounded-lg hover:bg-[#006241] text-[#8CC497] hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          {/* ─── Sleek Divider Line between Avatar & Navigation ─── */}
          <hr className="border-t border-[#005a3c]/70 my-2" />

          {/* Navigation Links */}
          <nav className="space-y-2 font-medium">
            <button
              type="button"
              onClick={scrollToTop}
              className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-[#006241] font-extrabold bg-white shadow-md transition-all text-left cursor-pointer active:scale-98"
            >
              <Home className="w-5 h-5 text-[#006241] shrink-0" />
              <span className="text-sm lg:text-base font-bold">Home</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-emerald-100 hover:text-white hover:bg-[#006241]/60 transition-all text-left cursor-pointer"
            >
              <Bell className="w-5 h-5 text-[#8CC497] shrink-0" />
              <span className="text-sm lg:text-base">Notifications</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const isCurrentlySavedSort = sortBy === "Saved";
                setSortBy(isCurrentlySavedSort ? "ALL" : "Saved");
                scrollToTop();
              }}
              className={`w-full flex items-center gap-4 px-3.5 py-3 rounded-xl transition-all text-left cursor-pointer ${
                sortBy === "Saved"
                  ? "bg-[#006241] text-white font-bold shadow-inner"
                  : "text-emerald-100 hover:text-white hover:bg-[#006241]/60"
              }`}
            >
              <Bookmark className={`w-5 h-5 shrink-0 ${sortBy === "Saved" ? "text-[#8CC497] fill-[#8CC497]" : "text-[#8CC497]"}`} />
              <span className="text-sm lg:text-base">Bookmarks</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-emerald-100 hover:text-white hover:bg-[#006241]/60 transition-all text-left cursor-pointer"
            >
              <HelpCircle className="w-5 h-5 text-[#8CC497] shrink-0" />
              <span className="text-sm lg:text-base">Help</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-emerald-100 hover:text-white hover:bg-[#006241]/60 transition-all text-left cursor-pointer"
            >
              <Info className="w-5 h-5 text-[#8CC497] shrink-0" />
              <span className="text-sm lg:text-base">About</span>
            </button>
          </nav>
        </div>

        {/* Log Out Button */}
        <div className="pt-6 border-t border-[#005a3c]/70">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-emerald-100 hover:text-white hover:bg-rose-950/30 transition-all text-left cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-[#8CC497] shrink-0" />
            <span className="text-sm lg:text-base font-bold">Log out</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 🚀 MAIN CONTENT FEED AREA */}
      {/* ========================================================================= */}
      <main className="flex-1 p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8 relative">
        {/* Unhide Sidebar Floating Button */}
        {isSidebarHidden && (
          <button
            type="button"
            onClick={() => setIsSidebarHidden(false)}
            title="Open Sidebar"
            className="fixed top-6 left-6 z-40 p-2.5 rounded-xl bg-[#003F2A] hover:bg-[#004e34] border border-[#005a3c] text-white shadow-xl transition-all cursor-pointer flex items-center gap-2 hover:scale-105 active:scale-95 animate-fadeIn"
          >
            <PanelLeftOpen className="w-5 h-5 text-[#8CC497]" />
            <span className="text-xs font-bold hidden sm:inline">Show Sidebar</span>
          </button>
        )}
        {/* Welcome Banner Header */}
        <div className="space-y-1 select-none">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
            Welcome to <span className="text-[#8CC497]">Flamehub!</span>
          </h1>
          <p className="text-xs md:text-sm text-emerald-200/80 font-normal">
            We are not like the other <span className="text-[#eab308] font-bold">hub</span> you are thinking about!
          </p>
        </div>

        {/* ✍️ Post Composer Box */}
        <div
          style={{ borderRadius: "10px" }}
          className="w-full bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-4 md:p-5 shadow-xl"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#002f1f] border-2 border-[#8CC497] shrink-0 flex items-center justify-center text-[#8CC497] font-black text-lg shadow-inner relative overflow-hidden">
              {currentUser.avatarUrl ? (
                <Image
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <span>{currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="flex-1 text-left bg-[#002f1f]/80 hover:bg-[#002f1f] border border-[#8CC497]/30 hover:border-[#8CC497]/70 rounded-full px-5 py-3 text-xs md:text-sm text-[#8CC497]/80 hover:text-[#8CC497] transition-all cursor-pointer truncate shadow-inner"
            >
              Is there something you need to share?
            </button>
          </div>
        </div>

        {/* Feed Section Title & Filter Bar */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold font-heading text-white tracking-tight">
              Feed
            </h2>
            <p className="text-xs text-[#8CC497]/80">
              Make sure you have your <span className="font-semibold text-white/90">popcorn</span> ready!
            </p>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Filter Icon Badge */}
            <div
              style={{ borderRadius: "10px" }}
              className="h-[42px] w-[42px] rounded-[10px] bg-[#003F2A] border border-[#005a3c] text-[#8CC497] shrink-0 shadow-sm flex items-center justify-center"
            >
              <Filter className="w-4 h-4" />
            </div>

            {/* Bigger & Sleeker Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm h-[42px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8CC497]/70 pointer-events-none" />
              <input
                type="text"
                placeholder="Search posts, tags, campus..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ borderRadius: "10px" }}
                className="w-full h-[42px] bg-[#003F2A] border border-[#005a3c] rounded-[10px] pl-10 pr-4 text-xs sm:text-sm text-white placeholder-[#8CC497]/50 focus:outline-none focus:border-[#8CC497] shadow-sm transition-all"
              />
            </div>

            {/* Shared Custom Select: Sort */}
            <CustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val)}
              className="min-w-[145px] h-[42px]"
              options={[
                { value: "ALL", label: "All Posts" },
                { value: "Saved", label: "Bookmarks" },
                { value: "Controversial", label: "Controversial" },
                { value: "Latest", label: "Latest" },
                { value: "Most Liked", label: "Most Liked" },
              ]}
            />

            {/* Shared Custom Select: Department */}
            <CustomSelect
              value={selectedDept}
              onChange={(val) => setSelectedDept(val)}
              className="min-w-[160px] h-[42px]"
              options={[
                { value: "ALL", label: "All Departments" },
                { value: "CITE", label: "CITE" },
                { value: "CEA", label: "CEA" },
                { value: "CMA", label: "CMA" },
                { value: "CAHS", label: "CAHS" },
                { value: "CELA", label: "CELA" },
                { value: "CCJE", label: "CCJE" },
              ]}
            />
          </div>
        </div>

        {/* 📰 3-Column Post Cards Grid */}
        {isInitialLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        ) : filteredAndSortedPosts.length === 0 ? (
          <div
            style={{ borderRadius: "10px" }}
            className="bg-[#003F2A]/60 border border-[#005a3c] rounded-[10px] p-12 text-center space-y-4 shadow-xl"
          >
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto text-2xl">
              🔍
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white font-heading">No matching posts</h3>
              <p className="text-sm text-[#8CC497]/80">
                {searchQuery || selectedDept !== "ALL"
                  ? "Try tweaking your department filter or search query to find more posts."
                  : "Be the very first one to spark a conversation in your campus."}
              </p>
            </div>
            {(searchQuery || selectedDept !== "ALL" || sortBy !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDept("ALL");
                  setSortBy("ALL");
                  setSearchQuery("");
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[10px] bg-[#003F2A] hover:bg-[#004e34] border border-[#005a3c] text-white font-semibold text-xs transition-all cursor-pointer shadow-sm"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <motion.div layoutScroll className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout" initial={false}>
                {filteredAndSortedPosts.map((post) => (
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
                    className="bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-5 flex flex-col justify-between space-y-4 shadow-xl hover:border-[#8CC497]/60 hover:shadow-2xl transition-colors cursor-pointer group select-none"
                  >
                    {/* Card Header: Avatar + Author info */}
                    <div className="flex items-center gap-3">
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
                        <p className="text-[11px] text-[#8CC497] font-medium tracking-wide">
                          {post.isAnonymous && !post.isAuthor ? "Flame" : post.department}
                        </p>
                      </div>
                    </div>

                    {/* Card Content Text */}
                    <p className="text-xs sm:text-sm text-white/90 leading-relaxed min-h-[48px]">
                      {post.content}
                    </p>

                    {/* Action Bar */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Like Button with Floating Heart Pop Particle */}
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

                          {post.isAuthor && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRepostPost(post);
                              }}
                              disabled={repostingPostId === post.id}
                              className="p-1 text-white hover:scale-110 active:scale-95 transition-transform cursor-pointer group/repost"
                              title="Repost to top of feed (24h cooldown)"
                            >
                              <Repeat2
                                className={`w-5 h-5 transition-colors ${
                                  repostingPostId === post.id
                                    ? "text-emerald-400 animate-spin"
                                    : post.repostedAt
                                    ? "text-emerald-400 group-hover/repost:text-emerald-300"
                                    : "text-white group-hover/repost:text-[#8CC497]"
                                }`}
                              />
                            </button>
                          )}
                        </div>

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
                              {post.isAuthor && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleRepostPost(post)}
                                    disabled={repostingPostId === post.id}
                                    style={{ borderRadius: "10px" }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-200 hover:text-white hover:bg-emerald-950/50 rounded-[10px] transition-colors text-left cursor-pointer"
                                  >
                                    <Repeat2 className="w-4 h-4 text-emerald-400" />
                                    <span>Repost Post</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(post)}
                                    style={{ borderRadius: "10px" }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-100 hover:text-white hover:bg-[#004e34] rounded-[10px] transition-colors text-left cursor-pointer"
                                  >
                                    <Pencil className="w-4 h-4 text-[#8CC497]" />
                                    <span>Edit Post</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenDelete(post)}
                                    style={{ borderRadius: "10px" }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 rounded-[10px] transition-colors text-left cursor-pointer"
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
                                      post.isSaved
                                        ? "fill-[#8CC497] text-[#8CC497]"
                                        : "text-[#8CC497]"
                                    }`}
                                  />
                                  <span>{post.isSaved ? "Remove Bookmark" : "Bookmark Post"}</span>
                                </button>
                              )}

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
                                <Copy className="w-4 h-4 text-[#8CC497]" />
                                <span>Copy Link</span>
                              </button>

                              {!post.isAuthor && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleHidePost(post)}
                                    style={{ borderRadius: "10px" }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-amber-200 hover:text-amber-100 hover:bg-amber-950/40 rounded-[10px] transition-colors text-left cursor-pointer"
                                  >
                                    <EyeOff className="w-4 h-4 text-amber-400" />
                                    <span>Hide Post</span>
                                  </button>

                                  <div className="my-1 border-t border-[#005a3c]/60" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuPostId(null);
                                      toast.success("Report submitted to the moderation team.");
                                    }}
                                    style={{ borderRadius: "10px" }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 rounded-[10px] transition-colors text-left cursor-pointer"
                                  >
                                    <Flag className="w-4 h-4 text-rose-400" />
                                    <span>Report Post</span>
                                  </button>
                                </>
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
                              handleOpenLikersModal(post.id);
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

                      {/* 💬 Comment Input Box matching profile */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative flex items-center pt-0.5"
                      >
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentInputs[post.id] || ""}
                          onChange={(e) => handleCommentChange(post.id, e.target.value)}
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
                  </motion.article>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* 💀 Skeleton Loading Cards during Infinite Scroll */}
            {isLoadingMore && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
                <PostCardSkeleton />
                <PostCardSkeleton />
                <PostCardSkeleton />
              </div>
            )}

            {/* 🎯 Facebook-Style Auto Sentinel + Explicit Trigger Fallback */}
            {hasMore && !isLoadingMore && (
              <div className="pt-6 pb-2 text-center select-none flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLoadMore()}
                  className="px-6 py-2 rounded-full bg-[#003825] hover:bg-[#00472f] border border-[#005a3c] hover:border-[#94d3a2]/50 text-xs font-bold text-emerald-200 hover:text-white transition-all cursor-pointer shadow-xs"
                >
                  Load More Posts
                </button>
                <span className="text-[11px] text-emerald-200/50">or scroll down to auto-load</span>
              </div>
            )}

            {/* 🏁 End of Feed State */}
            {!hasMore && posts.length > 0 && (
              <div className="pt-8 pb-6 text-center select-none">
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#00432c]/80 border border-[#005a3c] text-xs font-semibold text-emerald-200/80 shadow-xs">
                  <span>🔥</span>
                  <span>You’re all caught up with all {posts.length} campus posts!</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 💬 POST CREATION MODAL */}
      {/* ========================================================================= */}
      {isComposerOpen && (
        <div
          onClick={() => setIsComposerOpen(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ borderRadius: "10px" }}
            className="w-full max-w-lg bg-[#003F2A] border border-[#005a3c] rounded-[10px] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#005a3c] pb-3">
              <h3 className="font-extrabold text-base text-white font-heading">
                Create Post
              </h3>
              <button
                type="button"
                disabled={isSubmittingPost}
                onClick={() => setIsComposerOpen(false)}
                className="text-white/60 hover:text-white text-sm font-bold cursor-pointer p-1 disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <textarea
                rows={4}
                autoFocus
                disabled={isSubmittingPost}
                placeholder="Share your campus thoughts or confessions..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="w-full bg-[#003825] border border-[#005a3c] rounded-xl p-3.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#94d3a2] transition-all resize-none disabled:opacity-60"
              />

              <div className="flex items-center justify-between pt-2">
                {/* 👻 Anonymous Mode Toggle Button */}
                <button
                  type="button"
                  disabled={isSubmittingPost}
                  onClick={() => setIsAnonymous((prev) => !prev)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none ${
                    isAnonymous
                      ? "bg-purple-950/80 text-purple-200 border border-purple-400/60 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                      : "bg-[#003825] text-emerald-200/80 border border-[#005a3c] hover:text-white hover:border-[#94d3a2]/50"
                  }`}
                >
                  {isAnonymous ? (
                    <>
                      <Ghost className="w-4 h-4 text-purple-300 animate-pulse" />
                      <span>Post as Anonymous</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 text-emerald-300" />
                      <span>Public Identity</span>
                    </>
                  )}
                </button>

                {/* 🚀 Submit Button */}
                <button
                  type="submit"
                  disabled={!newPostContent.trim() || isSubmittingPost}
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-emerald-50 text-[#006241] font-black text-xs uppercase tracking-wider shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmittingPost ? "POSTING..." : "POST"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ✏️ EDIT POST MODAL */}
      {/* ========================================================================= */}
      {editingPost && (
        <div
          onClick={() => setEditingPost(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ borderRadius: "10px" }}
            className="w-full max-w-lg bg-[#003F2A] border border-[#005a3c] rounded-[10px] p-6 shadow-2xl space-y-5"
          >
            {/* Header matching Bio & Profile Edit modals */}
            <div className="flex items-center justify-between border-b border-[#005a3c]/70 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-[10px] bg-[#002f1f] text-[#8CC497] border border-[#005a3c]">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white font-heading tracking-tight">
                    Edit Post
                  </h3>
                  <p className="text-xs text-[#8CC497]">Update your thoughts or identity</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmittingEdit}
                onClick={() => setEditingPost(null)}
                className="p-1.5 rounded-[10px] text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPost} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-white tracking-wide">
                  Post Content
                </label>
                <textarea
                  rows={4}
                  autoFocus
                  disabled={isSubmittingEdit}
                  placeholder="Edit your post content..."
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  style={{ borderRadius: "10px" }}
                  className="w-full bg-[#002f1f] border border-[#005a3c] rounded-[10px] p-3.5 text-xs sm:text-sm text-white placeholder-[#8CC497]/40 focus:outline-none focus:border-[#8CC497] transition-all resize-none leading-relaxed disabled:opacity-60"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#005a3c]/70">
                {/* 👻 Anonymous Mode Toggle Button for Edit */}
                <button
                  type="button"
                  disabled={isSubmittingEdit}
                  onClick={() => setEditIsAnonymous((prev) => !prev)}
                  style={{ borderRadius: "10px" }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-xs font-bold transition-all cursor-pointer select-none ${
                    editIsAnonymous
                      ? "bg-purple-950/80 text-purple-200 border border-purple-400/60 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                      : "bg-[#002f1f] text-[#8CC497] border border-[#005a3c] hover:text-white hover:border-[#8CC497]/60"
                  }`}
                >
                  {editIsAnonymous ? (
                    <>
                      <Ghost className="w-4 h-4 text-purple-300 animate-pulse" />
                      <span>Post as Anonymous</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 text-[#8CC497]" />
                      <span>Public Identity</span>
                    </>
                  )}
                </button>

                {/* 🚀 Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmittingEdit}
                    onClick={() => setEditingPost(null)}
                    style={{ borderRadius: "10px" }}
                    className="px-4 py-2.5 rounded-[10px] text-xs font-bold text-white hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!editContent.trim() || isSubmittingEdit}
                    style={{ borderRadius: "10px" }}
                    className="px-6 py-2.5 rounded-[10px] bg-white hover:bg-emerald-50 text-[#006241] font-black text-xs uppercase tracking-wider shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isSubmittingEdit ? "SAVING..." : "SAVE CHANGES"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🗑️ SHARED DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <ConfirmationModal
        isOpen={Boolean(deletingPost)}
        onClose={() => setDeletingPost(null)}
        onConfirm={handleConfirmDeletePost}
        title="Delete Post?"
        description="Are you sure you want to delete this post? This action is permanent and will also remove all discussions attached to it."
        previewText={deletingPost?.content}
        confirmText="DELETE"
        confirmLoadingText="DELETING..."
        isLoading={isSubmittingDelete}
        variant="danger"
      />

      {/* ========================================================================= */}
      {/* 💬 COMMENT THREAD & DISCUSSION DRAWER */}
      {/* ========================================================================= */}
      <CommentDrawerModal
        key={activeDiscussionPost?.id || "empty-modal"}
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
        onPostLikeToggled={(postId) => {
          handleToggleLike(postId);
        }}
        onEditPost={(p) => {
          setActiveDiscussionPost(null);
          handleOpenEdit(p);
        }}
        onDeletePost={(p) => {
          setActiveDiscussionPost(null);
          handleOpenDelete(p);
        }}
        onToggleSavePost={(p) => {
          handleToggleSave(p);
        }}
        onHidePost={(postId) => {
          setActiveDiscussionPost(null);
          setPosts((prev) => prev.filter((p) => p.id !== postId));
          toast.success("Post hidden from your feed");
        }}
      />

      {/* ========================================================================= */}
      {/* 💖 WHO LIKED THIS POST MODAL (With Shimmer Skeletons) */}
      {/* ========================================================================= */}
      <PostLikersModal
        key={activeLikersPostId || "empty-likers"}
        postId={activeLikersPostId}
        isOpen={Boolean(activeLikersPostId)}
        onClose={() => setActiveLikersPostId(null)}
      />
    </div>
  );
}
