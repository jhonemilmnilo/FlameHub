import { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Log In | FlameHub",
  description: "Log in to your FlameHub account",
};

export default function LoginPage() {
  return <LoginForm />;
}
