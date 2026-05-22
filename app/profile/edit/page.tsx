"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, LogOut, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useShoppingContext } from "@/lib/context/shopping-context-provider";
import { cn } from "@/lib/utils";

/** Light card inputs — readable on white/card even when site is in dark mode */
const fieldInputClass = cn(
  "mt-1 h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm",
  "placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-0",
  "dark:bg-white dark:text-zinc-900 dark:border-zinc-200 dark:placeholder:text-zinc-500",
  "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#fff] [&:-webkit-autofill]:[-webkit-text-fill-color:#18181b]",
);

const fileInputClass = cn(
  "h-9 cursor-pointer rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 shadow-sm",
  "file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-zinc-800",
  "dark:bg-white dark:text-zinc-700 dark:border-zinc-200",
);

interface EditForm {
  full_name: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  avatar_image_path: string;
  cover_image_path: string;
}

export default function EditProfilePage() {
  const { t } = useShoppingContext();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [form, setForm] = useState<EditForm>({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    country: "Sweden",
    avatar_image_path: "",
    cover_image_path: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.status === 401) {
        router.push("/log-in");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const p = data.profile || {};
        setForm({
          full_name: p.full_name || "",
          phone: p.phone || "",
          address: p.address || "",
          city: p.city || "",
          postal_code: p.postal_code || "",
          country: p.country || "Sweden",
          avatar_image_path: p.avatar_image_path || "",
          cover_image_path: p.cover_image_path || "",
        });
        setAvatarPreview(
          p.avatar_image_path
            ? p.avatar_image_path.startsWith("http")
              ? p.avatar_image_path
              : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${p.avatar_image_path}`
            : null,
        );
        setCoverPreview(
          p.cover_image_path
            ? p.cover_image_path.startsWith("http")
              ? p.cover_image_path
              : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/${p.cover_image_path}`
            : null,
        );
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error(t("profile.profileLoadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(t("profile.profileUpdated"));
        void AnalyticsTracker.trackEvent({
          eventType: "profile_updated",
          eventCategory: "account",
          metadata: { source: "profile_edit_page" },
        });
        router.push("/profile");
      } else {
        toast.error(t("profile.profileUpdateFailed"));
      }
    } catch (error) {
      toast.error(t("profile.profileUpdateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (
    file: File,
    kind: "avatar" | "cover",
  ): Promise<void> => {
    const setUploading = kind === "avatar" ? setAvatarUploading : setCoverUploading;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.details || "Upload failed");
      }
      const data = await res.json();
      const uploadedPath = Array.isArray(data.files) ? data.files[0] : null;
      if (!uploadedPath) throw new Error("No file returned from upload");

      if (kind === "avatar") {
        setForm((prev) => ({ ...prev, avatar_image_path: uploadedPath }));
        setAvatarPreview(
          uploadedPath.startsWith("http")
            ? uploadedPath
            : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${uploadedPath}`,
        );
      } else {
        setForm((prev) => ({ ...prev, cover_image_path: uploadedPath }));
        setCoverPreview(
          uploadedPath.startsWith("http")
            ? uploadedPath
            : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/${uploadedPath}`,
        );
      }
      toast.success(t("profile.imageUploaded"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("profile.imageUploadFailed"),
      );
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        toast.error(t("profile.signOutFailed"));
      }
    } catch {
      toast.error(t("profile.signOutFailed"));
    }
  };

  const clearImage = (kind: "avatar" | "cover") => {
    if (kind === "avatar") {
      setForm((prev) => ({ ...prev, avatar_image_path: "" }));
      setAvatarPreview(null);
    } else {
      setForm((prev) => ({ ...prev, cover_image_path: "" }));
      setCoverPreview(null);
    }
  };

  const handleLibrarySelect = (
    path: string,
    kind: "avatar" | "cover",
  ) => {
    if (!path) return;
    if (kind === "avatar") {
      setForm((prev) => ({ ...prev, avatar_image_path: path }));
      setAvatarPreview(
        path.startsWith("http")
          ? path
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`,
      );
    } else {
      setForm((prev) => ({ ...prev, cover_image_path: path }));
      setCoverPreview(
        path.startsWith("http")
          ? path
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/${path}`,
      );
    }
    toast.success(t("profile.imageSelected"));
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-sides">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full"
              asChild
            >
              <Link href="/profile" aria-label={t("profile.back")}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-foreground">
                {t("profile.editTitle")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("profile.editSubtitle")}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 rounded-full"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push("/profile/payment")}>
                {t("profile.paymentInformation")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/profile/perks")}>
                {t("profile.myPerks")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/profile/invite")}>
                {t("profile.inviteFriends")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-6 rounded-2xl border border-border bg-card p-4 shadow-sm md:p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">
                  {t("profile.profileImage")}
                </Label>
                {avatarUploading && (
                  <span className="text-[11px] text-muted-foreground">
                    {t("profile.uploading")}
                  </span>
                )}
              </div>
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="h-24 w-24 rounded-full object-cover border"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
                  {t("profile.noImage")}
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                className={fileInputClass}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file, "avatar");
                }}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleLibrarySelect("sample-avatar.jpg", "avatar")}
                >
                  {t("profile.chooseFromLibrary")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => clearImage("avatar")}
                  disabled={!avatarPreview && !form.avatar_image_path}
                >
                  {t("profile.remove")}
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">
                  {t("profile.coverImage")}
                </Label>
                {coverUploading && (
                  <span className="text-[11px] text-muted-foreground">
                    {t("profile.uploading")}
                  </span>
                )}
              </div>
              {coverPreview ? (
                <div className="h-24 w-full rounded-lg border overflow-hidden">
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
                  {t("profile.noCoverImage")}
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                className={fileInputClass}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file, "cover");
                }}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleLibrarySelect("sample-cover.jpg", "cover")}
                >
                  {t("profile.chooseFromLibrary")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => clearImage("cover")}
                  disabled={!coverPreview && !form.cover_image_path}
                >
                  {t("profile.remove")}
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6 space-y-4">
            <div>
              <Label htmlFor="full_name" className="text-sm font-medium text-foreground">
                {t("checkout.fullName")}
              </Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className={fieldInputClass}
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                {t("profile.phone")}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={fieldInputClass}
                autoComplete="tel"
              />
            </div>
            <div>
              <Label htmlFor="address" className="text-sm font-medium text-foreground">
                {t("checkout.address")}
              </Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={fieldInputClass}
                autoComplete="street-address"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="city" className="text-sm font-medium text-foreground">
                  {t("checkout.city")}
                </Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={fieldInputClass}
                  autoComplete="address-level2"
                />
              </div>
              <div>
                <Label
                  htmlFor="postal_code"
                  className="text-sm font-medium text-foreground"
                >
                  {t("profile.postalCode")}
                </Label>
                <Input
                  id="postal_code"
                  value={form.postal_code}
                  onChange={(e) =>
                    setForm({ ...form, postal_code: e.target.value })
                  }
                  className={fieldInputClass}
                  autoComplete="postal-code"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="country" className="text-sm font-medium text-foreground">
                {t("checkout.country")}
              </Label>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className={fieldInputClass}
                autoComplete="country-name"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => router.push("/profile")}
            >
              {t("profile.cancel")}
            </Button>
            <Button
              onClick={saveProfile}
              disabled={saving}
              className="rounded-full bg-foreground text-background hover:bg-foreground/90"
            >
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>

        <div className="flex justify-center pb-4">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t("profile.logOut")}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

