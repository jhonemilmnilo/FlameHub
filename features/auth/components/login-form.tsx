"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlameHubLogo } from "@/components/ui/flamehub-logo";
import { loginAction } from "@/features/auth/actions/login.action";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    honeypot: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string[]> = {};
    if (!formData.email.trim()) {
      errors.email = ["Email is required"];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = ["Please enter a valid email address"];
    }

    if (!formData.password) {
      errors.password = ["Password is required"];
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please fill in all required fields.");
      return;
    }

    setFieldErrors({});

    startTransition(async () => {
      try {
        const result = await loginAction(formData);

        if (!result.success) {
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors);
          }

          if (result.requiresVerification && result.email) {
            toast.info(result.error);
            router.push(`/auth/verify?email=${encodeURIComponent(result.email)}`);
            return;
          }

          toast.error(result.error);
          return;
        }

        toast.success("Verification code sent to your email!");
        router.push(result.data.redirectTo || `/auth/verify?email=${encodeURIComponent(formData.email)}`);
        router.refresh();
      } catch {
        toast.error("An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row items-center justify-center bg-[#004e34] sm:bg-[#006241] px-6 py-10 md:px-12 lg:px-24 font-sans antialiased text-white">
      {/* Centered Desktop Layout: Left Brand Area & Right Login Form Card */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-10 sm:gap-14 md:gap-20 lg:gap-28">
        {/* Left Side: Brand Logo, Title & Value Prop (Facebook Style) */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left select-none shrink-0 max-w-sm lg:max-w-md">
          <div className="flex items-center gap-3.5 mb-3">
            <div className="relative group transition-transform duration-300 hover:scale-105">
              <FlameHubLogo className="w-16 h-18 sm:w-20 sm:h-22 md:w-24 md:h-28" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight font-heading text-white drop-shadow-md">
              FlameHub
            </h1>
          </div>
          <p className="text-base sm:text-lg text-emerald-100/90 font-medium leading-relaxed">
            Connect with your fellow campus students, share moments, and stay updated with what’s happening in your department.
          </p>
        </div>

        {/* Right Side: High-End Elevated Form Box */}
        <div className="w-full max-w-md bg-transparent sm:bg-[#004e34] rounded-2xl p-0 sm:p-7 md:p-8 border-0 sm:border sm:border-[#003d29] shadow-none sm:shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-all">
          <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-white/95 mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                autoComplete="off"
                spellCheck="false"
                placeholder="student@phinmaed.com"
                value={formData.email}
                onChange={handleChange}
                className={`w-full bg-[#00462e] border ${
                  fieldErrors.email
                    ? "border-rose-400 ring-1 ring-rose-400/80 bg-[#401212]/30"
                    : "border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e]"
                } rounded-md px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none transition-all`}
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-rose-300 font-medium mt-1.5 animate-fadeIn flex items-center gap-1">
                  <span>⚠</span> {fieldErrors.email[0]}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-white/95 mb-1.5">
                Password
              </label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className={`w-full bg-[#00462e] border ${
                  fieldErrors.password
                    ? "border-rose-400 ring-1 ring-rose-400/80 bg-[#401212]/30"
                    : "border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e]"
                } rounded-md px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none transition-all`}
              />
              {fieldErrors.password && (
                <p className="text-[11px] text-rose-300 font-medium mt-1.5 animate-fadeIn flex items-center gap-1">
                  <span>⚠</span> {fieldErrors.password[0]}
                </p>
              )}
            </div>

            {/* 🪤 Invisible Anti-Bot Honeypot */}
            <div aria-hidden="true" className="opacity-0 absolute -left-[9999px] -top-[9999px] h-0 w-0 pointer-events-none select-none">
              <input
                type="text"
                name="honeypot"
                tabIndex={-1}
                autoComplete="off"
                value={formData.honeypot}
                onChange={handleChange}
              />
            </div>

            {/* Submit Action Button */}
            <div className="pt-2 flex flex-col items-center">
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 sm:py-3 px-6 rounded-full bg-white hover:bg-emerald-50 text-[#006241] font-black text-sm sm:text-base tracking-wider uppercase transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-black/20 flex items-center justify-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#006241]" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  "LOG IN"
                )}
              </button>

              <div className="w-full flex items-center my-4">
                <div className="flex-1 border-t border-emerald-500/20"></div>
                <span className="px-3 text-xs text-emerald-200/60 uppercase tracking-widest font-semibold">or</span>
                <div className="flex-1 border-t border-emerald-500/20"></div>
              </div>

              {/* Facebook-style Secondary Action: Create new account */}
              <Link
                href="/auth/signup"
                className="w-auto px-6 py-2.5 rounded-full bg-[#006241] hover:bg-[#00704a] text-white font-bold text-xs sm:text-sm border border-[#22c55e]/40 transition-all duration-200 shadow-sm hover:scale-105 active:scale-95 text-center"
              >
                Create new account
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
