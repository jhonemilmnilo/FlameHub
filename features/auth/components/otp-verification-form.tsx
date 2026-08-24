"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FlameHubLogo } from "@/components/ui/flamehub-logo";
import { verifyOtpAction } from "@/features/auth/actions/verify-otp.action";
import { resendOtpAction } from "@/features/auth/actions/resend-otp.action";
import { getEmailLockoutStatusAction } from "@/features/auth/actions/check-lockout.action";
import { toast } from "sonner";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import Link from "next/link";

export function OtpVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [isPending, startTransition] = useTransition();
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // 🛡️ Progressive Lockout State
  const [lockout, setLockout] = useState<{ isLocked: boolean }>({
    isLocked: false,
  });

  // 6-digit OTP state
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 🔍 Check lockout status on page mount (cooldown is handled locally)
  useEffect(() => {
    if (email) {
      getEmailLockoutStatusAction(email).then((status) => {
        if (status.isLocked) {
          setOtp(["", "", "", "", "", ""]);
          setLockout({ isLocked: true });
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

  // 🔒 Remove precise countdown interval timer to prevent reconnaissance stopwatch attacks
  // Cooldown for Resend Code remains for legitimate UX

  // Handle single digit input + auto-focus forward
  const handleChange = (index: number, value: string) => {
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
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle pasting full 6-digit code
  const handlePaste = (e: React.ClipboardEvent) => {
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
      toast.error("Verification temporarily disabled due to multiple failed attempts. Please try again later.");
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
            setLockout({ isLocked: true });
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
        router.push("/");
        router.refresh();
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#004e34] sm:bg-[#006241] px-5 py-8 sm:px-6 sm:py-12 lg:px-8 font-sans antialiased text-white">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6 sm:mb-8 select-none">
        <div className="relative group transition-transform duration-300 hover:scale-105">
          <FlameHubLogo className="w-14 h-18 sm:w-16 sm:h-20 lg:w-20 lg:h-24" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading mt-2 text-white">
          FlameHub
        </h1>
      </div>

      {/* Main OTP Verification Card - Flat on mobile, Elevated card on tablet/desktop */}
      <div className="w-full max-w-lg bg-transparent sm:bg-[#004e34] rounded-none sm:rounded-2xl p-0 sm:p-8 md:p-10 shadow-none sm:shadow-[0_20px_50px_rgba(0,0,0,0.45),0_4px_12px_rgba(0,0,0,0.3)] border-0 sm:border sm:border-[#003d29] transition-all">
        <div className="text-center mb-6 sm:mb-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#003825] border border-emerald-500/40 flex items-center justify-center mb-3.5">
            <Mail className="w-6 h-6 text-emerald-300" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-white tracking-tight mb-2">
            Verify your email
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/80 max-w-sm mx-auto">
            We sent a 6-digit verification code to
          </p>
          <p className="text-xs sm:text-sm font-semibold text-white mt-1 break-all">
            {email}
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6 sm:space-y-8">
          {/* 6 Segmented Digit Input Boxes */}
          <div className="flex justify-center items-center gap-2.5 sm:gap-3.5" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                disabled={isPending}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-lg text-white transition-all selection:bg-transparent bg-[#00462e] border border-[#22c55e]/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                autoFocus={idx === 0}
              />
            ))}
          </div>

          {/* Submit Action Button */}
          <div className="flex flex-col items-center pt-2">
            <button
              type="submit"
              disabled={isPending || otp.join("").length < 6}
              className="w-52 sm:w-60 py-3 px-6 rounded-full bg-white hover:bg-emerald-50 text-[#006241] font-black text-sm sm:text-base tracking-wider uppercase transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/30 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#006241]" />
                  <span>Verifying...</span>
                </>
              ) : (
                "VERIFY & CONTINUE"
              )}
            </button>

            {/* Resend Cooldown Section */}
            <div className="mt-6 text-center">
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
                  disabled={isResending}
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

            {/* Navigation Links: Back to Login / Back to Sign Up */}
            <div className="mt-4 w-full flex items-center justify-center gap-3 text-xs text-emerald-200/80">
              <Link
                href="/auth/login"
                className="text-emerald-300 hover:text-white font-semibold underline underline-offset-2 transition-colors"
              >
                Log in
              </Link>
              <span className="text-emerald-400/40">•</span>
              <Link
                href="/auth/signup"
                className="text-emerald-300 hover:text-white font-semibold underline underline-offset-2 transition-colors"
              >
                Sign up
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
