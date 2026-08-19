"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FlameHubLogo } from "@/components/ui/flamehub-logo";
import { verifyOtpAction } from "@/features/auth/actions/verify-otp.action";
import { resendOtpAction } from "@/features/auth/actions/resend-otp.action";
import { getEmailLockoutStatusAction } from "@/features/auth/actions/check-lockout.action";
import { toast } from "sonner";
import { Loader2, Mail, RefreshCw } from "lucide-react";

export function OtpVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [isPending, startTransition] = useTransition();
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(120);

  // 🛡️ Progressive Lockout State
  const [lockout, setLockout] = useState<{ isLocked: boolean; remainingSeconds: number; tier: number }>({
    isLocked: false,
    remainingSeconds: 0,
    tier: 0,
  });

  // 6-digit OTP state
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 🔍 Check lockout status on initial page mount
  useEffect(() => {
    if (email) {
      getEmailLockoutStatusAction(email).then((status) => {
        if (status.isLocked) {
          setOtp(["", "", "", "", "", ""]);
          setLockout(status);
        }
      });
    }
  }, [email]);

  // 120s cooldown timer for Resend Code
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // 🔒 Live countdown timer for Security Lockout
  useEffect(() => {
    if (lockout.isLocked && lockout.remainingSeconds > 0) {
      const lockTimer = setInterval(() => {
        setLockout((prev) => {
          if (prev.remainingSeconds <= 1) {
            clearInterval(lockTimer);
            return { isLocked: false, remainingSeconds: 0, tier: 0 };
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);
      return () => clearInterval(lockTimer);
    }
  }, [lockout.isLocked, lockout.remainingSeconds]);

  // Format seconds into MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle single digit input + auto-focus forward
  const handleChange = (index: number, value: string) => {
    if (lockout.isLocked) return;

    const sanitized = value.replace(/[^0-9]/g, "");

    if (sanitized.length === 0) {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
      return;
    }

    const char = sanitized.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);

    if (index < 5 && char) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace key + auto-focus backwards
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (lockout.isLocked) return;
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle pasting full 6-digit code
  const handlePaste = (e: React.ClipboardEvent) => {
    if (lockout.isLocked) return;
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);

    if (pastedData.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedData[i] || "";
      }
      setOtp(newOtp);

      const targetIdx = Math.min(pastedData.length, 5);
      inputRefs.current[targetIdx]?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockout.isLocked) {
      toast.error(`Verification is locked for ${formatTime(lockout.remainingSeconds)}.`);
      return;
    }

    const code = otp.join("");

    if (code.length < 6) {
      toast.error("Please enter all 6 digits of the verification code.");
      return;
    }

    if (!email) {
      toast.error("Email address missing. Please go back to registration.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await verifyOtpAction({ email, token: code });

        if (!result.success) {
          // 🚨 Clear all 6 digits immediately when verification fails
          setOtp(["", "", "", "", "", ""]);
          inputRefs.current[0]?.focus();

          if (result.lockout?.isLocked) {
            setLockout({
              isLocked: true,
              remainingSeconds: result.lockout.remainingSeconds,
              tier: result.lockout.tier,
            });
            toast.error(result.error, { duration: 6000 });
          } else {
            toast.error(result.error);
          }
          return;
        }

        // Clean up signup draft from sessionStorage
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("flamehub_signup_draft");
        }

        toast.success("Email verified successfully! Welcome to FlameHub.");
        router.push("/feed");
      } catch {
        toast.error("Failed to verify code. Please try again.");
      }
    });
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending || lockout.isLocked) return;
    if (!email) {
      toast.error("Email address missing.");
      return;
    }

    setIsResending(true);
    try {
      const result = await resendOtpAction({ email });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`A new 6-digit code has been sent to ${email}`);
      setCooldown(120);
    } catch {
      toast.error("Failed to resend code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#006241] p-4 sm:p-6 lg:p-8 font-sans antialiased text-white">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6 select-none">
        <div className="relative group transition-transform duration-300 hover:scale-105">
          <FlameHubLogo className="w-16 h-20 sm:w-20 sm:h-24" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading mt-1 text-white">
          FlameHub
        </h1>
      </div>

      {/* Main OTP Verification Card */}
      <div className="w-full max-w-lg bg-[#004e34] rounded-lg p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.45),0_4px_12px_rgba(0,0,0,0.3)] transition-all">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#003825] border border-emerald-500/40 flex items-center justify-center mb-3">
            <Mail className="w-6 h-6 text-emerald-300" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-white tracking-tight mb-1.5">
            Verify your email
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/80 max-w-sm mx-auto">
            We sent a 6-digit verification code to
          </p>
          <p className="text-xs sm:text-sm font-semibold text-white mt-0.5 break-all">
            {email}
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          {/* 6 Segmented Digit Input Boxes */}
          <div className="flex justify-center items-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                disabled={lockout.isLocked || isPending}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-sm text-white transition-all selection:bg-transparent ${
                  lockout.isLocked
                    ? "bg-[#002f1f] border-emerald-900/40 text-white/20 cursor-not-allowed"
                    : "bg-[#00462e] border border-[#22c55e]/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                }`}
                autoFocus={idx === 0 && !lockout.isLocked}
              />
            ))}
          </div>

          {/* Submit Action Button */}
          <div className="flex flex-col items-center pt-2">
            <button
              type="submit"
              disabled={isPending || otp.join("").length < 6 || lockout.isLocked}
              className="w-48 sm:w-56 py-2.5 px-6 rounded-full bg-white hover:bg-emerald-50 text-[#006241] font-black text-sm sm:text-base tracking-wider uppercase transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/30 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#006241]" />
                  <span>Verifying...</span>
                </>
              ) : lockout.isLocked ? (
                `LOCKED (${formatTime(lockout.remainingSeconds)})`
              ) : (
                "VERIFY & CONTINUE"
              )}
            </button>

            {/* Resend Cooldown Section */}
            <div className="mt-5 text-center">
              <p className="text-xs text-emerald-200/80">
                Didn&apos;t receive the code?{" "}
                {cooldown > 0 ? (
                  <span className="text-emerald-300 font-semibold">
                    Resend in {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending || lockout.isLocked}
                    className="text-emerald-300 hover:text-white font-semibold underline underline-offset-2 transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      "Resend Code"
                    )}
                  </button>
                )}
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
