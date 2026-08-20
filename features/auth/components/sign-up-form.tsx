"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlameHubLogo } from "@/components/ui/flamehub-logo";
import { SearchableDropdown, SearchableOption } from "@/components/ui/searchable-dropdown";
import { signUpAction } from "@/features/auth/actions/sign-up.action";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

interface SignUpFormProps {
  initialDepartments?: SearchableOption[];
}

export function SignUpForm({ initialDepartments = [] }: SignUpFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState(() => {
    // Synchronous client fallback without SSR mismatch
    return {
      lastName: "",
      firstName: "",
      studentId: "",
      email: "",
      password: "",
      confirmPassword: "",
      department: "",
      bio: "",
      honeypot: "",
    };
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Real-time password requirement checklist
  const allPasswordRequirements = [
    { label: "At least 8 characters", met: formData.password.length >= 8 },
    { label: "At least 1 uppercase letter (A-Z)", met: /[A-Z]/.test(formData.password) },
    { label: "At least 1 lowercase letter (a-z)", met: /[a-z]/.test(formData.password) },
    { label: "At least 1 number (0-9)", met: /[0-9]/.test(formData.password) },
    { label: "At least 1 special character (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(formData.password) },
  ];

  const unmetRequirements = allPasswordRequirements.filter((req) => !req.met);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Save non-sensitive draft fields to sessionStorage
      if (typeof window !== "undefined" && name !== "password" && name !== "confirmPassword") {
        try {
          sessionStorage.setItem(
            "flamehub_signup_draft",
            JSON.stringify({
              lastName: updated.lastName,
              firstName: updated.firstName,
              studentId: updated.studentId,
              email: updated.email,
              department: updated.department,
              bio: updated.bio,
            })
          );
        } catch {
          // Ignore storage quota
        }
      }

      return updated;
    });

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateClientSide = () => {
    const errors: Record<string, string[]> = {};

    if (!formData.lastName.trim()) errors.lastName = ["Last name is required"];
    if (!formData.firstName.trim()) errors.firstName = ["First name is required"];
    if (!formData.studentId.trim()) errors.studentId = ["Student ID is required"];
    if (!formData.email.trim()) {
      errors.email = ["Email address is required"];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = ["Please enter a valid email address"];
    }

    if (!formData.password) {
      errors.password = ["Password is required"];
    } else if (unmetRequirements.length > 0) {
      errors.password = ["Password does not meet all security criteria"];
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = ["Please confirm your password"];
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = ["Passwords do not match"];
    }

    if (!formData.department) {
      errors.department = ["Please select your college/department"];
    }

    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const clientErrors = validateClientSide();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      toast.error("Please fill in all required fields.");
      return;
    }

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

        if (result.data.isAlreadyActive) {
          toast.info(
            "An active verification code was recently sent. Please check your inbox or spam folder.",
            { duration: 6000 }
          );
        } else {
          toast.success("Verification code sent to your email!");
        }

        router.push(`/auth/verify?email=${encodeURIComponent(formData.email)}`);
      } catch {
        toast.error("An unexpected error occurred. Please try again.");
      }
    });
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

      {/* Form Container - Professional Responsive Elevation */}
      <div className="w-full max-w-2xl bg-transparent sm:bg-[#004e34] rounded-none sm:rounded-2xl p-0 sm:p-8 md:p-10 border-0 sm:border sm:border-[#003d29] shadow-none sm:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all">
        <h2 className="text-xl sm:text-2xl font-bold font-heading text-center text-white mb-6 sm:mb-8 tracking-tight">
          Create an account
        </h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
          {/* Row 1: Last name, First name (Col 1) & Student ID (Col 2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Last name & First name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/95 mb-1.5">
                  Last name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full bg-[#00462e] border ${fieldErrors.lastName
                      ? "border-rose-400 ring-1 ring-rose-400/80 bg-[#401212]/30"
                      : "border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e]"
                    } rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none transition-all`}
                />
                {fieldErrors.lastName && (
                  <p className="text-[11px] text-rose-300 font-medium mt-1.5 animate-fadeIn flex items-center gap-1">
                    <span>⚠</span> {fieldErrors.lastName[0]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/95 mb-1.5">
                  First name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full bg-[#00462e] border ${fieldErrors.firstName
                      ? "border-rose-400 ring-1 ring-rose-400/80 bg-[#401212]/30"
                      : "border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e]"
                    } rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none transition-all`}
                />
                {fieldErrors.firstName && (
                  <p className="text-[11px] text-rose-300 font-medium mt-1.5 animate-fadeIn flex items-center gap-1">
                    <span>⚠</span> {fieldErrors.firstName[0]}
                  </p>
                )}
              </div>
            </div>

            {/* Student ID */}
            <div>
              <label className="block text-xs font-semibold text-white/95 mb-1.5">
                Student ID <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                name="studentId"
                placeholder="e.g. 02-2024-12345"
                value={formData.studentId}
                onChange={handleChange}
                className={`w-full bg-[#00462e] border ${fieldErrors.studentId
                    ? "border-rose-400 ring-1 ring-rose-400/80 bg-[#401212]/30"
                    : "border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e]"
                  } rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none transition-all`}
              />
              {fieldErrors.studentId && (
                <p className="text-[11px] text-rose-300 font-medium mt-1.5 animate-fadeIn flex items-center gap-1">
                  <span>⚠</span> {fieldErrors.studentId[0]}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Email (Col 1) & Department (Col 2 on desktop, before password on mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-xs font-semibold text-white/95 mb-1.5">
                Email <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="student@phinmaed.com"
                value={formData.email}
                onChange={handleChange}
                className={`w-full bg-[#00462e] border ${fieldErrors.email
                    ? "border-rose-400 ring-1 ring-rose-400/80 bg-[#401212]/30"
                    : "border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e]"
                  } rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none transition-all`}
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-rose-300 font-medium mt-1.5 animate-fadeIn flex items-center gap-1">
                  <span>⚠</span> {fieldErrors.email[0]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/95 mb-1.5">
                Department <span className="text-rose-400">*</span>
              </label>
              <SearchableDropdown
                name="department"
                value={formData.department}
                onChange={(val) => {
                  setFormData((prev) => ({ ...prev, department: val }));
                  if (fieldErrors.department) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.department;
                      return next;
                    });
                  }
                }}
                options={initialDepartments}
                placeholder="Select your department..."
                searchPlaceholder="Search by code or college name..."
                error={fieldErrors.department?.[0]}
              />
            </div>
          </div>

          {/* Row 3: Password (Col 1) & Confirm Password (Col 2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-xs font-semibold text-white/95 mb-1.5">
                Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full bg-[#00462e] border ${fieldErrors.password
                      ? "border-rose-400 ring-1 ring-rose-400/80 bg-[#401212]/30"
                      : "border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e]"
                    } rounded-lg px-3.5 py-2.5 pr-10 text-sm text-white placeholder-white/20 focus:outline-none transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300/70 hover:text-white transition-colors cursor-pointer p-1.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-[11px] text-rose-300 font-medium mt-1.5 animate-fadeIn flex items-center gap-1">
                  <span>⚠</span> {fieldErrors.password[0]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/95 mb-1.5">
                Confirm Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full bg-[#00462e] border ${fieldErrors.confirmPassword
                      ? "border-rose-400 ring-1 ring-rose-400/80 bg-[#401212]/30"
                      : "border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e]"
                    } rounded-lg px-3.5 py-2.5 pr-10 text-sm text-white placeholder-white/20 focus:outline-none transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300/70 hover:text-white transition-colors cursor-pointer p-1.5"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-[11px] text-rose-300 font-medium mt-1.5 animate-fadeIn flex items-center gap-1">
                  <span>⚠</span> {fieldErrors.confirmPassword[0]}
                </p>
              )}
            </div>
          </div>

          {/* 🔒 Dynamic Password Requirements */}
          {formData.password.length > 0 && unmetRequirements.length > 0 && (
            <div className="bg-[#003825] border border-emerald-500/30 rounded-lg p-3.5 transition-all animate-fadeIn">
              <p className="text-xs font-semibold text-emerald-200 mb-2">
                Remaining password requirements ({unmetRequirements.length}):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {unmetRequirements.map((req, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-white/80 transition-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>{req.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Row 4: Add Bio (Full Width) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-white/95">
                Add bio
              </label>
              <span className="text-[11px] text-emerald-300/60 font-medium italic">
                Optional
              </span>
            </div>
            <textarea
              name="bio"
              rows={4}
              placeholder="Tell other students about yourself..."
              value={formData.bio}
              onChange={handleChange}
              className="w-full bg-[#00462e] border border-[#22c55e]/50 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e] transition-all resize-none"
            />
            {fieldErrors.bio && (
              <p className="text-xs text-rose-300 mt-1.5">{fieldErrors.bio[0]}</p>
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

          {/* Submit Button & Login Link */}
          <div className="pt-5 sm:pt-6 flex flex-col items-center">
            <button
              type="submit"
              disabled={isPending}
              className="w-48 sm:w-52 py-2.5 sm:py-3 px-6 rounded-full bg-white hover:bg-emerald-50 text-[#006241] font-black text-sm sm:text-base tracking-wider uppercase transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-black/20 flex items-center justify-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
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
