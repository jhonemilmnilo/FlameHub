"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlameHubLogo } from "@/components/ui/flamehub-logo";
import { signUpAction } from "@/features/auth/actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export function SignUpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    studentId: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
    bio: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
    setFieldErrors({});

    startTransition(async () => {
      try {
        const result = await signUpAction(formData);

        if (!result.success) {
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors);
          }
          toast.error(result.error);
          return;
        }

        toast.success("Account created successfully! Welcome to FlameHub.");
        router.push("/feed");
      } catch {
        toast.error("An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#006241] p-4 sm:p-6 lg:p-8 font-sans antialiased text-white">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-5 select-none">
        <div className="relative group transition-transform duration-300 hover:scale-105">
          <FlameHubLogo className="w-16 h-20 sm:w-20 sm:h-24" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading mt-1 text-white">
          FlameHub
        </h1>
      </div>

      {/* Main Registration Card */}
      <div className="w-full max-w-2xl bg-[#004e34] rounded-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.45),0_4px_12px_rgba(0,0,0,0.3)] transition-all">
        <h2 className="text-xl sm:text-2xl font-bold font-heading text-center text-white mb-6 tracking-tight">
          Create an account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Top Row: Last name, First name & Student ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Last name & First name side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1.5">
                  Last name
                </label>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full bg-[#00462e] border border-[#22c55e]/50 rounded-sm px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e] transition-all"
                />
                {fieldErrors.lastName && (
                  <p className="text-xs text-rose-300 mt-1">{fieldErrors.lastName[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1.5">
                  First name
                </label>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full bg-[#00462e] border border-[#22c55e]/50 rounded-sm px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e] transition-all"
                />
                {fieldErrors.firstName && (
                  <p className="text-xs text-rose-300 mt-1">{fieldErrors.firstName[0]}</p>
                )}
              </div>
            </div>

            {/* Student ID */}
            <div>
              <label className="block text-xs font-semibold text-white/90 mb-1.5">
                Student ID
              </label>
              <input
                type="text"
                name="studentId"
                required
                value={formData.studentId}
                onChange={handleChange}
                className="w-full bg-[#00462e] border border-[#22c55e]/50 rounded-sm px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e] transition-all"
              />
              {fieldErrors.studentId && (
                <p className="text-xs text-rose-300 mt-1">{fieldErrors.studentId[0]}</p>
              )}
            </div>
          </div>

          {/* Middle Row: Email & Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/90 mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-[#00462e] border border-[#22c55e]/50 rounded-sm px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e] transition-all"
              />
              {fieldErrors.email && (
                <p className="text-xs text-rose-300 mt-1">{fieldErrors.email[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/90 mb-1.5">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-[#00462e] border border-[#22c55e]/50 rounded-sm px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e] transition-all"
              />
              {fieldErrors.password && (
                <p className="text-xs text-rose-300 mt-1">{fieldErrors.password[0]}</p>
              )}
            </div>
          </div>

          {/* Department & Confirm Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/90 mb-1.5">
                Department
              </label>
              <input
                type="text"
                name="department"
                required
                value={formData.department}
                onChange={handleChange}
                className="w-full bg-[#00462e] border border-[#22c55e]/50 rounded-sm px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e] transition-all"
              />
              {fieldErrors.department && (
                <p className="text-xs text-rose-300 mt-1">{fieldErrors.department[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/90 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full bg-[#00462e] border border-[#22c55e]/50 rounded-sm px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e] transition-all"
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-rose-300 mt-1">{fieldErrors.confirmPassword[0]}</p>
              )}
            </div>
          </div>

          {/* Add Bio */}
          <div>
            <label className="block text-xs font-semibold text-white/90 mb-1.5">
              Add bio
            </label>
            <textarea
              name="bio"
              rows={4}
              value={formData.bio}
              onChange={handleChange}
              className="w-full bg-[#00462e] border border-[#22c55e]/50 rounded-sm px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e] transition-all resize-none"
            />
            {fieldErrors.bio && (
              <p className="text-xs text-rose-300 mt-1">{fieldErrors.bio[0]}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-3 flex flex-col items-center">
            <button
              type="submit"
              disabled={isPending}
              className="w-48 sm:w-56 py-2.5 px-6 rounded-full bg-white hover:bg-emerald-50 text-[#006241] font-black text-sm sm:text-base tracking-wider uppercase transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/30 flex items-center justify-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#074737]" />
                  <span>Creating...</span>
                </>
              ) : (
                "CREATE"
              )}
            </button>

            <p className="mt-4 text-xs text-emerald-200/80">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-emerald-300 hover:text-white font-semibold underline underline-offset-2">
                Log in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
