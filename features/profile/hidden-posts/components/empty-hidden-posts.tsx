"use client";

import React from "react";
import { EyeOff } from "lucide-react";

export function EmptyHiddenPosts() {
  return (
    <div className="text-center py-20 bg-[#003F2A]/60 border border-[#005a3c] rounded-[10px] space-y-4 shadow-xl select-none animate-in fade-in zoom-in-95 duration-200">
      <div className="w-16 h-16 rounded-full bg-[#002f1f] border-2 border-[#8CC497] flex items-center justify-center mx-auto text-[#8CC497] shadow-inner">
        <EyeOff className="w-8 h-8" />
      </div>
      <div className="space-y-1.5 px-4">
        <h3 className="text-base font-bold text-white font-heading tracking-tight">
          No hidden posts yet
        </h3>
        <p className="text-xs text-[#8CC497]/70 max-w-sm mx-auto leading-relaxed">
          Posts you choose to hide from your feed will appear here. You can unhide them at any time to bring them back to your main stream.
        </p>
      </div>
    </div>
  );
}
