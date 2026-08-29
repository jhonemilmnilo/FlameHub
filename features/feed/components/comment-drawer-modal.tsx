"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  MoreHorizontal,
  ChevronDown,
  Ghost,
  Pencil,
  Trash2,
  Link2,
  Bookmark,
  EyeOff,
  Loader2,
} from "lucide-react";
import { SendHorizontalIcon, type SendHorizontalIconHandle } from "@animateicons/react/lucide";
import {
  createCommentAction,
  getPostCommentsAction,
  type CommentFeedItem,
} from "@/features/feed/actions/comment.action";
import { type PostFeedItem } from "@/features/feed/actions/post.action";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface CommentDrawerModalProps {
  post: PostFeedItem | null;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: (postId: string) => void;
  onPostLikeToggled?: (postId: string) => void;
  onEditPost?: (post: PostFeedItem) => void;
  onDeletePost?: (post: PostFeedItem) => void;
  onToggleSavePost?: (post: PostFeedItem) => void;
  onHidePost?: (postId: string) => void;
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
  onPostLikeToggled,
  onEditPost,
  onDeletePost,
  onToggleSavePost,
  onHidePost,
}: CommentDrawerModalProps) {
  const [comments, setComments] = useState<CommentFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likedCommentIds, setLikedCommentIds] = useState<Record<string, boolean>>({});
  const isPostLiked = Boolean(post?.isLiked);
  const postLikesCount = post?.likesCount ?? 0;
  const [newlyAddedCount, setNewlyAddedCount] = useState(0);
  const displayCommentsCount = (post?.commentsCount ?? 0) + newlyAddedCount;
  const sendIconRef = useRef<SendHorizontalIconHandle>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [postHeartBurstKey, setPostHeartBurstKey] = useState<number | null>(null);
  const [commentHeartBursts, setCommentHeartBursts] = useState<Record<string, number>>({});
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Click outside menu listener
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-comment-post-menu]")) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [isMenuOpen]);

  const handleTogglePostLike = () => {
    if (!post) return;
    if (!isPostLiked) {
      setPostHeartBurstKey(Date.now());
    }
    onPostLikeToggled?.(post.id);
  };

  // Fetch comments ONLY when the modal opens or the active post ID changes
  useEffect(() => {
    if (!isOpen || !post?.id) return;

    let isMounted = true;
    const currentPostId = post.id;

    async function loadDiscussion() {
      setIsLoading(true);
      try {
        const res = await getPostCommentsAction(currentPostId);
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
  }, [isOpen, post?.id]);

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
    sendIconRef.current?.startAnimation();

    try {
      const res = await createCommentAction({
        postId: post.id,
        content,
        isAnonymous: false,
      });

      if (res.success && res.data) {
        setComments((prev) => [...prev, res.data]);
        setNewCommentText("");
        setNewlyAddedCount((prev) => prev + 1);
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
    setLikedCommentIds((prev) => {
      const willBeLiked = !prev[commentId];
      if (willBeLiked) {
        setCommentHeartBursts((bPrev) => ({ ...bPrev, [commentId]: Date.now() }));
      }
      return {
        ...prev,
        [commentId]: willBeLiked,
      };
    });
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
        className="w-full max-w-xl bg-[#006241] border border-[#007a52] rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150 relative"
      >
        {/* ========================================================================= */}
        {/* 📰 STICKY TOP POST RECAP & HEADER (Fixed & Compact) */}
        {/* ========================================================================= */}
        <div className="px-5 pt-4 pb-2.5 shrink-0 border-b border-[#007a52]/70 bg-[#006241] space-y-2.5">
          {/* Top Post Recap Header */}
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                {!post.isAuthor && !post.isAnonymous && post.authorId ? (
                  <Link
                    href={`/profile/${post.authorId}`}
                    onClick={onClose}
                    className="flex items-center gap-3.5 group/recap min-w-0"
                    title={`View ${post.authorName}'s profile`}
                  >
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full shrink-0 flex items-center justify-center font-black text-sm relative overflow-hidden shadow-inner bg-[#002f1f] border-2 border-[#8CC497] text-[#8CC497] group-hover/recap:border-white group-hover/recap:scale-105 transition-all">
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
                      <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight font-heading flex items-center gap-1.5 truncate group-hover/recap:text-[#8CC497] group-hover/recap:underline transition-colors">
                        <span>{post.authorName}</span>
                        {post.authorNickname && (
                          <span className="text-[#8CC497] font-semibold text-xs sm:text-sm">
                            | @{post.authorNickname}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-[#8CC497] font-medium tracking-wide flex items-center gap-1.5">
                        <span>{post.department}</span>
                        <span className="text-[#8CC497]/40">•</span>
                        <span className="text-[#8CC497]/70">
                          {post.repostedAt ? `Reposted ${formatRelativeTime(post.repostedAt)}` : formatRelativeTime(post.createdAt)}
                        </span>
                        {post.isEdited && (
                          <>
                            <span className="text-[#8CC497]/40">•</span>
                            <span className="text-[10px] text-[#8CC497]/70 font-normal italic">Edited</span>
                          </>
                        )}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3.5 min-w-0 cursor-default select-none">
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full shrink-0 flex items-center justify-center font-black text-sm relative overflow-hidden shadow-inner ${
                        post.isAnonymous && !post.isAuthor
                          ? "bg-purple-950/80 border border-purple-500/40 text-purple-300"
                          : "bg-[#002f1f] border-2 border-[#8CC497] text-[#8CC497]"
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
                      <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight font-heading flex items-center gap-1.5 truncate">
                        <span>{post.authorName}</span>
                        {post.authorNickname && (
                          <span className="text-[#8CC497] font-semibold text-xs sm:text-sm">
                            | @{post.authorNickname}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-[#8CC497] font-medium tracking-wide flex items-center gap-1.5">
                        <span>{post.isAnonymous && !post.isAuthor ? "Flame" : post.department}</span>
                        <span className="text-[#8CC497]/40">•</span>
                        <span className="text-[#8CC497]/70">
                          {post.repostedAt ? `Reposted ${formatRelativeTime(post.repostedAt)}` : formatRelativeTime(post.createdAt)}
                        </span>
                        {post.isEdited && (
                          <>
                            <span className="text-[#8CC497]/40">•</span>
                            <span className="text-[10px] text-[#8CC497]/70 font-normal italic">Edited</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 3-Dots More Options Menu */}
              <div className="relative" data-comment-post-menu>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen((prev) => !prev);
                  }}
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="More options"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                {isMenuOpen && (
                  <div
                    style={{ borderRadius: "10px" }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1 w-48 bg-[#002f1f] border border-[#005a3c] rounded-[10px] shadow-2xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
                  >
                    {/* Author Only Actions */}
                    {post.isAuthor && (
                      <>
                        {!post.isEdited && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsMenuOpen(false);
                              onEditPost?.(post);
                            }}
                            style={{ borderRadius: "10px" }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#8CC497] hover:text-white hover:bg-[#004e34] rounded-[10px] transition-colors text-left cursor-pointer"
                          >
                            <Pencil className="w-4 h-4 text-[#8CC497]" />
                            <span>Edit Post</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onDeletePost?.(post);
                          }}
                          style={{ borderRadius: "10px" }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-[10px] transition-colors text-left cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-rose-400" />
                          <span>Delete Post</span>
                        </button>
                        <div className="h-px bg-[#005a3c]/60 my-1" />
                      </>
                    )}

                    {/* Common / Viewer Actions */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (typeof window !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success("Post link copied to clipboard!");
                        }
                      }}
                      style={{ borderRadius: "10px" }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-100 hover:text-white hover:bg-[#004e34] rounded-[10px] transition-colors text-left cursor-pointer"
                    >
                      <Link2 className="w-4 h-4 text-[#8CC497]" />
                      <span>Copy link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onToggleSavePost?.(post);
                      }}
                      style={{ borderRadius: "10px" }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-100 hover:text-white hover:bg-[#004e34] rounded-[10px] transition-colors text-left cursor-pointer"
                    >
                      <Bookmark className={`w-4 h-4 ${post.isSaved ? "fill-[#8CC497] text-[#8CC497]" : "text-[#8CC497]"}`} />
                      <span>{post.isSaved ? "Unsave post" : "Save post"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onHidePost?.(post.id);
                      }}
                      style={{ borderRadius: "10px" }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-amber-300/90 hover:text-amber-200 hover:bg-amber-500/10 rounded-[10px] transition-colors text-left cursor-pointer"
                    >
                      <EyeOff className="w-4 h-4 text-amber-400" />
                      <span>Hide post</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Post Content Body */}
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-sans whitespace-pre-wrap line-clamp-4">
              {post.content}
            </p>

            {/* Like & Comments Stats Bar with Animated Heart Burst */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="relative flex items-center">
                <AnimatePresence>
                  {postHeartBurstKey && (
                    <motion.div
                      key={postHeartBurstKey}
                      initial={{ opacity: 0, scale: 0.5, y: 0 }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        scale: [0.5, 1.4, 1.2, 0.9],
                        y: -28,
                        rotate: [0, -12, 12, 0],
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.65, ease: "easeOut" }}
                      className="absolute pointer-events-none z-30 select-none text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.85)]"
                    >
                      <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={handleTogglePostLike}
                  className="flex items-center gap-1.5 text-white/90 hover:text-white cursor-pointer transition-all group active:scale-95 select-none"
                  title={isPostLiked ? "Unlike post" : "Like post"}
                >
                  <Heart
                    className={`w-4 h-4 transition-all group-hover:scale-110 ${
                      isPostLiked ? "fill-rose-500 text-rose-500" : "text-white/70 hover:text-white"
                    }`}
                  />
                  <span className={isPostLiked ? "font-bold text-rose-400" : ""}>
                    {postLikesCount} {postLikesCount === 1 ? "like" : "likes"}
                  </span>
                </button>
              </div>

              <span className="text-white/80 transition-all font-medium">
                {displayCommentsCount} {displayCommentsCount === 1 ? "comment" : "comments"}
              </span>
            </div>
          </div>

          {/* Top comments dropdown label */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-white tracking-tight cursor-pointer select-none">
            <span>Top comments</span>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-300" />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 💬 SCROLLABLE COMMENTS ONLY SECTION (Dedicated Scroll Container) */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 pt-3 space-y-3 [scrollbar-width:thin] [scrollbar-color:#007a52_transparent]">
          {isLoading ? (
            /* 🌀 Centered Comments Spinner Loader */
            <div className="py-14 flex flex-col items-center justify-center gap-3 text-[#8CC497]">
              <Loader2 className="w-8 h-8 animate-spin text-[#8CC497]" />
              <span className="text-xs font-medium text-emerald-200/70">Loading discussion...</span>
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
                      {!comment.isAuthor && !comment.isAnonymous && comment.authorId ? (
                        <Link
                          href={`/profile/${comment.authorId}`}
                          onClick={onClose}
                          className="flex items-center gap-2.5 group/commenter min-w-0"
                          title={`View ${comment.authorName}'s profile`}
                        >
                          <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-black text-xs relative overflow-hidden shadow-xs bg-[#003F2A] border border-[#8CC497] text-[#8CC497] group-hover/commenter:border-white group-hover/commenter:scale-105 transition-all">
                            {comment.authorAvatarUrl ? (
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
                          <div className="overflow-hidden">
                            <h4 className="font-extrabold text-xs sm:text-[13px] text-white tracking-tight font-heading leading-tight flex items-center gap-1.5 truncate group-hover/commenter:text-[#8CC497] group-hover/commenter:underline transition-colors">
                              <span>{comment.authorName}</span>
                              {comment.authorNickname && (
                                <span className="text-[#8CC497] font-semibold text-[11px]">
                                  | @{comment.authorNickname}
                                </span>
                              )}
                            </h4>
                            <p className="text-[10px] text-[#8CC497] font-medium tracking-wide">
                              {comment.department}
                            </p>
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2.5 min-w-0 cursor-default select-none">
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
                          <div className="overflow-hidden">
                            <h4 className="font-extrabold text-xs sm:text-[13px] text-white tracking-tight font-heading leading-tight flex items-center gap-1.5 truncate">
                              <span>{comment.authorName}</span>
                              {comment.authorNickname && (
                                <span className="text-[#8CC497] font-semibold text-[11px]">
                                  | @{comment.authorNickname}
                                </span>
                              )}
                            </h4>
                            <p className="text-[10px] text-[#8CC497] font-medium tracking-wide">
                              {comment.isAnonymous && !comment.isAuthor ? "Flame" : comment.department}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="relative flex items-center justify-center">
                        <AnimatePresence>
                          {commentHeartBursts[comment.id] && (
                            <motion.div
                              key={commentHeartBursts[comment.id]}
                              initial={{ opacity: 0, scale: 0.4, y: 0 }}
                              animate={{
                                opacity: [0, 1, 1, 0],
                                scale: [0.4, 1.3, 1.1, 0.8],
                                y: -24,
                                rotate: [0, -10, 10, 0],
                              }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.65, ease: "easeOut" }}
                              className="absolute pointer-events-none z-30 select-none text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                            >
                              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <button
                          type="button"
                          onClick={() => handleToggleCommentLike(comment.id)}
                          className="p-1 text-white/60 hover:text-white transition-transform active:scale-90 cursor-pointer"
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
        {/* ✍️ BOTTOM COMMENT COMPOSER (Matching Post Card Input Style) */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 border-t border-[#007a52]/80 bg-[#006241] shrink-0 relative overflow-hidden">
          <form onSubmit={handleSendComment} className="relative flex items-center">
            <input
              type="text"
              placeholder="Write a comment..."
              value={newCommentText}
              maxLength={1000}
              disabled={isSubmitting}
              onChange={(e) => setNewCommentText(e.target.value)}
              style={{ borderRadius: "10px" }}
              className="w-full bg-[#002f1f] border border-[#005a3c] rounded-[10px] pl-4.5 pr-12 py-3.5 text-sm text-white placeholder-[#8CC497]/40 focus:outline-none focus:border-[#8CC497] shadow-inner transition-all"
            />

            <button
              type="submit"
              disabled={!newCommentText.trim() || isSubmitting}
              className="absolute right-2.5 p-2 rounded-[10px] text-[#8CC497] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all cursor-pointer group flex items-center justify-center"
              title={isSubmitting ? "Sending..." : "Send Comment"}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 text-[#8CC497] animate-spin" />
              ) : (
                <div className="pointer-events-none flex items-center justify-center">
                  <SendHorizontalIcon
                    ref={sendIconRef}
                    size={18}
                    duration={1.5}
                    color="#8CC497"
                    className="group-hover:scale-110 group-active:scale-90 transition-transform"
                  />
                </div>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
