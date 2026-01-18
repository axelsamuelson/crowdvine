"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  LinkIcon,
  Settings,
  UserPlus,
  UserMinus,
  MessageCircle,
  MoreHorizontal,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface SocialProfileHeaderProps {
  // User data
  userId?: string;
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

  // Suggestions (mobile UX)
  suggestedUsers?: Array<{
    id: string;
    full_name?: string;
    avatar_image_path?: string;
    description?: string;
  }>;
  suggestionsLoading?: boolean;
  suggestionsError?: string | null;
  onFollowSuggestedUser?: (userId: string) => void;
}

export function SocialProfileHeader({
  userId,
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
  suggestedUsers = [],
  suggestionsLoading = false,
  suggestionsError = null,
  onFollowSuggestedUser,
}: SocialProfileHeaderProps) {
  const [isCurrentlyFollowing, setIsCurrentlyFollowing] = useState(isFollowing);
  const [followDialogOpen, setFollowDialogOpen] = useState(false);
  const [followTab, setFollowTab] = useState<"following" | "followers">(
    "following",
  );
  const [query, setQuery] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [followersList, setFollowersList] = useState<any[] | null>(null);
  const [followingList, setFollowingList] = useState<any[] | null>(null);
  const [mobileSuggestionsOpen, setMobileSuggestionsOpen] = useState(false);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<
    Set<string>
  >(new Set());

  const visibleSuggestedUsers = useMemo(() => {
    if (!suggestedUsers?.length) return [];
    if (dismissedSuggestionIds.size === 0) return suggestedUsers;
    return suggestedUsers.filter((u) => u?.id && !dismissedSuggestionIds.has(u.id));
  }, [suggestedUsers, dismissedSuggestionIds]);

  const openFollowDialog = (tab: "following" | "followers") => {
    setFollowTab(tab);
    setFollowDialogOpen(true);
  };

  useEffect(() => {
    if (!followDialogOpen || !userId) return;

    const run = async () => {
      setListError(null);
      setLoadingList(true);
      try {
        if (followTab === "followers" && followersList === null) {
          const res = await fetch(
            `/api/user/follow/list?userId=${encodeURIComponent(
              userId,
            )}&type=followers`,
          );
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error || "Failed to load followers");
          setFollowersList(Array.isArray(json.users) ? json.users : []);
        }
        if (followTab === "following" && followingList === null) {
          const res = await fetch(
            `/api/user/follow/list?userId=${encodeURIComponent(
              userId,
            )}&type=following`,
          );
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error || "Failed to load following");
          setFollowingList(Array.isArray(json.users) ? json.users : []);
        }
      } catch (e: any) {
        setListError(e?.message || "Failed to load list");
      } finally {
        setLoadingList(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followDialogOpen, followTab, userId]);

  const visibleUsers = useMemo(() => {
    const list = followTab === "followers" ? followersList : followingList;
    if (!list) return null;
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u: any) => {
      const name = String(u.full_name || "").toLowerCase();
      const desc = String(u.description || "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [followersList, followingList, followTab, query]);

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
                {/* Mobile: quick suggestions */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "sm:hidden rounded-full border border-border hover:bg-muted",
                    mobileSuggestionsOpen && "bg-muted",
                  )}
                  onClick={() => setMobileSuggestionsOpen((v) => !v)}
                  aria-label="People you might like"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>

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
          <button
            className="hover:underline"
            onClick={() => openFollowDialog("following")}
            disabled={!userId}
          >
            <span className="font-semibold">{followingCount}</span>{" "}
            <span className="text-muted-foreground">Following</span>
          </button>
          <button
            className="hover:underline"
            onClick={() => openFollowDialog("followers")}
            disabled={!userId}
          >
            <span className="font-semibold">{followersCount}</span>{" "}
            <span className="text-muted-foreground">Followers</span>
          </button>
        </div>

        {/* Mobile-only: swipe carousel for "You might like" (placed under stats) */}
        {isOwnProfile && mobileSuggestionsOpen ? (
          <div className="mt-4 sm:hidden">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground">
                You might like
              </p>
              {suggestionsError ? (
                <p className="text-xs text-red-600">{suggestionsError}</p>
              ) : null}
            </div>

            {suggestionsLoading ? (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                <Skeleton className="h-[64px] w-[170px] rounded-xl shrink-0" />
                <Skeleton className="h-[64px] w-[170px] rounded-xl shrink-0" />
                <Skeleton className="h-[64px] w-[170px] rounded-xl shrink-0" />
              </div>
            ) : visibleSuggestedUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No suggestions right now.
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 pr-1 scrollbar-hide snap-x snap-mandatory">
                {visibleSuggestedUsers.map((u) => {
                  const avatar =
                    u.avatar_image_path && u.avatar_image_path.startsWith("http")
                      ? u.avatar_image_path
                      : u.avatar_image_path
                        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${u.avatar_image_path}`
                        : "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f464.svg";

                  return (
                    <div
                      key={u.id}
                      className="relative w-[152px] shrink-0 snap-start rounded-2xl border border-border bg-white p-2 shadow-sm"
                    >
                      {/* Dismiss (local only) */}
                      <button
                        type="button"
                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white/80 text-muted-foreground backdrop-blur hover:text-foreground"
                        aria-label="Dismiss suggestion"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDismissedSuggestionIds((prev) => {
                            const next = new Set(prev);
                            next.add(u.id);
                            return next;
                          });
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                      <a
                        href={`/profile/${u.id}`}
                        className="block"
                        onClick={() => setMobileSuggestionsOpen(false)}
                      >
                        <div className="flex flex-col items-center text-center">
                          <Avatar className="h-11 w-11 border border-border">
                            <AvatarImage src={avatar} alt={u.full_name || "User"} />
                            <AvatarFallback className="text-xs">
                              {(u.full_name || "U")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <p className="mt-2 text-[13px] font-semibold text-foreground truncate w-full">
                            {u.full_name || "User"}
                          </p>

                          <p className="mt-0.5 text-[11px] text-muted-foreground truncate w-full">
                            Suggested for you
                          </p>
                        </div>
                      </a>

                      {onFollowSuggestedUser ? (
                        <div className="mt-2">
                          <Button
                            size="sm"
                            className="h-8 w-full rounded-xl bg-black text-white hover:bg-white hover:text-black hover:border-black"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onFollowSuggestedUser(u.id);
                            }}
                          >
                            Follow
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <Dialog open={followDialogOpen} onOpenChange={setFollowDialogOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <div className="p-5">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="text-base">Connections</DialogTitle>
            </DialogHeader>

            <div className="mt-4">
              <Tabs
                value={followTab}
                onValueChange={(v) => setFollowTab(v as any)}
              >
                <TabsList className="w-full justify-start bg-white border border-border shadow-sm rounded-xl">
                  <TabsTrigger value="following">
                    Following{" "}
                    <span className="ml-2 text-muted-foreground">
                      {followingCount}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="followers">
                    Followers{" "}
                    <span className="ml-2 text-muted-foreground">
                      {followersCount}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <div className="mt-4">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search…"
                    className="rounded-xl"
                  />
                </div>

                <TabsContent value="following" className="mt-4">
                  {listError ? (
                    <p className="text-sm text-red-600">{listError}</p>
                  ) : loadingList && followingList === null ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full rounded-xl" />
                      <Skeleton className="h-12 w-full rounded-xl" />
                      <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[420px] pr-3">
                      <div className="space-y-1">
                        {(visibleUsers || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">
                            No users.
                          </p>
                        ) : (
                          (visibleUsers || []).map((u: any) => {
                            const uAvatar = u.avatar_image_path
                              ? u.avatar_image_path.startsWith("http")
                                ? u.avatar_image_path
                                : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${u.avatar_image_path}`
                              : null;
                            return (
                              <a
                                key={u.id}
                                href={`/profile/${u.id}`}
                                className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/30"
                                onClick={() => setFollowDialogOpen(false)}
                              >
                                <Avatar className="h-9 w-9">
                                  <AvatarImage
                                    src={
                                      uAvatar ||
                                      "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f464.svg"
                                    }
                                    alt={u.full_name || "User"}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {(u.full_name || "U")
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {u.full_name || "User"}
                                  </p>
                                  {u.description ? (
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {u.description}
                                    </p>
                                  ) : null}
                                </div>
                              </a>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>

                <TabsContent value="followers" className="mt-4">
                  {listError ? (
                    <p className="text-sm text-red-600">{listError}</p>
                  ) : loadingList && followersList === null ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full rounded-xl" />
                      <Skeleton className="h-12 w-full rounded-xl" />
                      <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[420px] pr-3">
                      <div className="space-y-1">
                        {(visibleUsers || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">
                            No users.
                          </p>
                        ) : (
                          (visibleUsers || []).map((u: any) => {
                            const uAvatar = u.avatar_image_path
                              ? u.avatar_image_path.startsWith("http")
                                ? u.avatar_image_path
                                : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${u.avatar_image_path}`
                              : null;
                            return (
                              <a
                                key={u.id}
                                href={`/profile/${u.id}`}
                                className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/30"
                                onClick={() => setFollowDialogOpen(false)}
                              >
                                <Avatar className="h-9 w-9">
                                  <AvatarImage
                                    src={
                                      uAvatar ||
                                      "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f464.svg"
                                    }
                                    alt={u.full_name || "User"}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {(u.full_name || "U")
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {u.full_name || "User"}
                                  </p>
                                  {u.description ? (
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {u.description}
                                    </p>
                                  ) : null}
                                </div>
                              </a>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

