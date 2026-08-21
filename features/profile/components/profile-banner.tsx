"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Edit2, Camera, Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import type { UserProfileData } from "../actions/profile.action";

interface ProfileBannerProps {
  profile: UserProfileData;
  onEditBio?: () => void;
  onEditAvatar?: () => void;
}

export function ProfileBanner({ profile, onEditBio, onEditAvatar }: ProfileBannerProps) {
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
    if (profile.isSelf) {
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
        {/* User Portrait / Avatar Box with Edit Overlay */}
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

          {/* Edit Avatar Overlay Button (Author Only) */}
          {profile.isSelf && (
            <button
              type="button"
              onClick={handleAvatarClick}
              title="Change Profile Photo"
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 cursor-pointer backdrop-blur-[2px]"
            >
              <div className="p-2 rounded-full bg-[#003F2A] border border-[#8CC497] text-[#8CC497] shadow-lg hover:scale-110 active:scale-95 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-white tracking-wide drop-shadow-md">
                Change Photo
              </span>
            </button>
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
