import { Suspense } from "react";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/features/auth/components/login-form";
import { HomeFeedStreamer } from "@/features/feed/components/home-feed-streamer";
import RootLoading from "./loading";

export const metadata: Metadata = {
  title: "FlameHub | Connect with your campus community",
  description: "FlameHub is the social platform for students to share moments, spark discussions, and connect across departments.",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // If not logged in, render the Landing & Login Gateway
  if (!authUser) {
    return <LoginForm />;
  }

  const meta = authUser.user_metadata || {};
  const firstName = meta.first_name || "";
  const lastName = meta.last_name || "";
  const metaDisplayName = meta.display_name || `${firstName} ${lastName}`.trim() || "";
  const metaStudentId = meta.student_id || "";

  // ⚡ Fetch DB user to retrieve freshest avatarUrl & details
  const { prisma } = await import("@/lib/prisma");
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      avatarUrl: true,
      displayName: true,
      studentId: true,
      nickname: true,
    },
  });

  const currentUser = {
    name: dbUser?.displayName || metaDisplayName || "Campus Student",
    studentId: dbUser?.studentId || metaStudentId || "00-0000-000000",
    avatarUrl: dbUser?.avatarUrl || null,
    nickname: dbUser?.nickname || null,
  };

  return (
    <Suspense fallback={<RootLoading />}>
      <HomeFeedStreamer currentUser={currentUser} />
    </Suspense>
  );
}

