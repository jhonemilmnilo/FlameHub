"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Edit2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { UserProfileData } from "../actions/profile.action";

interface ProfileBannerProps {
  profile: UserProfileData;
  isAvatarLoading?: boolean;
  onEditBio?: () => void;
  onEditAvatar?: () => void;
}

export function ProfileBanner({
  profile,
  isAvatarLoading = false,
  onEditBio,
  onEditAvatar,
}: ProfileBannerProps) {
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

  const handleAvatarClick = () => {
    if (profile.isSelf && !isAvatarLoading) {
      if (onEditAvatar) {
        onEditAvatar();
      } else {
        toast.info("Avatar customization coming soon!");
      }
    }
  };

  const handleEditClick = () => {
    if (onEditBio) {
      onEditBio();
    } else {
      toast.info("Edit profile options");
    }
  };

  return (
    <div
      style={{ borderRadius: "10px" }}
      className="w-full bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-6 md:p-8 shadow-xl relative overflow-hidden transition-all duration-300"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 lg:gap-8">
        {/* User Portrait / Avatar Box with Edit Badge & Overlay */}
        <div className="relative shrink-0 group">
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full overflow-hidden bg-[#002f1f] border-2 border-[#8CC497] shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(140,196,151,0.25)] ring-1 ring-white/20 transition-all duration-300 group-hover:border-white">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.displayName}
                fill
                unoptimized
                priority
                className={`object-cover transition-all duration-300 ${
                  isAvatarLoading ? "blur-xs opacity-50" : "opacity-100"
                }`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#004e34] to-[#002f1f] text-[#8CC497]">
                <span className="text-4xl md:text-5xl font-black font-heading">
                  {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : "U"}
                </span>
              </div>
            )}

            {/* 🌀 Spinner Overlay during Avatar Update */}
            {isAvatarLoading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 z-20 animate-fadeIn">
                <Loader2 className="w-6 h-6 animate-spin text-[#8CC497]" />
                <span className="text-[10px] font-bold text-white tracking-wider uppercase">Updating</span>
              </div>
            )}
          </div>

          {/* Bottom-Right Pen Edit Icon Badge (Author Only) */}
          {profile.isSelf && (
            <button
              type="button"
              disabled={isAvatarLoading}
              onClick={handleAvatarClick}
              title="Edit Profile Photo"
              className="absolute bottom-1 right-1 p-2.5 rounded-full bg-[#003F2A] border-2 border-[#8CC497] text-[#8CC497] hover:bg-[#8CC497] hover:text-[#003F2A] shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer z-10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAvatarLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Edit2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* User Details & Stats */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white font-heading tracking-tight flex items-center flex-wrap gap-2">
              <span>{profile.displayName}</span>
              {profile.nickname && (
                <span className="text-[#8CC497] font-semibold text-lg sm:text-xl lg:text-2xl">
                  | @{profile.nickname}
                </span>
              )}
            </h1>
            {profile.isSelf && profile.email ? (
              <p className="text-xs sm:text-sm text-[#8CC497] font-medium tracking-wide">
                {profile.email}
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-[#8CC497] font-medium tracking-wide">
                {profile.department ? `${profile.department} Department` : "PHINMA Education"}
              </p>
            )}
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

        {/* Top-Right Pen Edit Icon Button matching Bio card */}
        {profile.isSelf && (
          <div className="absolute top-5 right-5 sm:top-6 sm:right-6">
            <button
              type="button"
              onClick={handleEditClick}
              className="p-2 rounded-xl text-[#8CC497] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Edit Profile"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
