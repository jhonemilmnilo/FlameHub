import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { getDepartmentOptionsAction } from "@/features/auth/actions/get-departments.action";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an Account | FlameHub",
  description: "Join your university social community on FlameHub.",
};

export default async function SignUpPage() {
  const departments = await getDepartmentOptionsAction();
  return <SignUpForm initialDepartments={departments} />;
}
