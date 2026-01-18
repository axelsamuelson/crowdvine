"use client";

import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { SocialProfileHeader } from "@/components/profile/social-profile-header";
import { SocialProfileTabs } from "@/components/profile/social-profile-tabs";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  full_name: string;
  handle?: string;
  avatar_image_path?: string;
  description?: string;
  created_at?: string;
}

export default function SocialProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      // Fetch current user's profile
      const userResponse = await fetch("/api/user/profile");
      if (userResponse.ok) {
        const data = await userResponse.json();
        setProfile(data.profile);
        setIsOwnProfile(true);
      }

      // TODO: Fetch followers/following counts
      // TODO: Fetch follow status if viewing another user's profile

      setLoading(false);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      // TODO: Implement follow API call
      toast.success("Following user");
      setIsFollowing(true);
      setFollowersCount((prev) => prev + 1);
    } catch (error) {
      console.error("Error following user:", error);
      toast.error("Failed to follow user");
    }
  };

  const handleUnfollow = async () => {
    try {
      // TODO: Implement unfollow API call
      toast.success("Unfollowed user");
      setIsFollowing(false);
      setFollowersCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast.error("Failed to unfollow user");
    }
  };

  const handleSettings = () => {
    // TODO: Open settings modal
    toast.info("Settings coming soon");
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted-foreground">Loading profile...</div>
        </div>
      </PageLayout>
    );
  }

  if (!profile) {
    return (
      <PageLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted-foreground">Profile not found</div>
        </div>
      </PageLayout>
    );
  }

  const userName = profile.full_name || "User";
  const avatarUrl = profile.avatar_image_path
    ? profile.avatar_image_path.startsWith("http")
      ? profile.avatar_image_path
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_image_path}`
    : undefined;

  const joinedDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : undefined;

  const tabs = [
    { id: "overview", label: "Overview", count: undefined },
    { id: "reservations", label: "Reservations", count: 0 },
    { id: "wines", label: "Wines", count: 0 },
    { id: "activity", label: "Activity", count: undefined },
  ];

  return (
    <PageLayout>
      <div className="mx-auto max-w-4xl">
        {/* Profile Header */}
        <SocialProfileHeader
          userName={userName}
          userHandle={profile.handle}
          avatarUrl={avatarUrl}
          bio={profile.description}
          joinedDate={joinedDate}
          followersCount={followersCount}
          followingCount={followingCount}
          isFollowing={isFollowing}
          isOwnProfile={isOwnProfile}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
          onSettings={handleSettings}
        />

        {/* Tabs */}
        <div className="mt-4 border-t border-border">
          <SocialProfileTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "overview" && (
            <div className="text-muted-foreground">Overview content coming soon</div>
          )}
          {activeTab === "reservations" && (
            <div className="text-muted-foreground">Reservations content coming soon</div>
          )}
          {activeTab === "wines" && (
            <div className="text-muted-foreground">Wines content coming soon</div>
          )}
          {activeTab === "activity" && (
            <div className="text-muted-foreground">Activity content coming soon</div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}



