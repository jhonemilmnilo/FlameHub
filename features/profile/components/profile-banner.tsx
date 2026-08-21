"use client";

import React, { useState } from "react";
import Image from "next/image";
import { MoreHorizontal, Edit3, Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import type { UserProfileData } from "../actions/profile.action";

interface ProfileBannerProps {
  profile: UserProfileData;
  onEditBio?: () => void;
}

export function ProfileBanner({ profile, onEditBio }: ProfileBannerProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(profile.createdAt);
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "June 27, 2019";
    }
  }, [profile.createdAt]);

  const handleCopyLink = () => {
    setShowMenu(false);
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied to clipboard!");
    }
  };

  return (
    <div
      style={{ borderRadius: "10px" }}
      className="w-full bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-6 md:p-8 shadow-xl relative overflow-hidden transition-all duration-300"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 lg:gap-8">
        {/* User Portrait / Avatar Box */}
        <div
          style={{ borderRadius: "10px" }}
          className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-[10px] overflow-hidden shrink-0 bg-[#002f1f] border-2 border-[#8CC497]/40 shadow-inner group"
        >
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt={profile.displayName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#004e34] to-[#002f1f] text-[#8CC497]">
              <span className="text-4xl md:text-5xl font-black font-heading">
                {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : "U"}
              </span>
            </div>
          )}
        </div>

        {/* User Details & Stats */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white font-heading tracking-tight">
              {profile.displayName}
            </h1>
            <p className="text-xs sm:text-sm text-[#8CC497] font-medium tracking-wide">
              {profile.email || `${profile.studentId || "student"}@phinmaed.com`}
            </p>
          </div>

          {/* Social Stats Strip */}
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold select-none">
            <div>
              <span className="text-white font-extrabold text-sm sm:text-base mr-1.5">
                {profile.stats.postsCount}
              </span>
              <span className="text-emerald-200/70">posts</span>
            </div>
            <div>
              <span className="text-white font-extrabold text-sm sm:text-base mr-1.5">
                {profile.stats.followersCount}
              </span>
              <span className="text-emerald-200/70">followers</span>
            </div>
            <div>
              <span className="text-white font-extrabold text-sm sm:text-base mr-1.5">
                {profile.stats.followingCount}
              </span>
              <span className="text-emerald-200/70">following</span>
            </div>
          </div>

          {/* Institutional Metadata List matching requested order */}
          <div className="space-y-1.5 pt-1 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white min-w-[95px]">User ID</span>
              <span className="text-[#8CC497] font-medium">{profile.studentId || "03-2122-034361"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white min-w-[95px]">Created at</span>
              <span className="text-[#8CC497] font-medium">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white min-w-[95px]">Department</span>
              <span className="text-[#8CC497] font-medium">{profile.department || "CITE"}</span>
            </div>
          </div>
        </div>

        {/* 3-Dots Action Menu Trigger Button */}
        <div className="absolute top-5 right-5 sm:top-6 sm:right-6">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="p-2 rounded-xl text-[#8CC497] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Profile Options"
            >
              <MoreHorizontal className="w-6 h-6" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#002f1f] border border-[#005a3c] rounded-2xl shadow-2xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
                {profile.isSelf && onEditBio && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onEditBio();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#8CC497] hover:text-white hover:bg-[#004e34] rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-[#8CC497]" />
                    <span>Edit Bio</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-100 hover:text-white hover:bg-[#004e34] rounded-xl transition-colors text-left cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-[#8CC497]" />
                  <span>Copy Profile Link</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
