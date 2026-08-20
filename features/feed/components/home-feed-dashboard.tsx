"use client";

import React, { useState, useEffect } from "react";
import {
  Home,
  Bell,
  HelpCircle,
  Info,
  LogOut,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Filter,
  Search,
  ChevronDown,
  UserCheck,
  Ghost,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { createPostAction, getFeedPostsAction, type PostFeedItem } from "@/features/feed/actions/post.action";
import { toggleLikePostAction } from "@/features/feed/actions/post.liked.action";
import { toast } from "sonner";

interface HomeFeedDashboardProps {
  currentUser?: {
    name: string;
    studentId: string;
  };
  initialPosts?: PostFeedItem[];
  initialNextCursor?: string | null;
  initialHasMore?: boolean;
}

// 💀 High-End Shimmer Skeleton Card Component
function PostCardSkeleton() {
  return (
    <div className="bg-[#00472f]/80 border border-[#005a3c] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-white/15 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 bg-white/20 rounded-md w-3/5" />
          <div className="h-2.5 bg-white/10 rounded-md w-2/5" />
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
        <div className="h-2.5 bg-white/10 rounded-md w-1/4" />
        <div className="h-8 bg-white/10 rounded-full w-full" />
      </div>
    </div>
  );
}

export function HomeFeedDashboard({
  currentUser = {
    name: "Marcel Magbual",
    studentId: "03-2122-034361",
  },
  initialPosts = [],
  initialNextCursor = null,
  initialHasMore = false,
}: HomeFeedDashboardProps) {
  const router = useRouter();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Controversial");
  const [selectedDept, setSelectedDept] = useState("CITE");
  const [newPostContent, setNewPostContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);

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

  const handleToggleLike = async (postId: string) => {
    // ⚡ Optimistic UI Update (Instant visual feedback)
    const targetPost = posts.find((p) => p.id === postId);
    if (!targetPost) return;

    const previousIsLiked = targetPost.isLiked;
    const previousLikesCount = targetPost.likesCount;
    const nextIsLiked = !previousIsLiked;
    const nextLikesCount = nextIsLiked ? previousLikesCount + 1 : Math.max(0, previousLikesCount - 1);

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

    // 🔒 Sync to Database with Rollback on failure
    try {
      const res = await toggleLikePostAction(postId);
      if (!res.success) {
        // Rollback on server error
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  isLiked: previousIsLiked,
                  likesCount: previousLikesCount,
                }
              : post
          )
        );
        toast.error(res.error || "Failed to update like.");
      }
    } catch {
      // Rollback on network failure
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked: previousIsLiked,
                likesCount: previousLikesCount,
              }
            : post
        )
      );
    }
  };

  const handleCommentChange = (postId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }));
  };

  const handleSendComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
    );
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
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
            ? "Anonymous post published secretly! 👻"
            : "Post published successfully! 🎉"
        );
      } else {
        toast.error(res.error || "Failed to create post.");
      }
    } catch {
      toast.error("Something went wrong while publishing your post.");
    } finally {
      setIsSubmittingPost(false);
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

  return (
    <div className="min-h-screen bg-[#004e34] text-white flex flex-col md:flex-row font-sans selection:bg-[#22c55e]/30 selection:text-white">
      {/* ========================================================================= */}
      {/* 🌲 LEFT SIDEBAR NAVIGATION */}
      {/* ========================================================================= */}
      <aside
        className={`bg-[#00432c] border-b md:border-b-0 md:border-r border-[#003825] shrink-0 md:sticky md:top-0 md:h-screen flex flex-col justify-between z-30 transition-all duration-300 ease-in-out ${
          isSidebarHidden
            ? "w-0 p-0 overflow-hidden opacity-0 border-none pointer-events-none"
            : "w-full md:w-64 lg:w-72 p-6 overflow-y-auto opacity-100 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        }`}
      >
        <div className="space-y-6">
          {/* User Profile Header & Collapse Toggle */}
          <div className="flex items-center justify-between gap-2 select-none pt-2">
            <div className="flex items-center gap-3.5 overflow-hidden">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-white flex items-center justify-center shrink-0 shadow-md">
                {/* Optional user avatar image */}
              </div>
              <div className="overflow-hidden">
                <h2 className="font-extrabold text-sm lg:text-base text-white truncate tracking-tight font-heading">
                  {currentUser.name}
                </h2>
                <p className="text-xs text-emerald-200/70 font-medium tracking-wide">
                  {currentUser.studentId}
                </p>
              </div>
            </div>

            {/* Toggle Button to Hide Sidebar */}
            <button
              type="button"
              onClick={() => setIsSidebarHidden(true)}
              title="Hide Sidebar"
              className="p-1.5 rounded-lg hover:bg-[#004e34] text-emerald-300/80 hover:text-white transition-colors cursor-pointer shrink-0"
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
              className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-[#004e34] font-extrabold bg-white shadow-md transition-all text-left cursor-pointer active:scale-98"
            >
              <Home className="w-5 h-5 text-[#004e34] shrink-0" />
              <span className="text-sm lg:text-base font-bold">Home</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-emerald-100/80 hover:text-white hover:bg-[#004e34]/50 transition-all text-left cursor-pointer"
            >
              <Bell className="w-5 h-5 text-emerald-300 shrink-0" />
              <span className="text-sm lg:text-base">Notifications</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-emerald-100/80 hover:text-white hover:bg-[#004e34]/50 transition-all text-left cursor-pointer"
            >
              <HelpCircle className="w-5 h-5 text-emerald-300 shrink-0" />
              <span className="text-sm lg:text-base">Help</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-emerald-100/80 hover:text-white hover:bg-[#004e34]/50 transition-all text-left cursor-pointer"
            >
              <Info className="w-5 h-5 text-emerald-300 shrink-0" />
              <span className="text-sm lg:text-base">About</span>
            </button>
          </nav>
        </div>

        {/* Log Out Button */}
        <div className="pt-6 border-t border-[#003825]">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-emerald-100/80 hover:text-white hover:bg-rose-950/30 transition-all text-left cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-emerald-300 shrink-0" />
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
            className="fixed top-6 left-6 z-40 p-2.5 rounded-xl bg-[#00432c] hover:bg-[#005a3c] border border-[#005a3c] text-white shadow-xl transition-all cursor-pointer flex items-center gap-2 hover:scale-105 active:scale-95 animate-fadeIn"
          >
            <PanelLeftOpen className="w-5 h-5 text-emerald-300" />
            <span className="text-xs font-bold hidden sm:inline">Show Sidebar</span>
          </button>
        )}
        {/* Welcome Banner Header */}
        <div className="space-y-1 select-none">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
            Welcome to <span className="text-white">Flamehub!</span>
          </h1>
          <p className="text-xs md:text-sm text-emerald-200/80 font-normal">
            We are not like the other <span className="text-[#eab308] font-bold">hub</span> you are thinking about!
          </p>
        </div>

        {/* ✍️ Post Composer Box (Exactly as Mockup with light-mint avatar + rounded border) */}
        <div className="w-full bg-[#00472f] border border-[#005a3c] rounded-2xl p-4 md:p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#94d3a2] shrink-0" />
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="flex-1 text-left bg-transparent border border-[#94d3a2]/40 hover:border-[#94d3a2]/80 rounded-full px-5 py-3 text-xs md:text-sm text-emerald-100/60 transition-all cursor-pointer truncate"
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
            <p className="text-xs text-emerald-200/70">
              Make sure you have your <span className="font-semibold text-white/90">popcorn</span> ready!
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* Filter Icon */}
            <div className="p-2 rounded-lg bg-[#00472f] border border-[#005a3c] text-emerald-300 shrink-0">
              <Filter className="w-4 h-4" />
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300/60" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#00472f] border border-[#005a3c] rounded-lg pl-8 pr-3.5 py-1.5 text-xs text-white placeholder-emerald-200/40 focus:outline-none focus:border-[#94d3a2]/60 transition-all"
              />
            </div>

            {/* Sort Dropdown: Controversial */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-[#00472f] border border-[#005a3c] text-white text-xs font-semibold rounded-lg pl-3.5 pr-8 py-1.5 cursor-pointer focus:outline-none focus:border-[#94d3a2]/60 transition-all"
              >
                <option value="Controversial">Controversial</option>
                <option value="Latest">Latest</option>
                <option value="Most Liked">Most Liked</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-300 pointer-events-none" />
            </div>

            {/* Department Dropdown: CITE */}
            <div className="relative">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="appearance-none bg-[#00472f] border border-[#005a3c] text-white text-xs font-semibold rounded-lg pl-3.5 pr-8 py-1.5 cursor-pointer focus:outline-none focus:border-[#94d3a2]/60 transition-all"
              >
                <option value="CITE">CITE</option>
                <option value="CEA">CEA</option>
                <option value="CMA">CMA</option>
                <option value="CAHS">CAHS</option>
                <option value="CELA">CELA</option>
                <option value="CCJE">CCJE</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-300 pointer-events-none" />
            </div>
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
        ) : posts.length === 0 ? (
          <div className="bg-[#00472f]/60 border border-[#005a3c] rounded-2xl p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto text-2xl">
              ✍️
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white font-heading">No posts yet!</h3>
              <p className="text-sm text-emerald-200/70">
                Be the very first one to spark a conversation in your campus.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-emerald-50 text-[#006241] font-bold text-xs uppercase tracking-wider shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              Create First Post
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-[#00472f] border border-[#005a3c] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-[#94d3a2]/40 transition-all"
                >
                  {/* Card Header: Avatar + Author info */}
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#94d3a2] shrink-0" />
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-xs sm:text-sm text-white truncate">
                        {post.authorName} <span className="font-medium text-emerald-200/80">| {post.department}</span>
                      </h3>
                      <p className="text-[11px] text-emerald-200/60 font-medium">
                        {post.studentId}
                      </p>
                    </div>
                  </div>

                  {/* Card Content Text */}
                  <p className="text-xs sm:text-sm text-white/90 leading-relaxed min-h-[48px]">
                    {post.content}
                  </p>

                  {/* Action Bar (Heart, Comment Icon, 3-dots) */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Like Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleLike(post.id)}
                          className="p-1 -ml-1 text-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                        >
                          <Heart
                            className={`w-5 h-5 transition-colors ${
                              post.isLiked
                                ? "fill-rose-500 text-rose-500"
                                : "text-white/80 hover:text-white"
                            }`}
                          />
                        </button>

                        {/* Comment Icon */}
                        <button
                          type="button"
                          className="p-1 text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                        >
                          <MessageCircle className="w-5 h-5" />
                        </button>
                      </div>

                      {/* 3 Dots Menu */}
                      <button
                        type="button"
                        className="p-1 text-white/60 hover:text-white transition-colors cursor-pointer"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Likes count & View all comments */}
                    <div className="flex items-center justify-between text-[11px] text-white/80 font-medium">
                      <span>{post.likesCount} likes</span>
                      <button
                        type="button"
                        className="text-emerald-200/60 hover:text-white transition-colors cursor-pointer text-[11px]"
                      >
                        View all comments
                      </button>
                    </div>

                    {/* Inline Comment Input Box with Send Button */}
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={commentInputs[post.id] || ""}
                        onChange={(e) => handleCommentChange(post.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSendComment(post.id);
                        }}
                        className="w-full bg-[#003825] border border-[#005a3c] rounded-full pl-3.5 pr-10 py-1.5 text-xs text-white placeholder-emerald-200/40 focus:outline-none focus:border-[#94d3a2]/70 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendComment(post.id)}
                        className="absolute right-2 text-emerald-300 hover:text-white p-1 transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-[#00432c] border border-[#005a3c] rounded-2xl p-6 shadow-2xl space-y-4">
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
    </div>
  );
}
