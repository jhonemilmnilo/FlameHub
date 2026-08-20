"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface PostItem {
  id: string;
  authorName: string;
  department: string;
  studentId: string;
  content: string;
  likesCount: number;
  isLiked: boolean;
  commentsCount: number;
}

const INITIAL_POSTS: PostItem[] = [
  {
    id: "1",
    authorName: "Juan Dela Cruz",
    department: "CITE",
    studentId: "03-1819-034333",
    content: "Sana naman pansinin mo na ako. Matagal na akong nag-papapansin sa'yo.",
    likesCount: 45,
    isLiked: false,
    commentsCount: 12,
  },
  {
    id: "2",
    authorName: "Juan Dela Cruz",
    department: "CITE",
    studentId: "03-1819-034333",
    content: "Sana naman pansinin mo na ako. Matagal na akong nag-papapansin sa'yo.",
    likesCount: 45,
    isLiked: false,
    commentsCount: 12,
  },
  {
    id: "3",
    authorName: "Juan Dela Cruz",
    department: "CITE",
    studentId: "03-1819-034333",
    content: "Sana naman pansinin mo na ako. Matagal na akong nag-papapansin sa'yo.",
    likesCount: 45,
    isLiked: true,
    commentsCount: 12,
  },
  {
    id: "4",
    authorName: "Juan Dela Cruz",
    department: "CITE",
    studentId: "03-1819-034333",
    content: "Sana naman pansinin mo na ako. Matagal na akong nag-papapansin sa'yo.",
    likesCount: 45,
    isLiked: false,
    commentsCount: 12,
  },
  {
    id: "5",
    authorName: "Juan Dela Cruz",
    department: "CITE",
    studentId: "03-1819-034333",
    content: "Sana naman pansinin mo na ako. Matagal na akong nag-papapansin sa'yo.",
    likesCount: 45,
    isLiked: false,
    commentsCount: 12,
  },
  {
    id: "6",
    authorName: "Juan Dela Cruz",
    department: "CITE",
    studentId: "03-1819-034333",
    content: "Sana naman pansinin mo na ako. Matagal na akong nag-papapansin sa'yo.",
    likesCount: 45,
    isLiked: true,
    commentsCount: 12,
  },
];

interface HomeFeedDashboardProps {
  currentUser?: {
    name: string;
    studentId: string;
  };
}

export function HomeFeedDashboard({
  currentUser = {
    name: "Marcel Magbual",
    studentId: "03-2122-034361",
  },
}: HomeFeedDashboardProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<PostItem[]>(INITIAL_POSTS);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Controversial");
  const [selectedDept, setSelectedDept] = useState("CITE");
  const [newPostContent, setNewPostContent] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const handleToggleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const nextIsLiked = !post.isLiked;
          return {
            ...post,
            isLiked: nextIsLiked,
            likesCount: nextIsLiked ? post.likesCount + 1 : post.likesCount - 1,
          };
        }
        return post;
      })
    );
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

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const newPost: PostItem = {
      id: Date.now().toString(),
      authorName: currentUser.name,
      department: selectedDept || "CITE",
      studentId: currentUser.studentId,
      content: newPostContent.trim(),
      likesCount: 0,
      isLiked: false,
      commentsCount: 0,
    };

    setPosts((prev) => [newPost, ...prev]);
    setNewPostContent("");
    setIsComposerOpen(false);
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
      <aside className="w-full md:w-64 lg:w-72 bg-[#00432c] border-b md:border-b-0 md:border-r border-[#003825] shrink-0 md:sticky md:top-0 md:h-screen flex flex-col justify-between p-6 z-30">
        <div className="space-y-8">
          {/* User Profile Header */}
          <div className="flex items-center gap-3.5 select-none pt-2">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-white flex items-center justify-center shrink-0 shadow-md">
              {/* Optional user avatar image or clean white circle placeholder from mockup */}
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

          {/* Navigation Links */}
          <nav className="space-y-2 font-medium">
            <button
              type="button"
              className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-white font-bold bg-[#004e34]/80 shadow-sm transition-all text-left cursor-pointer"
            >
              <Home className="w-5 h-5 text-white shrink-0" />
              <span className="text-sm lg:text-base">Home</span>
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
      <main className="flex-1 p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
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
                onClick={() => setIsComposerOpen(false)}
                className="text-white/60 hover:text-white text-sm font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <textarea
                rows={4}
                autoFocus
                placeholder="Share your campus thoughts or confessions..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="w-full bg-[#003825] border border-[#005a3c] rounded-xl p-3.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#94d3a2] transition-all resize-none"
              />

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-200/80 font-semibold">Post to:</span>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="bg-[#003825] border border-[#005a3c] text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none font-bold"
                  >
                    <option value="CITE">CITE</option>
                    <option value="CEA">CEA</option>
                    <option value="CMA">CMA</option>
                    <option value="CAHS">CAHS</option>
                    <option value="CELA">CELA</option>
                    <option value="CCJE">CCJE</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsComposerOpen(false)}
                    className="px-4 py-2 rounded-full text-xs text-emerald-200 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-full bg-white hover:bg-emerald-50 text-[#006241] font-black text-xs uppercase tracking-wider shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    POST
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
