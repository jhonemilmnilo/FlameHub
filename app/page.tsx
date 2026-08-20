import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/features/auth/components/login-form";
import { HomeFeedDashboard } from "@/features/feed/components/home-feed-dashboard";

export const metadata: Metadata = {
  title: "FlameHub | Connect with your campus community",
  description: "FlameHub is the social platform for students to share moments, spark discussions, and connect across departments.",
};

import { getFeedPostsAction } from "@/features/feed/actions/post.action";

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
  const displayName = meta.display_name || `${firstName} ${lastName}`.trim() || "Marcel Magbual";
  const studentId = meta.student_id || "03-2122-034361";

  // Fetch real posts directly from database
  const initialPosts = await getFeedPostsAction();

  // If logged in, render the UI Dashboard matching the mockup!
  return (
    <HomeFeedDashboard
      currentUser={{
        name: displayName,
        studentId: studentId,
      }}
      initialPosts={initialPosts}
    />
  );
}


