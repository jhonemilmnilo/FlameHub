import { Suspense } from "react";
import { OtpVerificationForm } from "@/features/auth/components/otp-verification-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Email | FlameHub",
  description: "Enter the 6-digit verification code sent to your student email.",
};

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#006241]" />}>
      <OtpVerificationForm />
    </Suspense>
  );
}
