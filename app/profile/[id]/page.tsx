import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getUserProfileAction,
  getUserPostsAction,
  getFollowersAction,
} from "@/features/profile/actions/profile.action";
import { ProfileDashboard } from "@/features/profile/components/profile-dashboard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const profileRes = await getUserProfileAction(id);
  const name = profileRes.success && profileRes.data ? profileRes.data.displayName : "Student";
  return {
    title: `${name}'s Profile | FlameHub`,
    description: `Connect with ${name} on FlameHub campus network.`,
  };
}

export default async function UserProfileByIdPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/auth/login");
  }

  const [profileRes, postsRes, followersRes] = await Promise.all([
    getUserProfileAction(id),
    getUserPostsAction(id),
    getFollowersAction(),
  ]);

  if (!profileRes.success || !profileRes.data) {
    redirect("/");
  }

  return (
    <ProfileDashboard
      profile={profileRes.data}
      posts={postsRes.success && postsRes.data ? postsRes.data : []}
      followers={followersRes.success && followersRes.data ? followersRes.data : []}
    />
  );
}
