"use client";

import React, { useState } from "react";
import { X, User, AtSign, Building2 } from "lucide-react";
import { toast } from "sonner";
import {
  updateProfileDetailsAction,
  type UserProfileData,
} from "../actions/profile.action";

interface ProfileEditModalProps {
  profile: UserProfileData;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (updated: Partial<UserProfileData>) => void;
}

const DEPARTMENTS = ["CITE", "CEA", "CMA", "CAHS", "CELA", "CCJE"];

export function ProfileEditModal({
  profile,
  isOpen,
  onClose,
  onProfileUpdated,
}: ProfileEditModalProps) {
  if (!isOpen) return null;

  return (
    <ProfileEditModalContent
      profile={profile}
      onClose={onClose}
      onProfileUpdated={onProfileUpdated}
    />
  );
}

function ProfileEditModalContent({
  profile,
  onClose,
  onProfileUpdated,
}: Omit<ProfileEditModalProps, "isOpen">) {
  const [displayName, setDisplayName] = useState(profile.displayName || "");
  const [nickname, setNickname] = useState(profile.nickname || "");
  const [firstName, setFirstName] = useState(profile.firstName || "");
  const [lastName, setLastName] = useState(profile.lastName || "");
  const [department, setDepartment] = useState(profile.department || "CITE");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (!displayName.trim() || displayName.trim().length < 2) {
      toast.error("Display name must be at least 2 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateProfileDetailsAction({
        displayName: displayName.trim(),
        nickname: nickname.trim() ? nickname.trim() : null,
        firstName: firstName.trim() ? firstName.trim() : null,
        lastName: lastName.trim() ? lastName.trim() : null,
        department: department,
      });

      if (res.success && res.data && res.data.user) {
        toast.success("Profile updated successfully.");
        onProfileUpdated?.(res.data.user);
        onClose();
      } else {
        toast.error(res.error || "Unable to update profile.");
      }
    } catch {
      toast.error("An unexpected network error occurred.");
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
        className="w-full max-w-lg bg-[#003F2A] border border-[#005a3c] rounded-[10px] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(140,196,151,0.4)_transparent]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#005a3c]/70 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[10px] bg-[#002f1f] text-[#8CC497] border border-[#005a3c]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white font-heading tracking-tight">
                Edit Profile
              </h3>
              <p className="text-xs text-[#8CC497]">Customize your campus identity</p>
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

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-white tracking-wide">
              Display Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={50}
                placeholder="Enter your full name..."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{ borderRadius: "10px" }}
                className="w-full bg-[#002f1f] border border-[#005a3c] rounded-[10px] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#8CC497]/40 focus:outline-none focus:border-[#8CC497] transition-all"
              />
            </div>
            <p className="text-[11px] text-[#8CC497]/70">
              This name will be shown publicly across your posts and profile banner.
            </p>
          </div>

          {/* Nickname Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-white tracking-wide">
              Nickname
            </label>
            <div className="relative flex items-center">
              <AtSign className="w-4 h-4 absolute left-3.5 text-[#8CC497]/70 pointer-events-none" />
              <input
                type="text"
                maxLength={30}
                placeholder="provide your nickname here..."
                value={nickname}
                onChange={(e) => setNickname(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                style={{ borderRadius: "10px" }}
                className="w-full bg-[#002f1f] border border-[#005a3c] rounded-[10px] pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#8CC497]/40 focus:outline-none focus:border-[#8CC497] transition-all"
              />
            </div>
            <p className="text-[11px] text-[#8CC497]/70">
              Must be unique.
            </p>
          </div>

          {/* Split Name Inputs: First & Last */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-white tracking-wide">
                First Name
              </label>
              <input
                type="text"
                maxLength={50}
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{ borderRadius: "10px" }}
                className="w-full bg-[#002f1f] border border-[#005a3c] rounded-[10px] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#8CC497]/40 focus:outline-none focus:border-[#8CC497] transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-white tracking-wide">
                Last Name
              </label>
              <input
                type="text"
                maxLength={50}
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{ borderRadius: "10px" }}
                className="w-full bg-[#002f1f] border border-[#005a3c] rounded-[10px] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#8CC497]/40 focus:outline-none focus:border-[#8CC497] transition-all"
              />
            </div>
          </div>

          {/* Department Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#8CC497]" />
              <span>Department</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {DEPARTMENTS.map((dept) => {
                const isSelected = department === dept;
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setDepartment(dept)}
                    style={{ borderRadius: "10px" }}
                    className={`py-2 px-2.5 rounded-[10px] text-xs font-bold transition-all cursor-pointer border text-center ${
                      isSelected
                        ? "bg-[#8CC497] text-[#003F2A] border-[#8CC497] shadow-md scale-[1.02]"
                        : "bg-[#002f1f] text-[#8CC497]/80 border-[#005a3c] hover:border-[#8CC497]/60 hover:text-white"
                    }`}
                  >
                    {dept}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Other Details (Read-only metadata) */}
          <div
            style={{ borderRadius: "10px" }}
            className="p-3.5 rounded-[10px] bg-[#002f1f]/60 border border-[#005a3c]/60 space-y-2.5"
          >
            <h4 className="text-xs font-bold text-white tracking-wide">
              Other Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#8CC497]/70 text-[11px] block font-medium">Student ID</span>
                <span className="font-semibold text-white/90">{profile.studentId || "03-2122-000000"}</span>
              </div>
              <div>
                <span className="text-[#8CC497]/70 text-[11px] block font-medium">Email</span>
                <span className="font-semibold text-white/90 truncate block">{profile.email || "student@phinmaed.com"}</span>
              </div>
            </div>
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
              disabled={isSubmitting || !displayName.trim()}
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
