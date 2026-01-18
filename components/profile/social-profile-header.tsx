"use client";

import { useState } from "react";
import {
  Calendar,
  LinkIcon,
  Settings,
  UserPlus,
  UserMinus,
  MessageCircle,
  MoreHorizontal,
} from "lucide-react";
import { LevelBadge } from "@/components/membership/level-badge";
import { MembershipLevel } from "@/lib/membership/points-engine";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SocialProfileHeaderProps {
  // User data
  userName: string;
  userHandle?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  website?: string;
  joinedDate?: string;
  
  // Stats
  followersCount: number;
  followingCount: number;
  
  // Follow status
  isFollowing?: boolean;
  isOwnProfile?: boolean;

  // Membership badge
  membershipLevel?: MembershipLevel;
  membershipLabel?: string;
  
  // Actions
  onFollow?: () => void;
  onUnfollow?: () => void;
  onMessage?: () => void;
  onSettings?: () => void;
}

export function SocialProfileHeader({
  userName,
  userHandle,
  avatarUrl,
  coverImageUrl,
  bio,
  website,
  joinedDate,
  followersCount,
  followingCount,
  isFollowing = false,
  isOwnProfile = false,
  onFollow,
  onUnfollow,
  onMessage,
  onSettings,
  membershipLevel,
  membershipLabel,
}: SocialProfileHeaderProps) {
  const [isCurrentlyFollowing, setIsCurrentlyFollowing] = useState(isFollowing);

  const handleFollowClick = () => {
    if (isCurrentlyFollowing) {
      onUnfollow?.();
      setIsCurrentlyFollowing(false);
    } else {
      onFollow?.();
      setIsCurrentlyFollowing(true);
    }
  };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-full">
      {/* Cover Image */}
      <div className="h-[120px] w-full overflow-hidden sm:h-[200px]">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={`${userName}'s cover`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/10 via-muted/50 to-accent/20" />
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 md:px-sides pb-4">
        <div className="relative flex justify-between">
          {/* Avatar */}
          <Avatar
            className={cn(
              "-mt-[50px] h-[100px] w-[100px] border-4 border-background sm:-mt-[68px] sm:h-[136px] sm:w-[136px]"
            )}
          >
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={userName} className="object-cover" />
            ) : (
              <AvatarFallback className="bg-primary/10 text-primary text-2xl sm:text-4xl">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>

          {/* Action Buttons */}
          <div className="mt-3 flex items-center gap-2">
            {isOwnProfile ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full border border-border hover:bg-muted"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => (window.location.href = "/profile/perks")}
                    >
                      My Perks
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => (window.location.href = "/profile/invite")}
                    >
                      Invite Friends
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="sm"
                className="rounded-full border-border font-semibold"
                onClick={() => {
                  if (onSettings) {
                    onSettings();
                  }
                  // navigate to edit profile
                  window.location.href = "/profile/edit";
                }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full border border-border hover:bg-muted"
                  onClick={onMessage}
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>
                <Button
                  variant={isCurrentlyFollowing ? "outline" : "default"}
                  size="sm"
                  className="rounded-full border-border font-semibold"
                  onClick={handleFollowClick}
                >
                  {isCurrentlyFollowing ? (
                    <>
                      <UserMinus className="mr-2 h-4 w-4" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Follow
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full border border-border hover:bg-muted"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{userName}</h1>
            {membershipLevel && (
              <LevelBadge
                level={membershipLevel}
                size="sm"
                showLabel={false}
                className="inline-flex align-middle scale-[0.75]"
              />
            )}
          </div>
          {userHandle && (
            <p className="text-muted-foreground">@{userHandle}</p>
          )}
        </div>

        {/* Bio */}
        {bio && (
          <p className="mt-3 text-foreground">{bio}</p>
        )}

        {/* Website & Joined Date */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 text-sm text-muted-foreground">
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-foreground hover:underline"
            >
              <LinkIcon className="h-4 w-4" />
              {website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {joinedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Joined {joinedDate}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="mt-3 flex gap-5 text-sm">
          <button className="hover:underline">
            <span className="font-semibold">{followingCount}</span>{" "}
            <span className="text-muted-foreground">Following</span>
          </button>
          <button className="hover:underline">
            <span className="font-semibold">{followersCount}</span>{" "}
            <span className="text-muted-foreground">Followers</span>
          </button>
        </div>
      </div>
    </div>
  );
}

