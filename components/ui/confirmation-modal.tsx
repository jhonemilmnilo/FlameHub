"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  previewText?: string;
  confirmText?: string;
  confirmLoadingText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: "danger" | "warning" | "primary";
}

/**
 * 🌲 FlameHub Shared Confirmation Modal Component
 * Features:
 * - Glassmorphic emerald/rose alert design
 * - Escape key & outside backdrop dismissal
 * - Body scroll locking during active modal
 * - Dynamic variant colors (danger, warning, primary)
 * - Optional preview snippet container
 */
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  previewText,
  confirmText = "Delete",
  confirmLoadingText = "Deleting...",
  cancelText = "Cancel",
  isLoading = false,
  variant = "danger",
}: ConfirmationModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md bg-[#003825] border border-[#005a3c] rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
      >
        {/* Header with Icon and Close Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isDanger
                  ? "bg-rose-500/20 border border-rose-500/30 text-rose-400"
                  : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-white font-heading">
                {title}
              </h3>
              <p className="text-xs text-emerald-200/70 leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Post Text Preview (Clean direct text, no nested card) */}
        {previewText && (
          <p className="text-xs text-emerald-100/80 italic pl-13 line-clamp-3 leading-relaxed">
            &ldquo;{previewText}&rdquo;
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40"
                : "bg-white hover:bg-emerald-50 text-[#006241]"
            }`}
          >
            {isDanger && <Trash2 className="w-3.5 h-3.5" />}
            <span>{isLoading ? confirmLoadingText : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
