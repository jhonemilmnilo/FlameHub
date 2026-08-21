"use client";

import React, { useState } from "react";
import { Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { updateBioAction } from "../actions/profile.action";

interface ProfileBioCardProps {
  initialBio: string | null;
  isSelf: boolean;
  isEditing?: boolean;
  onCloseEdit?: () => void;
}

export function ProfileBioCard({
  initialBio,
  isSelf,
  isEditing = false,
  onCloseEdit,
}: ProfileBioCardProps) {
  const [bio, setBio] = useState(
    initialBio ||
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse ligula ipsum, facilisis quis bibendum vitae, rutrum in orci. Nam pulvi"
  );
  const [editing, setEditing] = useState(isEditing);
  const [draftBio, setDraftBio] = useState(bio);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (isEditing) {
      setEditing(true);
      setDraftBio(bio);
    }
  }, [isEditing, bio]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await updateBioAction({ bio: draftBio });
      if (res.success && res.data) {
        setBio(res.data.bio);
        setEditing(false);
        if (onCloseEdit) onCloseEdit();
        toast.success("Bio updated successfully!");
      } else {
        toast.error(res.error || "Failed to update bio.");
      }
    } catch {
      toast.error("Network error while updating bio.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftBio(bio);
    setEditing(false);
    if (onCloseEdit) onCloseEdit();
  };

  return (
    <div
      style={{ borderRadius: "10px" }}
      className="w-full bg-[#003F2A] border border-[#005a3c]/60 rounded-[10px] p-6 shadow-xl flex flex-col justify-between space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white font-heading tracking-tight">
          Bio
        </h2>
        {isSelf && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="p-1 text-[#8CC497] hover:text-white transition-colors cursor-pointer"
            title="Edit Bio"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            rows={4}
            value={draftBio}
            onChange={(e) => setDraftBio(e.target.value)}
            maxLength={500}
            style={{ borderRadius: "10px" }}
            className="w-full bg-[#002f1f] border border-[#005a3c] rounded-[10px] p-3 text-xs sm:text-sm text-white placeholder-[#8CC497]/40 focus:outline-none focus:border-[#8CC497] transition-all resize-none"
            placeholder="Write something about yourself..."
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleCancel}
              style={{ borderRadius: "10px" }}
              className="p-1.5 rounded-[10px] text-emerald-200/70 hover:text-white hover:bg-white/10 text-xs transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              style={{ borderRadius: "10px" }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#8CC497] hover:bg-[#a1d7ab] text-[#003F2A] font-extrabold text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSaving ? "Saving..." : "Save"}</span>
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-normal whitespace-pre-line">
          {bio}
        </p>
      )}
    </div>
  );
}
