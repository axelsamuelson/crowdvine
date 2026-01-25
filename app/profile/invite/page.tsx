"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { InviteQuotaDisplay } from "@/components/membership/invite-quota-display";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getTimeUntilReset } from "@/lib/membership/invite-quota";
import { ArrowLeft, Link as LinkIcon, Trash2, Users } from "lucide-react";

type Invitation = {
  id: string;
  code: string;
  expires_at?: string | null;
  max_uses?: number | null;
  initial_level?: string | null;
  created_at?: string | null;
  used_at?: string | null;
  signupUrl?: string;
  codeSignupUrl?: string;
  profiles?: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
};

type MembershipData = {
  invites: {
    available: number;
    used: number;
    total: number;
    resetsAt?: string | null;
  };
  levelInfo?: { name?: string };
};

export default function ProfileInvitePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [activeInvitations, setActiveInvitations] = useState<Invitation[]>([]);
  const [usedInvitations, setUsedInvitations] = useState<Invitation[]>([]);

  const resetsIn = useMemo(() => getTimeUntilReset(), []);

  // Check if invitation is new (created within 24 hours)
  const isNewInvitation = (createdAt: string | null | undefined): boolean => {
    if (!createdAt) return false;
    const created = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  // Format date for display
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const enrichInvites = (list: Invitation[]) => {
    const baseUrl = window.location.origin;
    return list.map((inv) => {
      if (inv.code && !inv.signupUrl) {
        const cleanCode = inv.code.trim().replace(/\s+/g, "");
        inv.signupUrl = `${baseUrl}/i/${cleanCode}`;
        inv.codeSignupUrl = `${baseUrl}/c/${cleanCode}`;
      }
      return inv;
    });
  };

  const fetchAll = async () => {
    try {
      const [mRes, iRes] = await Promise.all([
        fetch("/api/user/membership"),
        fetch("/api/user/invitations"),
      ]);

      if (mRes.status === 401 || iRes.status === 401) {
        setUnauthorized(true);
        return;
      }

      if (mRes.ok) {
        const m = await mRes.json();
        setMembership(m);
      }

      if (iRes.ok) {
        const data = await iRes.json();
        setActiveInvitations(enrichInvites(data.active || []));
        setUsedInvitations(enrichInvites(data.used || []));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const generateInvite = async () => {
    try {
      setGenerating(true);
      const res = await fetch("/api/invitations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 30 }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to generate invite");
        return;
      }

      const data = await res.json();
      if (data?.invitation) {
        const inv: Invitation = {
          id: data.invitation.id,
          code: data.invitation.code,
          signupUrl: data.invitation.signupUrl,
          codeSignupUrl: data.invitation.codeSignupUrl,
          expires_at: data.invitation.expiresAt,
          max_uses: data.invitation.maxUses,
          initial_level: data.invitation.initialLevel,
          created_at: data.invitation.createdAt || new Date().toISOString(),
        };
        setActiveInvitations((prev) => enrichInvites([inv, ...prev]));
        toast.success("Invitation generated");
        // Refresh membership quota
        const mRes = await fetch("/api/user/membership");
        if (mRes.ok) setMembership(await mRes.json());
      }
    } finally {
      setGenerating(false);
    }
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy");
    }
  };

  const deleteInvite = async (id: string) => {
    if (!confirm("Delete this invitation? It will no longer be usable.")) return;

    try {
      setDeletingId(id);
      const res = await fetch(`/api/user/invitations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to delete invite");
        return;
      }
      setActiveInvitations((prev) => prev.filter((i) => i.id !== id));
      toast.success("Invitation deleted");
      // Refresh quota
      const mRes = await fetch("/api/user/membership");
      if (mRes.ok) setMembership(await mRes.json());
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
        </div>
      </PageLayout>
    );
  }

  if (unauthorized) {
    return (
      <PageLayout>
        <div className="pt-top-spacing px-4 sm:px-sides">
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm text-center space-y-3">
            <h1 className="text-xl font-semibold text-foreground">Logga in för att bjuda in</h1>
            <p className="text-muted-foreground text-sm">
              Du behöver vara inloggad för att skapa invitation codes.
            </p>
            <div className="flex justify-center">
              <Button
                className="rounded-full bg-black text-white hover:bg-white hover:text-black hover:border-black"
                onClick={() => router.push("/log-in")}
              >
                Gå till inloggning
              </Button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const quota = membership?.invites;

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto p-4 md:p-sides space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => router.push("/profile")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Button
            className="rounded-full bg-black text-white hover:bg-white hover:text-black hover:border-black"
            onClick={generateInvite}
            disabled={generating || (quota?.available ?? 0) <= 0}
          >
            <Users className="h-4 w-4 mr-2" />
            {generating ? "Generating..." : "Generate invite"}
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold text-foreground">Invite friends</h1>
            <p className="text-sm text-muted-foreground">
              Share an invite link to bring friends onto CrowdVine.
            </p>
          </div>

          {quota ? (
            <InviteQuotaDisplay
              available={quota.available}
              used={quota.used}
              total={quota.total}
              resetsIn={resetsIn}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load quota.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">Aktiva</TabsTrigger>
              <TabsTrigger value="used">Använda</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4">
              {activeInvitations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active invites yet.</p>
              ) : (
                <div className="space-y-3">
                  {activeInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="rounded-xl border border-border bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-foreground tracking-wide">
                              {inv.code}
                            </p>
                            {isNewInvitation(inv.created_at) && (
                              <Badge variant="default" className="text-xs">
                                NEW
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-1">
                            {inv.signupUrl || ""}
                          </p>
                          {inv.created_at && (
                            <p className="text-xs text-muted-foreground">
                              Skapad: {formatDate(inv.created_at)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {inv.signupUrl ? (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-full"
                              onClick={() => copyText(inv.signupUrl!, "Link")}
                              aria-label="Copy link"
                            >
                              <LinkIcon className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full text-muted-foreground hover:text-red-600"
                            onClick={() => deleteInvite(inv.id)}
                            disabled={deletingId === inv.id}
                            aria-label="Delete invite"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="used" className="mt-4">
              {usedInvitations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No used invites yet.</p>
              ) : (
                <div className="space-y-3">
                  {usedInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="rounded-xl border border-border bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground tracking-wide mb-1">
                            {inv.code}
                          </p>
                          {inv.profiles && (
                            <p className="text-xs text-muted-foreground mb-1">
                              Använd av: {inv.profiles.full_name || inv.profiles.email}
                            </p>
                          )}
                          {inv.created_at && (
                            <p className="text-xs text-muted-foreground mb-1">
                              Skapad: {formatDate(inv.created_at)}
                            </p>
                          )}
                          {inv.used_at && (
                            <p className="text-xs text-muted-foreground">
                              Använd: {formatDate(inv.used_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageLayout>
  );
}
