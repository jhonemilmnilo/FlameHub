import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getUserProfileAction,
  getUserPostsAction,
  getFollowersAction,
} from "@/features/profile/actions/profile.action";
import { ProfileDashboard } from "@/features/profile/components/profile-dashboard";

export const metadata: Metadata = {
  title: "User Profile | FlameHub",
  description: "View and manage your student profile, campus activity, and community followers on FlameHub.",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/auth/login");
  }

  // ⚡ Parallel Server-Side Fetching for sub-millisecond initial paint
  const [profileRes, postsRes, followersRes] = await Promise.all([
    getUserProfileAction(authUser.id),
    getUserPostsAction({ targetUserId: authUser.id, limit: 12 }),
    getFollowersAction(),
  ]);

  if (!profileRes.success || !profileRes.data) {
    redirect("/");
  }

  const postsData = postsRes.success && postsRes.data ? postsRes.data : { posts: [], nextCursor: null, hasMore: false };

  return (
    <ProfileDashboard
      profile={profileRes.data}
      posts={postsData.posts}
      initialNextCursor={postsData.nextCursor}
      initialHasMore={postsData.hasMore}
      followers={followersRes.success && followersRes.data ? followersRes.data : []}
    />
  );
}
