"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Ghost,
  UserCheck,
  MessageCircle,
  Clock,
  Heart,
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

export function CommentDrawerModal({
  post,
  isOpen,
  onClose,
  onCommentAdded,
}: CommentDrawerModalProps) {
  const [comments, setComments] = useState<CommentFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
            toast.error(res.error || "Could not load comments.");
          }
        }
      } catch {
        if (isMounted) toast.error("Failed to fetch discussion.");
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
        isAnonymous,
      });

      if (res.success && res.data) {
        setComments((prev) => [...prev, res.data]);
        setNewCommentText("");
        onCommentAdded?.(post.id);
        toast.success(
          isAnonymous
            ? "Anonymous comment published!"
            : "Comment published!"
        );
        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        toast.error(res.error || "Failed to post comment.");
      }
    } catch {
      toast.error("Something went wrong while posting your comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !post) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#003825] border border-[#005a3c] sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col h-[85vh] sm:h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#005a3c] bg-[#003422]/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-5 h-5 text-[#94d3a2]" />
            <h2 className="font-bold text-base text-white font-heading">
              Discussion ({comments.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close discussion"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content (Original Post Recap + Comment List) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 [scrollbar-width:thin] [scrollbar-color:#005a3c_transparent]">
          {/* Post Snapshot Header Card */}
          <div className="bg-[#00472f]/80 border border-[#005a3c] rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#94d3a2] shrink-0" />
              <div className="overflow-hidden">
                <h3 className="font-bold text-xs sm:text-sm text-white truncate">
                  {post.isAnonymous ? "Anonymous" : post.authorName}{" "}
                  <span className="font-medium text-emerald-200/80">
                    | {post.isAnonymous ? "Flame" : post.department}
                  </span>
                </h3>
                <p className="text-[11px] text-emerald-200/60 font-medium">
                  {post.isAnonymous ? "Hidden ID" : post.studentId}
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed pl-1">
              {post.content}
            </p>
          </div>

          <div className="border-t border-[#005a3c]/60 my-2" />

          {/* Comments List */}
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#94d3a2] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-emerald-200/70 font-medium">
                Loading campus thoughts...
              </p>
            </div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-xl">
                💬
              </div>
              <h4 className="text-sm font-bold text-white">No comments yet</h4>
              <p className="text-xs text-emerald-200/60 max-w-xs mx-auto">
                Be the first to share your thoughts and start the conversation!
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-[#00472f]/60 hover:bg-[#00472f] border border-[#005a3c] rounded-xl p-3.5 space-y-2 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded-full bg-[#94d3a2]/80 shrink-0" />
                      <div className="overflow-hidden">
                        <span className="font-bold text-xs text-white truncate block">
                          {comment.isAnonymous ? "Anonymous" : comment.authorName}{" "}
                          <span className="font-medium text-emerald-200/80">
                            | {comment.isAnonymous ? "Flame" : comment.department}
                          </span>
                        </span>
                        <span className="text-[10px] text-emerald-200/50 block">
                          {comment.isAnonymous ? "Hidden ID" : comment.studentId}
                        </span>
                      </div>
                    </div>

                    <time
                      dateTime={comment.createdAt}
                      suppressHydrationWarning
                      className="text-[10px] text-emerald-200/60 shrink-0 flex items-center gap-1"
                    >
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(comment.createdAt)}
                    </time>
                  </div>

                  <p className="text-xs sm:text-sm text-white/95 leading-relaxed pl-1">
                    {comment.content}
                  </p>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
          )}
        </div>

        {/* Comment Input Composer (Footer) */}
        <form
          onSubmit={handleSendComment}
          className="p-4 border-t border-[#005a3c] bg-[#003422] space-y-3 shrink-0"
        >
          <div className="flex items-center justify-between">
            {/* Anonymous Mode Switch */}
            <button
              type="button"
              onClick={() => setIsAnonymous((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer select-none ${
                isAnonymous
                  ? "bg-purple-950/80 text-purple-200 border border-purple-400/60 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                  : "bg-[#00472f] text-emerald-200/80 border border-[#005a3c] hover:text-white"
              }`}
            >
              {isAnonymous ? (
                <>
                  <Ghost className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
                  <span>Anonymous</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Public</span>
                </>
              )}
            </button>
            <span className="text-[11px] text-emerald-200/50">
              {newCommentText.length}/1000
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              autoFocus
              placeholder={
                isAnonymous
                  ? "Write an anonymous comment..."
                  : "Write your thoughts on this..."
              }
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-[#002b1c] border border-[#005a3c] rounded-xl pl-4 pr-12 py-2.5 text-xs sm:text-sm text-white placeholder-emerald-200/40 focus:outline-none focus:border-[#94d3a2]/80 shadow-inner transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim() || isSubmitting}
              className="absolute right-2 p-1.5 rounded-lg bg-emerald-700/50 hover:bg-emerald-600/80 text-emerald-200 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Post Comment"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
