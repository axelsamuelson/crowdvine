"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildTrackedUrl,
  normalizeDestinationPath,
  normalizeUtmValue,
  UTM_LINK_PRESETS,
} from "@/lib/analytics/utm-normalize";

type CampaignLink = {
  id: string;
  destination_path: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  label: string;
  created_at: string;
  url: string;
};

export function UtmLinkBuilder() {
  const [destinationPath, setDestinationPath] = useState("/");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [label, setLabel] = useState("");
  const [links, setLinks] = useState<CampaignLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);

  const loadLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics/links");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load links");
      setLinks(json.links ?? []);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to load links");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  const previewUrl = useMemo(() => {
    if (!utmSource.trim() || !utmMedium.trim() || !utmCampaign.trim()) {
      return null;
    }
    return buildTrackedUrl({
      destination_path: destinationPath || "/",
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
    });
  }, [destinationPath, utmSource, utmMedium, utmCampaign]);

  const applyPreset = (preset: (typeof UTM_LINK_PRESETS)[number]) => {
    setUtmSource(preset.utm_source);
    setUtmMedium(preset.utm_medium);
    if (preset.utm_campaign) setUtmCampaign(preset.utm_campaign);
    if (!label.trim()) setLabel(preset.label);
    setStatus(null);
  };

  const reuseLink = (link: CampaignLink) => {
    setDestinationPath(link.destination_path);
    setUtmSource(link.utm_source);
    setUtmMedium(link.utm_medium);
    setUtmCampaign(link.utm_campaign);
    setLabel(link.label);
    setStatus("Form filled from saved link — adjust or copy the URL.");
  };

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setStatus("Could not copy — select the URL manually.");
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/analytics/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_path: destinationPath,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          label,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      const link = json.link as CampaignLink;
      setLinks((prev) => [link, ...prev]);
      setDestinationPath(link.destination_path);
      setUtmSource(link.utm_source);
      setUtmMedium(link.utm_medium);
      setUtmCampaign(link.utm_campaign);
      setLabel(link.label);
      setStatus("Link saved. Copy the URL below.");
      await copyText(link.url, link.id);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-[#1F1F23]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Link2 className="size-4" aria-hidden />
            Create tracked link
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
            UTM values are lowercased and spaces become underscores on save so
            Trafik stays consistent.
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {UTM_LINK_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant="outline"
                size="sm"
                className="border-gray-200 dark:border-zinc-700"
                onClick={() => applyPreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="dest-path">Destination path</Label>
                <Input
                  id="dest-path"
                  value={destinationPath}
                  onChange={(e) => setDestinationPath(e.target.value)}
                  placeholder="/ or /shop"
                  required
                />
                <p className="text-[11px] text-gray-400">
                  Path only — base is pactwines.com. Preview normalises to{" "}
                  <code className="text-[11px]">
                    {normalizeDestinationPath(destinationPath || "/")}
                  </code>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="utm-source">utm_source</Label>
                <Input
                  id="utm-source"
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                  placeholder="tiktok"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="utm-medium">utm_medium</Label>
                <Input
                  id="utm-medium"
                  value={utmMedium}
                  onChange={(e) => setUtmMedium(e.target.value)}
                  placeholder="social"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="utm-campaign">utm_campaign</Label>
                <Input
                  id="utm-campaign"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  placeholder="bio"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="link-label">Label (internal)</Label>
                <Input
                  id="link-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="TikTok bio — spring"
                  required
                />
              </div>
            </div>

            {previewUrl && (
              <div className="rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#141418] p-3 space-y-2">
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Preview (after normalisation)
                </p>
                <p className="font-mono text-xs break-all text-gray-900 dark:text-white">
                  {buildTrackedUrl({
                    destination_path: destinationPath,
                    utm_source: normalizeUtmValue(utmSource),
                    utm_medium: normalizeUtmValue(utmMedium),
                    utm_campaign: normalizeUtmValue(utmCampaign),
                  })}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-gray-200 dark:border-zinc-700"
                  onClick={async () => {
                    await copyText(previewUrl, "preview");
                    setCopiedPreview(true);
                    setTimeout(() => setCopiedPreview(false), 2000);
                  }}
                >
                  {copiedPreview || copiedId === "preview" ? (
                    <Check className="mr-1.5 size-3.5" />
                  ) : (
                    <Copy className="mr-1.5 size-3.5" />
                  )}
                  Copy URL
                </Button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save link"}
              </Button>
              {status && (
                <p className="text-sm text-gray-600 dark:text-zinc-400">
                  {status}
                </p>
              )}
            </div>
          </form>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-[#1F1F23]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Saved links
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
            Reuse these instead of recreating with different spelling.
          </p>
        </div>
        <div className="p-4">
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : links.length === 0 ? (
            <p className="text-sm text-gray-500">No links saved yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-[#1F1F23]">
                  <TableHead>Label</TableHead>
                  <TableHead>UTM</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => (
                  <TableRow
                    key={link.id}
                    className="border-gray-200 dark:border-[#1F1F23]"
                  >
                    <TableCell>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {link.label}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(link.created_at).toLocaleString("sv-SE")}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {link.utm_source} / {link.utm_medium} /{" "}
                      {link.utm_campaign}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {link.destination_path}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-gray-200 dark:border-zinc-700"
                        onClick={() => reuseLink(link)}
                      >
                        Reuse
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-gray-200 dark:border-zinc-700"
                        onClick={() => copyText(link.url, link.id)}
                      >
                        {copiedId === link.id ? (
                          <Check className="mr-1.5 size-3.5" />
                        ) : (
                          <Copy className="mr-1.5 size-3.5" />
                        )}
                        Copy
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
