import { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "FlameHub | Connect with your campus community",
  description: "FlameHub is the social platform for students to share moments, spark discussions, and connect across departments.",
};

export default function Home() {
  return <LoginForm />;
}


