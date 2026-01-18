"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { SocialProfileHeader } from "@/components/profile/social-profile-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MembershipLevel } from "@/lib/membership/points-engine";

interface PublicProfile {
  id: string;
  full_name?: string;
  avatar_image_path?: string;
  description?: string;
  created_at?: string;
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params?.id as string | undefined;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [membershipLevel, setMembershipLevel] =
    useState<MembershipLevel | undefined>(undefined);
  const [membershipLabel, setMembershipLabel] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!profileId) return;
    fetchProfile();
    fetchFollowStats();
    fetchMembership();
  }, [profileId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/user/profile/${profileId}`);
      if (res.status === 401) {
        router.push("/log-in");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setError(null);
      } else {
        setError("Failed to load profile");
      }
    } catch (e) {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowStats = async () => {
    if (!profileId) return;
    try {
      const res = await fetch(`/api/user/follow/stats?userId=${profileId}`);
      if (res.status === 401) {
        router.push("/log-in");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setFollowersCount(data.followers || 0);
        setFollowingCount(data.following || 0);
        if (typeof data.isFollowing === "boolean") {
          setIsFollowing(data.isFollowing);
        }
      }
    } catch (error) {
      console.error("Error fetching follow stats", error);
    }
  };

  const toggleFollow = async () => {
    if (!profile) return;
    try {
      const res = await fetch("/api/user/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: profile.id,
          action: isFollowing ? "unfollow" : "follow",
        }),
      });
      if (res.ok) {
        setIsFollowing((f) => !f);
        setFollowersCount((c) => (isFollowing ? Math.max(0, c - 1) : c + 1));
      } else {
        toast.error("Could not update follow");
      }
    } catch (error) {
      toast.error("Could not update follow");
    }
  };

  const fetchMembership = async () => {
    if (!profileId) return;
    try {
      const res = await fetch(`/api/user/membership/${profileId}`);
      if (res.ok) {
        const data = await res.json();
        setMembershipLevel(data.membership?.level);
        setMembershipLabel(data.levelInfo?.name);
      }
    } catch (error) {
      console.error("Error fetching membership for profile:", error);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (error || !profile) {
    return (
      <PageLayout>
        <div className="max-w-3xl mx-auto p-sides py-12 text-center space-y-3">
          <h1 className="text-xl font-semibold">Profile not found</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button variant="outline" onClick={() => router.push("/profile")}>
            Back to my profile
          </Button>
        </div>
      </PageLayout>
    );
  }

  const avatarUrl = profile.avatar_image_path
    ? profile.avatar_image_path.startsWith("http")
      ? profile.avatar_image_path
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_image_path}`
    : undefined;

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : undefined;

  return (
    <PageLayout>
      <div className="w-full max-w-5xl mx-auto p-4 md:p-sides">
        <div className="mb-4 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <SocialProfileHeader
          userId={profile.id}
          userName={profile.full_name || "User"}
          avatarUrl={avatarUrl}
          bio={profile.description}
          joinedDate={joinedDate}
          membershipLevel={membershipLevel}
          membershipLabel={membershipLabel}
          followersCount={followersCount}
          followingCount={followingCount}
          isFollowing={isFollowing}
          isOwnProfile={false}
          onFollow={toggleFollow}
          onUnfollow={toggleFollow}
        />
      </div>
    </PageLayout>
  );
}

