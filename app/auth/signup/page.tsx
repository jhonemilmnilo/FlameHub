import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an Account | FlameHub",
  description: "Join your university social community on FlameHub.",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
