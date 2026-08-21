"use client";

import React from "react";
import { Edit2 } from "lucide-react";

interface ProfileBioCardProps {
  bio: string | null;
  isSelf: boolean;
  onOpenEditBio?: () => void;
}

export function ProfileBioCard({
  bio,
  isSelf,
  onOpenEditBio,
}: ProfileBioCardProps) {
  return (
    <div
      style={{ borderRadius: "10px" }}
      className="w-full bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-6 shadow-xl flex flex-col justify-start space-y-3.5 transition-all duration-300 h-full"
    >
      <div className="flex items-center justify-between border-b border-[#005a3c]/50 pb-2.5">
        <h2 className="text-lg font-bold text-white font-heading tracking-tight">
          Bio
        </h2>
        {isSelf && onOpenEditBio && (
          <button
            type="button"
            onClick={onOpenEditBio}
            className="p-1.5 rounded-[10px] text-[#8CC497] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Edit Bio"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1">
        <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-normal whitespace-pre-line">
          {bio || (
            <span className="text-[#8CC497]/60 italic">
              No bio added yet. Click the edit icon to tell the campus community about yourself.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
