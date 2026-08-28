"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Bell,
  Bookmark,
  HelpCircle,
  Info,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AppSidebarProps {
  currentUser: {
    name: string;
    studentId: string;
    avatarUrl?: string | null;
    nickname?: string | null;
  };
  onSelectSaved?: () => void;
  isSavedActive?: boolean;
}

export function AppSidebar({
  currentUser,
  onSelectSaved,
  isSavedActive = false,
}: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);

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

  const isHome = pathname === "/";

  return (
    <>
      {/* Floating Button to Reveal Sidebar when Hidden */}
      {isSidebarHidden && (
        <button
          type="button"
          onClick={() => setIsSidebarHidden(false)}
          title="Open Sidebar"
          className="fixed top-6 left-6 z-40 p-2.5 rounded-xl bg-[#003F2A] hover:bg-[#004e34] border border-[#005a3c] text-white shadow-xl transition-all cursor-pointer flex items-center gap-2 hover:scale-105 active:scale-95 animate-fadeIn"
        >
          <PanelLeftOpen className="w-5 h-5 text-[#8CC497]" />
          <span className="text-xs font-bold hidden sm:inline">Show Sidebar</span>
        </button>
      )}

      {/* 🌲 PERSISTENT LEFT SIDEBAR NAVIGATION */}
      <aside
        className={`bg-[#003F2A] border-b md:border-b-0 md:border-r border-[#005a3c]/60 shrink-0 md:sticky md:top-0 md:h-screen flex flex-col justify-between z-30 transition-all duration-300 ease-in-out ${
          isSidebarHidden
            ? "w-0 p-0 overflow-hidden opacity-0 border-none pointer-events-none"
            : "w-full md:w-64 lg:w-72 p-6 overflow-y-auto opacity-100 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        }`}
      >
        <div className="space-y-6">
          {/* User Profile Header & Collapse Toggle */}
          <div className="flex items-center justify-between gap-2 select-none pt-2">
            <Link
              href="/profile"
              className="flex items-center gap-3.5 overflow-hidden text-left cursor-pointer group hover:opacity-90 transition-opacity"
            >
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-[#002f1f] border-2 border-[#8CC497] overflow-hidden flex items-center justify-center shrink-0 shadow-md text-[#8CC497] font-black text-lg relative">
                {currentUser.avatarUrl ? (
                  <Image
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <span>{currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}</span>
                )}
              </div>
              <div className="overflow-hidden">
                <h2 className="font-extrabold text-sm lg:text-base text-white truncate tracking-tight font-heading group-hover:text-[#8CC497] transition-colors">
                  {currentUser.name}
                </h2>
                <p className="text-xs text-[#8CC497] font-medium tracking-wide">
                  {currentUser.studentId}
                </p>
              </div>
            </Link>

            {/* Toggle Button to Hide Sidebar */}
            <button
              type="button"
              onClick={() => setIsSidebarHidden(true)}
              title="Hide Sidebar"
              className="p-1.5 rounded-lg hover:bg-[#006241] text-[#8CC497] hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          {/* ─── Sleek Divider Line between Avatar & Navigation ─── */}
          <hr className="border-t border-[#005a3c]/70 my-2" />

          {/* Navigation Links */}
          <nav className="space-y-2 font-medium">
            <Link
              href="/"
              className={`w-full flex items-center gap-4 px-3.5 py-3 rounded-xl transition-all text-left cursor-pointer active:scale-98 ${
                isHome && !isSavedActive
                  ? "text-[#006241] font-extrabold bg-white shadow-md"
                  : "text-emerald-100 hover:text-white hover:bg-[#006241]/60"
              }`}
            >
              <Home className={`w-5 h-5 shrink-0 ${isHome && !isSavedActive ? "text-[#006241]" : "text-[#8CC497]"}`} />
              <span className={`text-sm lg:text-base ${isHome && !isSavedActive ? "font-bold" : ""}`}>Home</span>
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
              onClick={() => {
                if (onSelectSaved) {
                  onSelectSaved();
                } else {
                  router.push("/?sort=Saved");
                }
              }}
              className={`w-full flex items-center gap-4 px-3.5 py-3 rounded-xl transition-all text-left cursor-pointer ${
                isSavedActive
                  ? "bg-[#006241] text-white font-bold shadow-inner"
                  : "text-emerald-100 hover:text-white hover:bg-[#006241]/60"
              }`}
            >
              <Bookmark className={`w-5 h-5 shrink-0 ${isSavedActive ? "text-[#8CC497] fill-[#8CC497]" : "text-[#8CC497]"}`} />
              <span className="text-sm lg:text-base">Bookmarks</span>
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
    </>
  );
}
