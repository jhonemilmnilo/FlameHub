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
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-12 sm:gap-16 md:gap-24 lg:gap-36 xl:gap-44">
        {/* Left Side: Brand Logo & Title */}
        <div className="flex flex-col items-center select-none shrink-0">
          <div className="relative group transition-transform duration-300 hover:scale-105">
            <FlameHubLogo className="w-28 h-32 sm:w-36 sm:h-40 md:w-44 md:h-48 lg:w-48 lg:h-52" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight font-heading mt-4 text-white drop-shadow-md">
            FlameHub
          </h1>
        </div>

        {/* Right Side: High-End Elevated Form Box */}
        <div className="w-full max-w-md bg-transparent sm:bg-[#004e34] rounded-2xl p-0 sm:p-8 md:p-10 border-0 sm:border sm:border-[#003d29] shadow-none sm:shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-all">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-white/95 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder=""
                value={formData.email}
                onChange={handleChange}
                className={`w-full bg-[#00462e] border ${
                  fieldErrors.email
                    ? "border-rose-400 ring-1 ring-rose-400/80 bg-[#401212]/30"
                    : "border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e]"
                } rounded-[5px] px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none transition-all`}
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-rose-300 font-medium mt-1.5 animate-fadeIn flex items-center gap-1">
                  <span>⚠</span> {fieldErrors.email[0]}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-white/95 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder=""
                value={formData.password}
                onChange={handleChange}
                className={`w-full bg-[#00462e] border ${
                  fieldErrors.password
                    ? "border-rose-400 ring-1 ring-rose-400/80 bg-[#401212]/30"
                    : "border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e]"
                } rounded-[5px] px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none transition-all`}
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

            {/* Submit Action Button & Signup Link */}
            <div className="pt-4 flex flex-col items-center">
              <button
                type="submit"
                disabled={isPending}
                className="w-48 sm:w-52 py-2.5 sm:py-3 px-6 rounded-full bg-white hover:bg-emerald-50 text-[#006241] font-black text-sm sm:text-base tracking-wider uppercase transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-black/20 flex items-center justify-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
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

              <p className="mt-5 text-xs text-white/80 font-normal text-center">
                Don&apos;t have an account?{" "}
                <Link
                  href="/auth/signup"
                  className="text-white font-bold hover:underline transition-all block sm:inline mt-1 sm:mt-0"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
