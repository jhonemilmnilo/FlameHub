"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { X, Heart, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  getPostLikersAction,
  type PostLikerItem,
} from "@/features/feed/actions/post.liked.action";

interface PostLikersModalProps {
  postId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PostLikersModal({
  postId,
  isOpen,
  onClose,
}: PostLikersModalProps) {
  const [likers, setLikers] = useState<PostLikerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isOpen || !postId) return;

    let isMounted = true;

    async function fetchLikers() {
      try {
        const res = await getPostLikersAction(postId!);
        if (isMounted) {
          if (res.success && res.data) {
            setLikers(res.data);
          } else {
            setLikers([]);
          }
        }
      } catch {
        if (isMounted) setLikers([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchLikers();

    return () => {
      isMounted = false;
    };
  }, [isOpen, postId]);

  // Lock background scroll and listen for Escape key when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "unset";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen, onClose]);

  if (!isOpen || !postId) return null;

  const filteredLikers = likers.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ borderRadius: "10px" }}
        className="w-full max-w-md bg-[#003F2A] border border-[#005a3c] rounded-[10px] p-5 md:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#005a3c]/70 pb-3">
          <div className="flex items-center gap-2 text-white">
            <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            <h3 className="font-extrabold text-base sm:text-lg font-heading tracking-tight">
              Likes
            </h3>
            {!isLoading && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#002f1f] text-[#8CC497] border border-[#005a3c]">
                {likers.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Filter */}
        {likers.length > 5 && !isLoading && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8CC497]/70 pointer-events-none" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ borderRadius: "10px" }}
              className="w-full bg-[#002f1f] border border-[#005a3c] rounded-[10px] pl-9 pr-3 py-2 text-xs text-white placeholder-[#8CC497]/40 focus:outline-none focus:border-[#8CC497] transition-all"
            />
          </div>
        )}

        {/* Likers List or Spinner Loader (Compact 5-items max height, clean transparent scrollbar) */}
        <div className="max-h-[270px] overflow-y-auto space-y-2 pr-1.5 [scrollbar-width:thin] [scrollbar-color:rgba(140,196,151,0.4)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-button]:w-0 [&::-webkit-scrollbar-button]:h-0 [&::-webkit-scrollbar-thumb]:bg-[#8CC497]/40 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#8CC497]/70">
          {isLoading ? (
            /* 🌀 Centered Spinner Loader */
            <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-[#8CC497]">
              <Loader2 className="w-7 h-7 animate-spin text-[#8CC497]" />
              <span className="text-xs font-medium text-emerald-200/70">Loading likes...</span>
            </div>
          ) : likers.length === 0 ? (
            <div
              style={{ borderRadius: "10px" }}
              className="py-6 text-center space-y-1.5 bg-[#002f1f]/50 border border-[#005a3c] rounded-[10px] p-4"
            >
              <p className="text-xs font-semibold text-white/90">No likes yet</p>
              <p className="text-[11px] text-[#8CC497]/70">
                Be the very first one to like this post!
              </p>
            </div>
          ) : filteredLikers.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#8CC497]/70">
              No students match &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredLikers.map((user) => (
              <div
                key={user.id}
                style={{ borderRadius: "10px" }}
                className="p-2.5 rounded-[10px] bg-[#002f1f] border border-[#005a3c]/70 hover:border-[#8CC497]/50 flex items-center justify-between gap-2.5 transition-all group"
              >
                <Link
                  href={`/profile/${user.userId}`}
                  onClick={onClose}
                  className="flex items-center gap-2.5 flex-1 overflow-hidden"
                >
                  <div className="w-8 h-8 rounded-full bg-[#003F2A] border border-[#8CC497] overflow-hidden shrink-0 flex items-center justify-center text-[#8CC497] font-black text-xs shadow-inner group-hover:scale-105 transition-transform relative">
                    {user.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt={user.displayName}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <span>{user.displayName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-xs text-white truncate group-hover:text-[#8CC497] transition-colors font-heading">
                      {user.displayName}
                    </h4>
                    <p className="text-[10px] text-[#8CC497] font-medium truncate">
                      {user.studentId} • <span className="font-semibold">{user.department}</span>
                    </p>
                  </div>
                </Link>

                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
