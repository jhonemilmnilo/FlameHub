"use client";

import React, { useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { ProfileBanner } from "./profile-banner";
import { ProfileBioCard } from "./profile-bio-card";
import { ProfileFollowersWidget } from "./profile-followers-widget";
import { ProfileActivityFeed } from "./profile-activity-feed";
import { ProfileEditModal } from "./profile-edit-modal";
import { ProfileBioModal } from "./profile-bio-modal";
import { ProfileAvatarModal } from "./profile-avatar-modal";
import { ProfileAvatarViewerModal } from "./profile-avatar-viewer-modal";
import { AppSidebar } from "@/components/layout/app-sidebar";
import type { UserProfileData, FollowerItem } from "../actions/profile.action";
import type { PostFeedItem } from "@/features/feed/actions/post.action";

interface ProfileDashboardProps {
  currentUser?: UserProfileData | null;
  profile: UserProfileData;
  posts: PostFeedItem[];
  initialNextCursor?: string | null;
  initialHasMore?: boolean;
  followers: FollowerItem[];
}

export function ProfileDashboard({
  currentUser,
  profile: initialProfile,
  posts,
  initialNextCursor = null,
  initialHasMore = false,
  followers,
}: ProfileDashboardProps) {
  const sessionUser = currentUser || initialProfile;
  const [profile, setProfile] = useState<UserProfileData>(initialProfile);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [isViewingAvatar, setIsViewingAvatar] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  return (
    <div className="min-h-screen bg-[#006241] text-white flex flex-col md:flex-row font-sans selection:bg-[#8CC497]/30 selection:text-white">
      {/* ========================================================================= */}
      {/* 🌲 SHARED PERSISTENT APP SIDEBAR */}
      <AppSidebar
        currentUser={{
          name: sessionUser.displayName,
          studentId: sessionUser.studentId || "Student",
          avatarUrl: sessionUser.avatarUrl,
          nickname: sessionUser.nickname,
        }}
      />

      {/* ========================================================================= */}
      {/* 🚀 MAIN PROFILE CONTAINER */}
      {/* ========================================================================= */}
      <main className="flex-1 p-5 md:p-8 lg:p-10 max-w-[1600px] mx-auto w-full space-y-8 relative">
        {/* Floating show sidebar button */}
        {isSidebarHidden && (
          <button
            type="button"
            onClick={() => setIsSidebarHidden(false)}
            title="Open Sidebar"
            className="fixed top-6 left-6 z-40 p-2.5 rounded-xl bg-[#003F2A] hover:bg-[#004e34] border border-[#005a3c] text-white shadow-xl transition-all cursor-pointer flex items-center gap-2"
          >
            <PanelLeftOpen className="w-5 h-5 text-[#8CC497]" />
            <span className="text-xs font-bold hidden sm:inline">Show Sidebar</span>
          </button>
        )}

        {/* Top Section: Profile Hero Banner (left 70%) & Bio (right 30%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-8 flex">
            <ProfileBanner
              profile={profile}
              isAvatarLoading={isUpdatingAvatar}
              onEditBio={() => setIsEditingProfile(true)}
              onEditAvatar={() => setIsEditingAvatar(true)}
              onOpenAvatarViewer={() => setIsViewingAvatar(true)}
            />
          </div>
          <div className="lg:col-span-4 flex">
            <ProfileBioCard
              bio={profile.bio}
              isSelf={profile.isSelf}
              onOpenEditBio={() => setIsEditingBio(true)}
            />
          </div>
        </div>

        {/* Bottom Section: Activity (left 70%) & Followers (right 30%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8">
            <ProfileActivityFeed
              initialPosts={posts}
              initialNextCursor={initialNextCursor}
              initialHasMore={initialHasMore}
              targetUserId={profile.id}
              isSelf={profile.isSelf}
              userName={profile.displayName}
              currentSessionUser={{
                id: sessionUser.id,
                name: sessionUser.displayName,
                studentId: sessionUser.studentId || undefined,
                avatarUrl: sessionUser.avatarUrl,
              }}
            />
          </div>
          <div className="lg:col-span-4 sticky top-6">
            <ProfileFollowersWidget initialFollowers={followers} />
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 👁️ PROFILE AVATAR PHOTO VIEWER MODAL (Read-Only) */}
      {/* ========================================================================= */}
      <ProfileAvatarViewerModal
        isOpen={isViewingAvatar}
        onClose={() => setIsViewingAvatar(false)}
        avatarUrl={profile.avatarUrl}
        displayName={profile.displayName}
        department={profile.department}
        nickname={profile.nickname}
      />

      {/* ========================================================================= */}
      {/* ✏️ PROFILE EDIT MODAL */}
      {/* ========================================================================= */}
      <ProfileEditModal
        profile={profile}
        isOpen={isEditingProfile}
        onClose={() => setIsEditingProfile(false)}
        onProfileUpdated={(updated) => {
          setProfile((prev) => ({
            ...prev,
            ...updated,
          }));
        }}
      />

      {/* ========================================================================= */}
      {/* 📝 BIO EDIT MODAL */}
      {/* ========================================================================= */}
      <ProfileBioModal
        initialBio={profile.bio}
        isOpen={isEditingBio}
        onClose={() => setIsEditingBio(false)}
        onBioUpdated={(newBio) => {
          setProfile((prev) => ({
            ...prev,
            bio: newBio,
          }));
        }}
      />

      {/* ========================================================================= */}
      {/* 📸 AVATAR PHOTO UPLOAD MODAL */}
      {/* ========================================================================= */}
      <ProfileAvatarModal
        currentAvatarUrl={profile.avatarUrl}
        isOpen={isEditingAvatar}
        onClose={() => setIsEditingAvatar(false)}
        onAvatarUpdated={(newAvatarUrl) => {
          setIsUpdatingAvatar(true);
          setProfile((prev) => ({
            ...prev,
            avatarUrl: newAvatarUrl,
          }));
          setTimeout(() => {
            setIsUpdatingAvatar(false);
          }, 800);
        }}
      />
    </div>
  );
}
