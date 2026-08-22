"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  X,
  Send,
  Heart,
  MoreHorizontal,
  ChevronDown,
  Ghost,
} from "lucide-react";
import {
  createCommentAction,
  getPostCommentsAction,
  type CommentFeedItem,
} from "@/features/feed/actions/comment.action";
import { type PostFeedItem } from "@/features/feed/actions/post.action";
import { toast } from "sonner";

interface CommentDrawerModalProps {
  post: PostFeedItem | null;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: (postId: string) => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "1d";
  }
}

export function CommentDrawerModal({
  post,
  isOpen,
  onClose,
  onCommentAdded,
}: CommentDrawerModalProps) {
  const [comments, setComments] = useState<CommentFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likedCommentIds, setLikedCommentIds] = useState<Record<string, boolean>>({});
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Fetch comments whenever the modal opens for a post
  useEffect(() => {
    if (!isOpen || !post) return;

    let isMounted = true;

    async function loadDiscussion() {
      setIsLoading(true);
      try {
        if (!post) return;
        const res = await getPostCommentsAction(post.id);
        if (isMounted) {
          if (res.success && res.data) {
            setComments(res.data);
          } else {
            toast.error(res.error || "Unable to load comments. Please try again.");
          }
        }
      } catch {
        if (isMounted) toast.error("Failed to load the discussion thread.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDiscussion();

    return () => {
      isMounted = false;
    };
  }, [isOpen, post]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !newCommentText.trim() || isSubmitting) return;

    const content = newCommentText.trim();
    setIsSubmitting(true);

    try {
      const res = await createCommentAction({
        postId: post.id,
        content,
        isAnonymous: false,
      });

      if (res.success && res.data) {
        setComments((prev) => [...prev, res.data]);
        setNewCommentText("");
        onCommentAdded?.(post.id);
        toast.success("Comment submitted successfully.");
        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        toast.error(res.error || "Unable to post comment. Please try again.");
      }
    } catch {
      toast.error("An unexpected error occurred while posting your comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCommentLike = (commentId: string) => {
    setLikedCommentIds((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  if (!isOpen || !post) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-xl bg-[#00472f] border border-[#005a3c] rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150 relative"
      >
        {/* Close Button Header overlay */}
        <div className="absolute top-4 right-4 z-20">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close discussion"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5 [scrollbar-width:thin] [scrollbar-color:#005a3c_transparent]">
          {/* ========================================================================= */}
          {/* 📰 ORIGINAL POST RECAP (Matching Mockup Top Header) */}
          {/* ========================================================================= */}
          <div className="space-y-3 pt-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#8CC497] shrink-0 shadow-sm" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight font-heading">
                    {post.isAnonymous ? "Anonymous" : post.authorName}{" "}
                    <span className="font-semibold text-emerald-200/90">
                      | {post.isAnonymous ? "Flame" : post.department}
                    </span>
                  </h3>
                  <p className="text-xs text-emerald-200/70 font-medium">
                    {post.isAnonymous ? "Hidden ID" : post.studentId}
                  </p>
                </div>
              </div>

              <div className="text-white/40 pr-8">
                <MoreHorizontal className="w-5 h-5" />
              </div>
            </div>

            <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-normal">
              {post.content}
            </p>

            {/* Post Meta Row (Likes & Comments Count) */}
            <div className="flex items-center justify-between text-xs text-white/80 font-medium pt-1">
              <div className="flex items-center gap-1.5 text-white/90">
                <Heart className={`w-3.5 h-3.5 ${post.isLiked ? "fill-rose-500 text-rose-500" : "text-white/70"}`} />
                <span>{post.likesCount} {post.likesCount === 1 ? "like" : "likes"}</span>
              </div>
              <span className="text-white/80">
                {post.commentsCount} {post.commentsCount === 1 ? "comment" : "comments"}
              </span>
            </div>

            <hr className="border-t border-[#005a3c]/80 pt-1" />
          </div>

          {/* ========================================================================= */}
          {/* 🔽 TOP COMMENTS DROPDOWN LABEL */}
          {/* ========================================================================= */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-white tracking-tight cursor-pointer select-none">
            <span>Top comments</span>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-300" />
          </div>

          {/* ========================================================================= */}
          {/* 💬 COMMENTS LIST (Green Nested Bubble Cards with Reaction & Reply) */}
          {/* ========================================================================= */}
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#8CC497] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#8CC497]/70 font-medium">
                Loading campus comments...
              </p>
            </div>
          ) : comments.length === 0 ? (
            <div
              style={{ borderRadius: "10px" }}
              className="py-10 text-center space-y-2 bg-[#002f1f]/50 border border-[#005a3c] rounded-[10px] p-6 shadow-sm"
            >
              <p className="text-xs font-semibold text-white/90">No comments yet.</p>
              <p className="text-[11px] text-[#8CC497]/70">
                Be the first to share your thoughts below!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {comments.map((comment) => {
                const isCommentLiked = Boolean(likedCommentIds[comment.id]);
                const commentLikes = (comment.likesCount || 0) + (isCommentLiked ? 1 : 0);

                return (
                  <div
                    key={comment.id}
                    style={{ borderRadius: "10px" }}
                    className="bg-[#002f1f] border border-[#005a3c] rounded-[10px] px-3.5 py-2.5 space-y-1.5 transition-all shadow-xs"
                  >
                    {/* Compact Comment Header with Heart Button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-black text-xs relative overflow-hidden shadow-xs ${
                            comment.isAnonymous && !comment.isAuthor
                              ? "bg-purple-950/80 border border-purple-500/40 text-purple-300"
                              : "bg-[#003F2A] border border-[#8CC497] text-[#8CC497]"
                          }`}
                        >
                          {comment.isAnonymous && !comment.isAuthor ? (
                            <Ghost className="w-4 h-4 text-purple-300" />
                          ) : comment.authorAvatarUrl ? (
                            <Image
                              src={comment.authorAvatarUrl}
                              alt={comment.authorName}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <span>{comment.authorName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs sm:text-[13px] text-white tracking-tight font-heading leading-tight">
                            {comment.authorName}{" "}
                            <span className="font-medium text-[#8CC497] text-[11px]">
                              | {comment.isAnonymous && !comment.isAuthor ? "Flame" : comment.department}
                            </span>
                          </h4>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleCommentLike(comment.id)}
                        className="p-1 text-white/60 hover:text-white transition-colors cursor-pointer"
                      >
                        <Heart
                          className={`w-4.5 h-4.5 transition-colors ${
                            isCommentLiked
                              ? "fill-[#f43f5e] text-[#f43f5e]"
                              : "text-[#f43f5e]/80 hover:text-[#f43f5e]"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Compact Comment Body Text */}
                    <p className="text-xs text-white/90 leading-snug pl-10.5 font-normal">
                      {comment.content}
                    </p>

                    {/* Compact Comment Action Footer (Timestamp, Likes, Reply, 3 Dots) */}
                    <div className="flex items-center justify-between pl-10.5 pt-0.5 text-[10px] text-emerald-200/60 font-medium">
                      <div className="flex items-center gap-2.5">
                        <span>{formatRelativeTime(comment.createdAt)}</span>
                        <span>{commentLikes} {commentLikes === 1 ? "like" : "likes"}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewCommentText(`@${comment.isAnonymous ? "Anonymous" : comment.authorName} `);
                          }}
                          className="font-bold text-white/80 hover:text-white cursor-pointer transition-colors"
                        >
                          Reply
                        </button>
                      </div>

                      <button
                        type="button"
                        className="text-white/40 hover:text-white cursor-pointer transition-colors p-0.5"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* View Replies Mock Trigger */}
                    {Boolean(comment.commentCounts && comment.commentCounts > 0) && (
                      <div className="pl-10.5 pt-0.5">
                        <button
                          type="button"
                          className="text-[10px] font-bold text-white/70 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>View replies ({comment.commentCounts})</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={commentsEndRef} />
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ✍️ BOTTOM COMMENT COMPOSER (Matching Mockup with Teal/Cyan Border & Send) */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 border-t border-[#005a3c]/80 bg-[#00472f]/90 shrink-0">
          <form onSubmit={handleSendComment} className="relative flex items-center">
            <input
              type="text"
              placeholder="Add a comment..."
              value={newCommentText}
              maxLength={1000}
              disabled={isSubmitting}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="w-full bg-[#003825] border border-[#2dd4bf]/60 hover:border-[#2dd4bf] focus:border-[#2dd4bf] rounded-full pl-5 pr-14 py-3 text-xs sm:text-sm text-white placeholder-emerald-200/50 focus:outline-none transition-all shadow-sm"
            />

            <button
              type="submit"
              disabled={!newCommentText.trim() || isSubmitting}
              className="absolute right-2.5 p-2 rounded-full text-[#2dd4bf] hover:text-white hover:bg-white/10 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed group"
              title="Send comment"
            >
              <Send
                className={`w-4 h-4 transition-transform duration-200 ${
                  isSubmitting ? "rotate-0 scale-110" : "rotate-45 group-hover:scale-110"
                }`}
              />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
