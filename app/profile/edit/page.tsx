"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

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
      toast.error("Failed to load profile");
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
        toast.success("Profile updated!");
        router.push("/profile");
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error("Failed to update profile");
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
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload image",
      );
    } finally {
      setUploading(false);
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
    toast.success("Image selected");
  };

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto p-4 md:p-sides space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Edit Profile</h1>
            <p className="text-sm text-muted-foreground">
              Update your personal information.
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border border-gray-200 text-gray-700 hover:text-gray-900"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push("/profile/payment")}>
                Payment Information
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/profile/perks")}>
                My Perks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/profile/invite")}>
                Invite Friends
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/50 p-4 md:p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-600">Profile Image</Label>
                {avatarUploading && (
                  <span className="text-[11px] text-muted-foreground">
                    Uploading...
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
                <div className="h-24 w-24 rounded-full border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
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
                  Choose from library
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => clearImage("avatar")}
                  disabled={!avatarPreview && !form.avatar_image_path}
                >
                  Remove
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-600">Cover Image</Label>
                {coverUploading && (
                  <span className="text-[11px] text-muted-foreground">
                    Uploading...
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
                <div className="h-24 w-full rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                  No cover image
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
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
                  Choose from library
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => clearImage("cover")}
                  disabled={!coverPreview && !form.cover_image_path}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="full_name" className="text-xs text-gray-600">
              Full Name
            </Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone" className="text-xs text-gray-600">
              Phone
            </Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="address" className="text-xs text-gray-600">
              Address
            </Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="city" className="text-xs text-gray-600">
                City
              </Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="postal_code" className="text-xs text-gray-600">
                Postal Code
              </Label>
              <Input
                id="postal_code"
                value={form.postal_code}
                onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="country" className="text-xs text-gray-600">
              Country
            </Label>
            <Input
              id="country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => router.push("/profile")}>
              Cancel
            </Button>
            <Button onClick={saveProfile} disabled={saving || loading}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

