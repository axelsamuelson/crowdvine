"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type SuggestedUser = {
  id: string;
  full_name?: string;
  avatar_image_path?: string;
  description?: string;
};

export default function ProfileSuggestionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SuggestedUser[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/user/suggestions?limit=50");
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load suggestions");
        setUsers(Array.isArray(json.users) ? json.users : []);
      } catch (e: any) {
        setError(e?.message || "Failed to load suggestions");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = String(u.full_name || "").toLowerCase();
      const desc = String(u.description || "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [users, query]);

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-sides space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            Other PACTers to follow
          </div>
        </div>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people…"
          className="rounded-xl bg-white"
        />

        <Card className="border-border bg-white shadow-sm">
          <div className="p-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No suggestions.</p>
            ) : (
              <div className="space-y-1">
                {filtered.map((u) => {
                  const avatar =
                    u.avatar_image_path && u.avatar_image_path.startsWith("http")
                      ? u.avatar_image_path
                      : u.avatar_image_path
                        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${u.avatar_image_path}`
                        : "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f464.svg";
                  return (
                    <Link
                      key={u.id}
                      href={`/profile/${u.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/30"
                    >
                      <Avatar className="h-10 w-10 border border-border">
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
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}


