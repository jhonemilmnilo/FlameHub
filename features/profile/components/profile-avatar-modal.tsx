"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import Cropper from "react-easy-crop";
import type { Point, Area } from "react-easy-crop";
import { X, Upload, Camera, Loader2, RotateCw, ZoomIn, ZoomOut, Check } from "lucide-react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { validateClientFile, AVATAR_RULES } from "../utils/media.validation";
import { uploadAvatarAction } from "../actions/profile.action";
import { getCroppedImg } from "../utils/cropImage";

interface ProfileAvatarModalProps {
  currentAvatarUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAvatarUpdated: (newAvatarUrl: string) => void;
}

export function ProfileAvatarModal({
  currentAvatarUrl,
  isOpen,
  onClose,
  onAvatarUpdated,
}: ProfileAvatarModalProps) {
  if (!isOpen) return null;

  return (
    <ProfileAvatarModalContent
      currentAvatarUrl={currentAvatarUrl}
      onClose={onClose}
      onAvatarUpdated={onAvatarUpdated}
    />
  );
}

function ProfileAvatarModalContent({
  currentAvatarUrl,
  onClose,
  onAvatarUpdated,
}: Omit<ProfileAvatarModalProps, "isOpen">) {
  const [imageSrc, setImageSrc] = useState<string | null>(currentAvatarUrl || null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [hasChanged, setHasChanged] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Client-Side Pre-Validation
    const preValidation = validateClientFile(file, "avatar");
    if (!preValidation.isValid) {
      toast.error(preValidation.error || "Invalid file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. Read as local Data URL for Interactive Cropper
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result?.toString() || null);
      setZoom(1);
      setRotation(0);
      setCrop({ x: 0, y: 0 });
      setHasChanged(true);
    });
    reader.readAsDataURL(file);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    setHasChanged(true);
  };

  const handleSaveAvatar = async () => {
    if (!imageSrc || !croppedAreaPixels || isProcessing) return;

    setIsProcessing(true);
    try {
      // 1. Crop, Rotate & Extract Canvas result to WebP File
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);

      // 2. Compress WebP File via browser-image-compression
      const options = {
        maxSizeMB: 1.5,
        maxWidthOrHeight: AVATAR_RULES.maxWidthOrHeight,
        useWebWorker: true,
        fileType: "image/webp",
        initialQuality: AVATAR_RULES.quality,
      };
      const optimizedFile = await imageCompression(croppedFile, options);

      // 3. Upload to Supabase Storage via Server Action
      const formData = new FormData();
      formData.append("avatar", optimizedFile);

      const res = await uploadAvatarAction(formData);

      if (res.success && res.data?.avatarUrl) {
        toast.success("Profile photo updated successfully.");
        onAvatarUpdated(res.data.avatarUrl);
        onClose();
      } else {
        toast.error(res.error || "Unable to upload avatar.");
      }
    } catch (err) {
      console.error("AVATAR_PROCESSING_ERROR:", err);
      toast.error("An error occurred while saving your photo.");
    } finally {
      setIsProcessing(false);
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
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white font-heading tracking-tight">
                Update Profile Photo
              </h3>
              <p className="text-xs text-[#8CC497]">
                {imageSrc ? "Drag to position, zoom, or rotate" : "Upload a photo for your campus profile"}
              </p>
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

        {/* Hidden Native File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Main Crop / Preview Area */}
        <div className="flex flex-col items-center justify-center space-y-4">
          {imageSrc ? (
            /* ✂️ Interactive Cropper Container */
            <div className="w-full space-y-4">
              <div
                style={{ borderRadius: "10px" }}
                className="relative w-full h-64 sm:h-72 bg-[#002f1f] border-2 border-[#8CC497] rounded-[10px] overflow-hidden shadow-inner"
              >
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={(newCrop) => {
                    setCrop(newCrop);
                    setHasChanged(true);
                  }}
                  onCropComplete={onCropComplete}
                  onZoomChange={(newZoom) => {
                    setZoom(newZoom);
                    setHasChanged(true);
                  }}
                  classes={{
                    containerClassName: "rounded-[10px]",
                    cropAreaClassName: "!border-2 !border-white/80 !shadow-[0_0_0_9999px_rgba(0,47,31,0.85)]",
                  }}
                />
              </div>

              {/* Controls Bar: Zoom Slider & Rotate Button */}
              <div className="flex items-center justify-between gap-4 p-3 bg-[#002f1f] border border-[#005a3c] rounded-[10px]">
                {/* Zoom Controller */}
                <div className="flex items-center gap-2 flex-1">
                  <ZoomOut className="w-4 h-4 text-[#8CC497]" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => {
                      setZoom(Number(e.target.value));
                      setHasChanged(true);
                    }}
                    className="w-full h-1.5 bg-[#003F2A] rounded-lg appearance-none cursor-pointer accent-[#8CC497]"
                  />
                  <ZoomIn className="w-4 h-4 text-[#8CC497]" />
                </div>

                {/* Rotate Button */}
                <button
                  type="button"
                  onClick={handleRotate}
                  title="Rotate 90°"
                  style={{ borderRadius: "10px" }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#003F2A] hover:bg-[#005a3c] text-white border border-[#005a3c] text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  <RotateCw className="w-3.5 h-3.5 text-[#8CC497]" />
                  <span>Rotate</span>
                </button>
              </div>
            </div>
          ) : (
            /* Empty State (If user has never uploaded any avatar yet) */
            <div
              style={{ borderRadius: "10px" }}
              className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-[10px] overflow-hidden bg-[#002f1f] border-2 border-[#8CC497] shadow-xl flex items-center justify-center"
            >
              <div className="flex flex-col items-center justify-center text-[#8CC497]/60 space-y-2">
                <Camera className="w-10 h-10" />
                <span className="text-xs font-semibold">No photo selected</span>
              </div>
            </div>
          )}

          {/* Select / Change Image Button */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            style={{ borderRadius: "10px" }}
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#002f1f] hover:bg-[#002619] border border-[#005a3c] hover:border-[#8CC497]/60 text-xs font-bold text-[#8CC497] hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>{imageSrc ? "Upload Different Photo" : "Select Image from Device"}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#005a3c]/70">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            style={{ borderRadius: "10px" }}
            className="px-4 py-2.5 rounded-[10px] text-xs font-bold text-white hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!imageSrc || isProcessing || (!hasChanged && Boolean(currentAvatarUrl))}
            onClick={handleSaveAvatar}
            style={{ borderRadius: "10px" }}
            className="px-6 py-2.5 rounded-[10px] bg-white hover:bg-emerald-50 text-[#006241] font-black text-xs uppercase tracking-wider shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>SAVING...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>SAVE PHOTO</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
