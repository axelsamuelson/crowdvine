"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

type ProfileStub = {
  id: string;
  full_name?: string;
  email?: string;
};

type FollowModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  following: ProfileStub[];
  onFollow: (id: string) => Promise<void>;
  onUnfollow: (id: string) => Promise<void>;
};

export function FollowModal({
  open,
  onOpenChange,
  following,
  onFollow,
  onUnfollow,
}: FollowModalProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ProfileStub[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!search) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/profile/follow?search=${search}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => setResults(data.results || []))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [search]);

  const isFollowing = (id: string) =>
    following.some((profile) => profile.id === id);

  const initials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    return email?.slice(0, 2).toUpperCase() ?? "U";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite friends</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Search members…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          )}
          {!loading && results.length === 0 && search && (
            <p className="text-sm text-gray-500">No members found.</p>
          )}
          <div className="space-y-3">
            {results.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-white bg-white text-xs">
                    <AvatarFallback>{initials(profile.full_name, profile.email)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {profile.full_name || profile.email}
                    </p>
                    {profile.email && (
                      <p className="text-xs text-gray-500">{profile.email}</p>
                    )}
                  </div>
                </div>
                {isFollowing(profile.id) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => onUnfollow(profile.id)}
                  >
                    Following
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => onFollow(profile.id)}
                  >
                    Follow
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

