"use client";

import React, { useState } from "react";
import { X, FileText } from "lucide-react";
import { toast } from "sonner";
import { updateBioAction } from "../actions/profile.action";

interface ProfileBioModalProps {
  initialBio: string | null;
  isOpen: boolean;
  onClose: () => void;
  onBioUpdated: (newBio: string) => void;
}

export function ProfileBioModal({
  initialBio,
  isOpen,
  onClose,
  onBioUpdated,
}: ProfileBioModalProps) {
  if (!isOpen) return null;

  return (
    <ProfileBioModalContent
      initialBio={initialBio}
      onClose={onClose}
      onBioUpdated={onBioUpdated}
    />
  );
}

function ProfileBioModalContent({
  initialBio,
  onClose,
  onBioUpdated,
}: Omit<ProfileBioModalProps, "isOpen">) {
  const [bioText, setBioText] = useState(initialBio || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Auto-adjust height dynamically to fit full content with zero scrollbars
  const adjustHeight = React.useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.max(el.scrollHeight, 110)}px`;
    }
  }, []);

  React.useEffect(() => {
    adjustHeight();
  }, [bioText, adjustHeight]);

  // Lock background scroll and listen for Escape key
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await updateBioAction({ bio: bioText.trim() });
      if (res.success && res.data) {
        toast.success("Bio updated successfully.");
        onBioUpdated(res.data.bio);
        onClose();
      } else {
        toast.error(res.error || "Unable to update bio.");
      }
    } catch {
      toast.error("Network error while updating bio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ borderRadius: "10px" }}
        className="w-full max-w-lg bg-[#003F2A] border border-[#005a3c] rounded-[10px] p-6 shadow-2xl space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#005a3c]/70 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[10px] bg-[#002f1f] text-[#8CC497] border border-[#005a3c]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white font-heading tracking-tight">
                Edit Bio
              </h3>
              <p className="text-xs text-[#8CC497]">Tell the campus community about yourself</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[10px] text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bio Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-white tracking-wide">
                Your Bio
              </label>
              <span className="text-[11px] text-[#8CC497]/70 font-mono">
                {bioText.length}/500
              </span>
            </div>
            <textarea
              ref={textareaRef}
              rows={3}
              maxLength={500}
              placeholder="Write a short summary about yourself, your hobbies, or what you study..."
              value={bioText}
              onChange={(e) => {
                setBioText(e.target.value);
              }}
              style={{ borderRadius: "10px" }}
              className="w-full bg-[#002f1f] border border-[#005a3c] rounded-[10px] p-3.5 text-xs sm:text-sm text-white placeholder-[#8CC497]/40 focus:outline-none focus:border-[#8CC497] transition-all resize-none leading-relaxed overflow-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#005a3c]/70">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              style={{ borderRadius: "10px" }}
              className="px-4 py-2.5 rounded-[10px] text-xs font-bold text-white hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ borderRadius: "10px" }}
              className="px-6 py-2.5 rounded-[10px] bg-white hover:bg-emerald-50 text-[#006241] font-black text-xs uppercase tracking-wider shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? "SAVING..." : "SAVE CHANGES"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
