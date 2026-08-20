import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/features/auth/components/login-form";
import { HomeFeedDashboard } from "@/features/feed/components/home-feed-dashboard";
import { getFeedPostsAction } from "@/features/feed/actions/post.action";

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
  const displayName = meta.display_name || `${firstName} ${lastName}`.trim() || "";
  const studentId = meta.student_id || "";

  // ⚡ Server-Side Fetch 30 real posts
  const initialFeedData = await getFeedPostsAction({ limit: 30 });

  return (
    <HomeFeedDashboard
      currentUser={{
        name: displayName,
        studentId: studentId,
      }}
      initialPosts={initialFeedData.posts}
      initialNextCursor={initialFeedData.nextCursor}
      initialHasMore={initialFeedData.hasMore}
    />
  );
}
