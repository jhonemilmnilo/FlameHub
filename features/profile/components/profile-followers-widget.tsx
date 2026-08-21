"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import type { FollowerItem } from "../actions/profile.action";

interface ProfileFollowersWidgetProps {
  initialFollowers?: FollowerItem[];
}

export function ProfileFollowersWidget({
  initialFollowers = [
    {
      id: "f1",
      displayName: "Juan Dela Cruz",
      studentId: "03-1819-034333",
      department: "CITE",
      avatarUrl: null,
    },
    {
      id: "f2",
      displayName: "Juan Dela Cruz",
      studentId: "03-1819-034333",
      department: "CITE",
      avatarUrl: null,
    },
    {
      id: "f3",
      displayName: "Juan Dela Cruz",
      studentId: "03-1819-034333",
      department: "CITE",
      avatarUrl: null,
    },
  ],
}: ProfileFollowersWidgetProps) {
  const [search, setSearch] = useState("");

  const filteredFollowers = initialFollowers.filter(
    (f) =>
      f.displayName.toLowerCase().includes(search.toLowerCase()) ||
      f.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{ borderRadius: "10px" }}
      className="w-full bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-5 shadow-xl space-y-4"
    >
      {/* Header Title */}
      <h2 className="text-lg font-bold text-white font-heading tracking-tight">
        Followers
      </h2>

      {/* Sleek Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8CC497]/70 pointer-events-none" />
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ borderRadius: "10px" }}
          className="w-full bg-[#002f1f] border border-[#005a3c] rounded-[10px] pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#8CC497]/50 focus:outline-none focus:border-[#8CC497] transition-all"
        />
      </div>

      {/* Followers Mini Cards List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5 [scrollbar-width:none]">
        {filteredFollowers.length === 0 ? (
          <p className="text-xs text-[#8CC497]/60 text-center py-4">
            No followers found
          </p>
        ) : (
          filteredFollowers.map((follower, idx) => (
            <div
              key={`${follower.id}-${idx}`}
              style={{ borderRadius: "10px" }}
              className="bg-[#002f1f]/80 hover:bg-[#002f1f] border border-[#005a3c]/50 hover:border-[#8CC497]/50 rounded-[10px] p-3 flex items-center gap-3.5 transition-all cursor-pointer shadow-xs group"
            >
              {/* Soft Light Green Circle Avatar */}
              <div className="w-10 h-10 rounded-full bg-[#8CC497] shrink-0 flex items-center justify-center text-[#003F2A] font-black text-sm shadow-inner">
                {follower.displayName.charAt(0).toUpperCase()}
              </div>

              {/* Follower Name & Department */}
              <div className="overflow-hidden">
                <h3 className="font-bold text-xs sm:text-sm text-white group-hover:text-[#8CC497] transition-colors truncate">
                  {follower.displayName}
                </h3>
                <p className="text-[11px] text-[#8CC497] font-semibold tracking-wider">
                  {follower.department || "CITE"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
