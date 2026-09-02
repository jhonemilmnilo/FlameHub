"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, User } from "lucide-react";

interface ProfileAvatarViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  avatarUrl: string | null;
  displayName: string;
  department?: string | null;
  nickname?: string | null;
}

export function ProfileAvatarViewerModal({
  isOpen,
  onClose,
  avatarUrl,
  displayName,
  department,
  nickname,
}: ProfileAvatarViewerModalProps) {
  // 🔒 Body scroll lock & ESC key listener
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          style={{ borderRadius: "16px" }}
          className="relative max-w-lg w-full bg-[#003F2A] border border-[#005a3c] shadow-2xl overflow-hidden flex flex-col items-center p-6 space-y-5"
        >
          {/* Top Bar: User Info & Close Button */}
          <div className="w-full flex items-center justify-between border-b border-[#005a3c]/70 pb-3">
            <div className="overflow-hidden">
              <h3 className="font-extrabold text-base sm:text-lg text-white font-heading truncate flex items-center gap-2">
                <span>{displayName}</span>
                {nickname && (
                  <span className="text-[#8CC497] font-semibold text-xs sm:text-sm">
                    | @{nickname}
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#8CC497] font-medium tracking-wide">
                {department ? `${department} Department` : "PHINMA Education"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{ borderRadius: "10px" }}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Avatar Preview Display */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full overflow-hidden bg-[#002f1f] border-4 border-[#8CC497] shadow-[0_15px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(140,196,151,0.3)] ring-2 ring-white/20 flex items-center justify-center">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                unoptimized
                priority
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#004e34] to-[#002f1f] text-[#8CC497]">
                <User className="w-24 h-24 stroke-[1.5] text-[#8CC497]/70" />
                <span className="text-4xl sm:text-5xl font-black font-heading mt-2">
                  {displayName ? displayName.charAt(0).toUpperCase() : "U"}
                </span>
              </div>
            )}
          </div>

          {/* Footer note */}
          <p className="text-[11px] text-[#8CC497]/70 font-medium tracking-wide text-center">
            FlameHub Campus Profile Picture
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
