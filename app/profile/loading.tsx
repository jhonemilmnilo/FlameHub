import React from "react";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-[#006241] text-white flex flex-col md:flex-row font-sans selection:bg-[#8CC497]/30 selection:text-white">
      {/* 🌲 LEFT SIDEBAR SKELETON */}
      <aside className="bg-[#003F2A] border-b md:border-b-0 md:border-r border-[#005a3c]/60 shrink-0 w-full md:w-64 lg:w-72 p-6 flex flex-col justify-between h-screen hidden md:flex animate-pulse">
        <div className="space-y-6">
          {/* User Profile Header */}
          <div className="flex items-center gap-3.5 pt-2">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-white/20 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-white/25 rounded-md w-3/4" />
              <div className="h-3 bg-[#8CC497]/30 rounded-md w-1/2" />
            </div>
          </div>

          <hr className="border-t border-[#005a3c]/70 my-2" />

          {/* Nav Items */}
          <div className="space-y-2">
            <div className="h-11 bg-white/20 rounded-xl w-full" />
            <div className="h-11 bg-white/10 rounded-xl w-full" />
            <div className="h-11 bg-white/10 rounded-xl w-full" />
            <div className="h-11 bg-white/10 rounded-xl w-full" />
            <div className="h-11 bg-white/10 rounded-xl w-full" />
          </div>
        </div>

        {/* Logout Skeleton */}
        <div className="pt-6 border-t border-[#005a3c]/70">
          <div className="h-11 bg-rose-950/30 rounded-xl w-full" />
        </div>
      </aside>

      {/* 🚀 MAIN CONTENT PROFILE SKELETON */}
      <main className="flex-1 p-5 md:p-8 lg:p-10 max-w-[1600px] mx-auto w-full space-y-8 animate-pulse">
        {/* Top Section: Hero Banner (left 70%) & Bio (right 30%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Banner Skeleton */}
          <div className="lg:col-span-8 flex">
            <div
              style={{ borderRadius: "10px" }}
              className="w-full bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-6 md:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center gap-6 lg:gap-8"
            >
              {/* Avatar Box */}
              <div
                style={{ borderRadius: "10px" }}
                className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-[10px] bg-[#002f1f] border-2 border-[#8CC497]/30 shrink-0"
              />
              {/* Info & Stats */}
              <div className="flex-1 space-y-4 w-full">
                <div className="space-y-2">
                  <div className="h-7 bg-white/25 rounded-md w-3/5" />
                  <div className="h-4 bg-[#8CC497]/30 rounded-md w-2/5" />
                </div>
                {/* Stats strip */}
                <div className="flex items-center gap-6 pt-1">
                  <div className="space-y-1">
                    <div className="h-5 bg-white/20 rounded w-10" />
                    <div className="h-3 bg-[#8CC497]/20 rounded w-12" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-5 bg-white/20 rounded w-10" />
                    <div className="h-3 bg-[#8CC497]/20 rounded w-14" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-5 bg-white/20 rounded w-10" />
                    <div className="h-3 bg-[#8CC497]/20 rounded w-14" />
                  </div>
                </div>
                {/* Metadata tags */}
                <div className="space-y-2 pt-2">
                  <div className="h-3.5 bg-white/15 rounded w-4/5" />
                  <div className="h-3.5 bg-white/15 rounded w-3/5" />
                  <div className="h-3.5 bg-white/15 rounded w-1/2" />
                </div>
              </div>
            </div>
          </div>

          {/* Bio Skeleton */}
          <div className="lg:col-span-4 flex">
            <div
              style={{ borderRadius: "10px" }}
              className="w-full bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-6 shadow-xl flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-6 bg-white/25 rounded-md w-16" />
                  <div className="w-5 h-5 bg-[#8CC497]/30 rounded-md" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-3.5 bg-white/15 rounded-md w-full" />
                  <div className="h-3.5 bg-white/15 rounded-md w-5/6" />
                  <div className="h-3.5 bg-white/15 rounded-md w-4/6" />
                </div>
              </div>
              <div className="h-3 bg-[#8CC497]/20 rounded-md w-1/3 pt-1" />
            </div>
          </div>
        </div>

        {/* Bottom Section: Activity Post Grid (left 70%) & Followers Widget (right 30%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Activity Feed Skeleton */}
          <div className="lg:col-span-8 space-y-5">
            {/* Title Skeleton */}
            <div className="h-6 bg-white/25 rounded-md w-24" />

            {/* Composer Pill Skeleton */}
            <div
              style={{ borderRadius: "10px" }}
              className="w-full bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-4 md:p-5 shadow-xl flex items-center gap-4"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#8CC497]/30 shrink-0" />
              <div className="flex-1 h-11 bg-[#002f1f] rounded-full" />
            </div>

            {/* 2-Column Post Cards Skeleton Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{ borderRadius: "10px" }}
                  className="bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-5 flex flex-col justify-between space-y-4 shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#8CC497]/30 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3.5 bg-white/20 rounded-md w-3/5" />
                      <div className="h-2.5 bg-[#8CC497]/20 rounded-md w-2/5" />
                    </div>
                  </div>
                  <div className="space-y-2 py-1">
                    <div className="h-3 bg-white/15 rounded-md w-full" />
                    <div className="h-3 bg-white/15 rounded-md w-4/5" />
                  </div>
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-white/15" />
                        <div className="w-5 h-5 rounded-full bg-white/15" />
                      </div>
                      <div className="w-5 h-5 rounded-full bg-white/15" />
                    </div>
                    <div className="h-2.5 bg-[#8CC497]/20 rounded-md w-1/4" />
                    <div className="h-9 bg-[#002f1f] rounded-[10px] w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Followers Widget Skeleton */}
          <div className="lg:col-span-4 sticky top-6">
            <div
              style={{ borderRadius: "10px" }}
              className="w-full bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-5 shadow-xl space-y-4"
            >
              <div className="h-6 bg-white/25 rounded-md w-24" />
              <div className="h-9 bg-[#002f1f] rounded-[10px] w-full" />
              <div className="space-y-2.5 pt-2">
                {[1, 2, 3].map((f) => (
                  <div
                    key={f}
                    style={{ borderRadius: "10px" }}
                    className="p-3 rounded-[10px] bg-[#002f1f] border border-[#005a3c]/60 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#8CC497]/30 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 bg-white/20 rounded w-3/4" />
                      <div className="h-2.5 bg-[#8CC497]/20 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
