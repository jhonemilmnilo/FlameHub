"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Bell,
  HelpCircle,
  Info,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ProfileBanner } from "./profile-banner";
import { ProfileBioCard } from "./profile-bio-card";
import { ProfileFollowersWidget } from "./profile-followers-widget";
import { ProfileActivityFeed } from "./profile-activity-feed";
import type { UserProfileData, FollowerItem } from "../actions/profile.action";
import type { PostFeedItem } from "@/features/feed/actions/post.action";

interface ProfileDashboardProps {
  profile: UserProfileData;
  posts: PostFeedItem[];
  followers: FollowerItem[];
}

export function ProfileDashboard({
  profile,
  posts,
  followers,
}: ProfileDashboardProps) {
  const router = useRouter();
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);

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
    <div className="min-h-screen bg-[#006241] text-white flex flex-col md:flex-row font-sans selection:bg-[#8CC497]/30 selection:text-white">
      {/* ========================================================================= */}
      {/* 🌲 LEFT SIDEBAR NAVIGATION */}
      {/* ========================================================================= */}
      <aside
        className={`bg-[#003F2A] border-b md:border-b-0 md:border-r border-[#005a3c]/60 shrink-0 md:sticky md:top-0 md:h-screen flex flex-col justify-between z-30 transition-all duration-300 ease-in-out ${
          isSidebarHidden
            ? "w-0 p-0 overflow-hidden opacity-0 border-none pointer-events-none"
            : "w-full md:w-64 lg:w-72 p-6 overflow-y-auto opacity-100 [scrollbar-width:none]"
        }`}
      >
        <div className="space-y-6">
          {/* User Mini Profile Header */}
          <div className="flex items-center justify-between gap-2 select-none pt-2">
            <Link
              href="/profile"
              className="flex items-center gap-3.5 overflow-hidden group hover:opacity-90 transition-opacity"
            >
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-md text-[#006241] font-black text-lg">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <h2 className="font-extrabold text-sm lg:text-base text-white truncate tracking-tight font-heading group-hover:text-[#8CC497] transition-colors">
                  {profile.displayName}
                </h2>
                <p className="text-xs text-[#8CC497] font-medium tracking-wide">
                  {profile.studentId || "03-2122-034361"}
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsSidebarHidden(true)}
              title="Hide Sidebar"
              className="p-1.5 rounded-lg hover:bg-[#006241] text-[#8CC497] hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          <hr className="border-t border-[#005a3c]/70 my-2" />

          {/* Navigation Links */}
          <nav className="space-y-2 font-medium">
            <Link
              href="/"
              className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-emerald-100 hover:text-white hover:bg-[#006241]/60 transition-all text-left cursor-pointer"
            >
              <Home className="w-5 h-5 text-[#8CC497] shrink-0" />
              <span className="text-sm lg:text-base font-semibold">Home</span>
            </Link>

            <button
              type="button"
              className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-emerald-100 hover:text-white hover:bg-[#006241]/60 transition-all text-left cursor-pointer"
            >
              <Bell className="w-5 h-5 text-[#8CC497] shrink-0" />
              <span className="text-sm lg:text-base">Notifications</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-emerald-100 hover:text-white hover:bg-[#006241]/60 transition-all text-left cursor-pointer"
            >
              <HelpCircle className="w-5 h-5 text-[#8CC497] shrink-0" />
              <span className="text-sm lg:text-base">Help</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-emerald-100 hover:text-white hover:bg-[#006241]/60 transition-all text-left cursor-pointer"
            >
              <Info className="w-5 h-5 text-[#8CC497] shrink-0" />
              <span className="text-sm lg:text-base">About</span>
            </button>
          </nav>
        </div>

        {/* Log Out Button */}
        <div className="pt-6 border-t border-[#005a3c]/70">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl text-emerald-100 hover:text-white hover:bg-rose-950/30 transition-all text-left cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-[#8CC497] shrink-0" />
            <span className="text-sm lg:text-base font-bold">Log out</span>
          </button>
        </div>
      </aside>

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
              onEditBio={() => setIsEditingBio(true)}
            />
          </div>
          <div className="lg:col-span-4 flex">
            <ProfileBioCard
              initialBio={profile.bio}
              isSelf={profile.isSelf}
              isEditing={isEditingBio}
              onCloseEdit={() => setIsEditingBio(false)}
            />
          </div>
        </div>

        {/* Bottom Section: Activity (left 70%) & Followers (right 30%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8">
            <ProfileActivityFeed
              initialPosts={posts}
              isSelf={profile.isSelf}
              userName={profile.displayName}
            />
          </div>
          <div className="lg:col-span-4 sticky top-6">
            <ProfileFollowersWidget initialFollowers={followers} />
          </div>
        </div>
      </main>
    </div>
  );
}
