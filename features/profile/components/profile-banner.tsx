"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Edit2, Loader2, UserPlus, UserCheck, Flag, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import {
  type UserProfileData,
  toggleFollowUserAction,
  reportUserAction,
} from "../actions/profile.action";

interface ProfileBannerProps {
  profile: UserProfileData;
  isAvatarLoading?: boolean;
  onEditBio?: () => void;
  onEditAvatar?: () => void;
}

export function ProfileBanner({
  profile,
  isAvatarLoading = false,
  onEditBio,
  onEditAvatar,
}: ProfileBannerProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(profile.stats.followersCount);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(profile.createdAt);
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Campus Student";
    }
  }, [profile.createdAt]);

  const handleAvatarClick = () => {
    if (profile.isSelf && !isAvatarLoading) {
      if (onEditAvatar) {
        onEditAvatar();
      } else {
        toast.info("Avatar customization coming soon!");
      }
    }
  };

  const handleEditClick = () => {
    if (onEditBio) {
      onEditBio();
    } else {
      toast.info("Edit profile options");
    }
  };

  const handleToggleFollow = async () => {
    if (isFollowLoading) return;

    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setFollowersCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    setIsFollowLoading(true);

    try {
      const res = await toggleFollowUserAction(profile.id);
      if (res.success) {
        toast.success(nextState ? `You are now following ${profile.displayName}` : `Unfollowed ${profile.displayName}`);
      } else {
        // Rollback
        setIsFollowing(!nextState);
        setFollowersCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
        toast.error(res.error || "Unable to update follow status.");
      }
    } catch {
      setIsFollowing(!nextState);
      setFollowersCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
      toast.error("Network error while updating follow.");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim() || isSubmittingReport) return;

    setIsSubmittingReport(true);
    try {
      const res = await reportUserAction(profile.id, reportReason.trim());
      if (res.success) {
        toast.success("Thank you. Report submitted for student moderation review.");
        setIsReportModalOpen(false);
        setReportReason("");
      } else {
        toast.error(res.error || "Unable to submit report.");
      }
    } catch {
      toast.error("Network error while submitting report.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <>
      <div
        style={{ borderRadius: "10px" }}
        className="w-full bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-6 md:p-8 shadow-xl relative overflow-hidden transition-all duration-300"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 lg:gap-8">
          {/* User Portrait / Avatar Box */}
          <div className="relative shrink-0 group">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full overflow-hidden bg-[#002f1f] border-2 border-[#8CC497] shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(140,196,151,0.25)] ring-1 ring-white/20 transition-all duration-300 group-hover:border-white">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  fill
                  unoptimized
                  priority
                  className={`object-cover transition-all duration-300 ${
                    isAvatarLoading ? "blur-xs opacity-50" : "opacity-100"
                  }`}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#004e34] to-[#002f1f] text-[#8CC497]">
                  <span className="text-4xl md:text-5xl font-black font-heading">
                    {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : "U"}
                  </span>
                </div>
              )}

              {/* 🌀 Spinner Overlay during Avatar Update */}
              {isAvatarLoading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 z-20 animate-fadeIn">
                  <Loader2 className="w-6 h-6 animate-spin text-[#8CC497]" />
                  <span className="text-[10px] font-bold text-white tracking-wider uppercase">Updating</span>
                </div>
              )}
            </div>

            {/* Bottom-Right Pen Edit Icon Badge (Author Only) */}
            {profile.isSelf && (
              <button
                type="button"
                disabled={isAvatarLoading}
                onClick={handleAvatarClick}
                title="Edit Profile Photo"
                className="absolute bottom-1 right-1 p-2.5 rounded-full bg-[#003F2A] border-2 border-[#8CC497] text-[#8CC497] hover:bg-[#8CC497] hover:text-[#003F2A] shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer z-10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAvatarLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Edit2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* User Details & Stats */}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white font-heading tracking-tight flex items-center flex-wrap gap-2">
                <span>{profile.displayName}</span>
                {profile.nickname && (
                  <span className="text-[#8CC497] font-semibold text-lg sm:text-xl lg:text-2xl">
                    | @{profile.nickname}
                  </span>
                )}
              </h1>
              {profile.isSelf && profile.email ? (
                <p className="text-xs sm:text-sm text-[#8CC497] font-medium tracking-wide">
                  {profile.email}
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-[#8CC497] font-medium tracking-wide">
                  {profile.department ? `${profile.department} Department` : "PHINMA Education"}
                </p>
              )}
            </div>

            {/* Social Stats Strip */}
            <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold select-none">
              <div>
                <span className="text-white font-extrabold text-sm sm:text-base mr-1.5">
                  {profile.stats.postsCount}
                </span>
                <span className="text-emerald-200/70">posts</span>
              </div>
              <div>
                <span className="text-white font-extrabold text-sm sm:text-base mr-1.5">
                  {followersCount}
                </span>
                <span className="text-emerald-200/70">followers</span>
              </div>
              <div>
                <span className="text-white font-extrabold text-sm sm:text-base mr-1.5">
                  {profile.stats.followingCount}
                </span>
                <span className="text-emerald-200/70">following</span>
              </div>
            </div>

            {/* If Self: Show Institutional Metadata List */}
            {profile.isSelf ? (
              <div className="space-y-1.5 pt-1 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white min-w-[95px]">User ID</span>
                  <span className="text-[#8CC497] font-medium">{profile.studentId || "03-2122-034361"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white min-w-[95px]">Created at</span>
                  <span className="text-[#8CC497] font-medium">{formattedDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white min-w-[95px]">Department</span>
                  <span className="text-[#8CC497] font-medium">{profile.department || "CITE"}</span>
                </div>
              </div>
            ) : (
              /* If Visited User: Clean Action Strip (Follow + Department Tag) */
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={isFollowLoading}
                  style={{ borderRadius: "10px" }}
                  className={`px-5 py-2.5 rounded-[10px] text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-60 ${
                    isFollowing
                      ? "bg-[#002f1f] text-[#8CC497] border border-[#8CC497]/50 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800"
                      : "bg-[#8CC497] text-[#003F2A] hover:bg-[#a0d6ab] hover:scale-102"
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4 shrink-0" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 shrink-0" />
                      <span>Follow</span>
                    </>
                  )}
                </button>

                <div
                  style={{ borderRadius: "10px" }}
                  className="px-3.5 py-2 rounded-[10px] bg-[#002f1f] border border-[#005a3c] text-xs text-[#8CC497] font-medium flex items-center gap-1.5"
                >
                  <span>🎓</span>
                  <span>{profile.department || "CITE"} Department</span>
                </div>
              </div>
            )}
          </div>

          {/* Top-Right Action Button */}
          {profile.isSelf ? (
            <div className="absolute top-5 right-5 sm:top-6 sm:right-6">
              <button
                type="button"
                onClick={handleEditClick}
                className="p-2 rounded-xl text-[#8CC497] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Edit Profile"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="absolute top-5 right-5 sm:top-6 sm:right-6">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="p-2 rounded-xl text-emerald-200/50 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Report User"
              >
                <Flag className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 🚨 Report User Modal */}
      {isReportModalOpen && (
        <div
          onClick={() => setIsReportModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ borderRadius: "10px" }}
            className="w-full max-w-md bg-[#003F2A] border border-[#005a3c] rounded-[10px] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#005a3c] pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">Report {profile.displayName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="p-1.5 text-emerald-200/70 hover:text-white hover:bg-[#002f1f] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <p className="text-xs text-emerald-100/80">
                Help us keep FlameHub safe. Select or describe why you are reporting this account:
              </p>

              <div className="space-y-2">
                {[
                  "Impersonation or fake account",
                  "Harassment or bullying",
                  "Inappropriate or offensive content",
                  "Spam or malicious behavior",
                  "Other reason",
                ].map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#002f1f] border border-[#005a3c]/60 hover:border-[#8CC497]/50 cursor-pointer transition-all text-xs text-emerald-100"
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={reportReason === reason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="accent-[#8CC497]"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  style={{ borderRadius: "10px" }}
                  className="px-4 py-2 text-xs font-semibold text-emerald-200/80 hover:text-white hover:bg-[#002f1f] rounded-[10px] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!reportReason.trim() || isSubmittingReport}
                  style={{ borderRadius: "10px" }}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-[10px] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
                >
                  {isSubmittingReport ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
