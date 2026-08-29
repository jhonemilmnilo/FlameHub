"use client";

import React from "react";
import { Bookmark, Sparkles } from "lucide-react";

export function EmptySavedPosts() {
  return (
    <div
      style={{ borderRadius: "10px" }}
      className="col-span-full py-16 px-6 text-center space-y-4 bg-[#003F2A]/60 border border-[#005a3c] rounded-[10px] shadow-lg flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="w-14 h-14 rounded-full bg-[#002f1f] border-2 border-[#8CC497]/40 flex items-center justify-center text-[#8CC497] shadow-inner">
        <Bookmark className="w-7 h-7" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base sm:text-lg font-bold text-white font-heading tracking-tight flex items-center justify-center gap-1.5">
          <span>No saved posts yet</span>
          <Sparkles className="w-4 h-4 text-[#8CC497]" />
        </h3>
        <p className="text-xs text-[#8CC497]/80 leading-relaxed font-sans">
          Click the 3-dots menu on any post in your campus feed and choose{" "}
          <span className="font-semibold text-white">&quot;Save post&quot;</span> to save ideas, announcements, and memories for later!
        </p>
      </div>
    </div>
  );
}
