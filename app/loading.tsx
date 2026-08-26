import React from "react";

/**
 * ⚡ Root Application Loading Skeleton
 *
 * 1:1 Pixel-Perfect alignment with `HomeFeedDashboard`:
 * - Layout: `min-h-screen bg-[#006241] flex flex-col md:flex-row`
 * - Sidebar: `w-full md:w-64 lg:w-72 p-6` (sticky)
 * - Main Container: `p-6 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8`
 * - Welcome Banner Header: "Welcome to Flamehub!" & subtext
 * - Post Composer Box: `rounded-[10px] p-4 md:p-5` with avatar & pill button
 * - Feed Section Title & Filter Toolbar: Filter button + Search input + 2 Select dropdowns
 * - Grid: 3-column post cards `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`
 */
export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#006241] text-white flex flex-col md:flex-row font-sans selection:bg-[#8CC497]/30 selection:text-white">
      {/* ========================================================================= */}
      {/* 🌲 LEFT SIDEBAR SKELETON (1:1 with HomeFeedDashboard aside) */}
      {/* ========================================================================= */}
      <aside className="bg-[#003F2A] border-b md:border-b-0 md:border-r border-[#005a3c]/60 shrink-0 md:sticky md:top-0 md:h-screen w-full md:w-64 lg:w-72 p-6 flex flex-col justify-between hidden md:flex animate-pulse">
        <div className="space-y-6">
          {/* User Profile Header */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-3.5 overflow-hidden">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-[#002f1f] border-2 border-[#8CC497]/40 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/25 rounded-md w-28" />
                <div className="h-3 bg-[#8CC497]/40 rounded-md w-20" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white/10 shrink-0" />
          </div>

          {/* Divider */}
          <hr className="border-t border-[#005a3c]/70 my-2" />

          {/* Navigation Links */}
          <nav className="space-y-2">
            {/* Active Home Button */}
            <div className="h-12 bg-white/90 rounded-xl w-full" />
            {/* Notifications */}
            <div className="h-12 bg-white/10 rounded-xl w-full" />
            {/* Bookmarks */}
            <div className="h-12 bg-white/10 rounded-xl w-full" />
            {/* Help */}
            <div className="h-12 bg-white/10 rounded-xl w-full" />
            {/* About */}
            <div className="h-12 bg-white/10 rounded-xl w-full" />
          </nav>
        </div>

        {/* Log Out Button */}
        <div className="pt-6 border-t border-[#005a3c]/70">
          <div className="h-12 bg-rose-950/30 rounded-xl w-full" />
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 🚀 MAIN CONTENT FEED AREA SKELETON (1:1 with HomeFeedDashboard main) */}
      {/* ========================================================================= */}
      <main className="flex-1 p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8 animate-pulse">
        {/* Welcome Banner Header */}
        <div className="space-y-2">
          <div className="h-8 md:h-10 bg-white/25 rounded-lg w-72 md:w-96" />
          <div className="h-4 bg-[#8CC497]/30 rounded-md w-60 md:w-80" />
        </div>

        {/* ✍️ Post Composer Box */}
        <div
          style={{ borderRadius: "10px" }}
          className="w-full bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-4 md:p-5 shadow-xl"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#002f1f] border-2 border-[#8CC497]/40 shrink-0" />
            <div className="flex-1 h-11 bg-[#002f1f]/80 border border-[#8CC497]/20 rounded-full" />
          </div>
        </div>

        {/* Feed Section Title & Filter Bar */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="h-6 bg-white/25 rounded-md w-16" />
            <div className="h-3.5 bg-[#8CC497]/30 rounded-md w-48" />
          </div>

          {/* Filter & Search Toolbar */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Filter Icon Badge */}
            <div
              style={{ borderRadius: "10px" }}
              className="h-[42px] w-[42px] rounded-[10px] bg-[#003F2A] border border-[#005a3c] shrink-0 shadow-sm"
            />

            {/* Search Input Placeholder */}
            <div
              style={{ borderRadius: "10px" }}
              className="flex-1 min-w-[200px] max-w-sm h-[42px] bg-[#003F2A] border border-[#005a3c] rounded-[10px] shadow-sm"
            />

            {/* Sort Select Placeholder */}
            <div
              style={{ borderRadius: "10px" }}
              className="min-w-[145px] h-[42px] bg-[#003F2A] border border-[#005a3c] rounded-[10px] shadow-sm"
            />

            {/* Department Select Placeholder */}
            <div
              style={{ borderRadius: "10px" }}
              className="min-w-[160px] h-[42px] bg-[#003F2A] border border-[#005a3c] rounded-[10px] shadow-sm"
            />
          </div>
        </div>

        {/* 📰 3-Column Post Cards Grid (Exact matching grid layout) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{ borderRadius: "10px" }}
              className="bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-5 flex flex-col justify-between space-y-4 shadow-xl"
            >
              {/* Post Header: Avatar + Author Info + Menu Icon */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#8CC497]/30 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 bg-white/25 rounded-md w-3/5" />
                  <div className="h-2.5 bg-[#8CC497]/30 rounded-md w-2/5" />
                </div>
                <div className="w-6 h-6 rounded-md bg-white/10 shrink-0" />
              </div>

              {/* Post Body: Simulated Content Lines */}
              <div className="space-y-2 py-1">
                <div className="h-3 bg-white/15 rounded-md w-full" />
                <div className="h-3 bg-white/15 rounded-md w-11/12" />
                <div className="h-3 bg-white/15 rounded-md w-4/6" />
              </div>

              {/* Post Footer: Actions & Comment Input Pill */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-md bg-rose-500/20" />
                    <div className="w-5 h-5 rounded-md bg-[#8CC497]/20" />
                    <div className="w-5 h-5 rounded-md bg-white/15" />
                  </div>
                  <div className="w-5 h-5 rounded-md bg-white/15" />
                </div>
                <div className="h-2.5 bg-[#8CC497]/20 rounded-md w-1/4" />
                <div className="h-8 bg-[#002f1f] border border-[#005a3c]/50 rounded-[10px] w-full" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
