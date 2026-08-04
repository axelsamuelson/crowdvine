"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { User } from "lucide-react";
import { useShoppingContext } from "@/lib/context/shopping-context-provider";
import {
  getCountryCodeFromProfileCountry,
  getSupportedProfileCountries,
  listUsStateCodesSorted,
} from "@/lib/countries";

interface ProfileInfo {
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  region?: string;
}

interface ProfileModalProps {
  onProfileSaved: (profile: ProfileInfo & { id?: string; created_at?: string }) => void;
  trigger?: React.ReactNode;
  /** Controlled open state (optional). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Prefill postal when opening (e.g. from checkout draft). */
  initialPostalCode?: string;
}

export function ProfileInfoModal({
  onProfileSaved,
  trigger,
  open: openProp,
  onOpenChange,
  initialPostalCode,
}: ProfileModalProps) {
  const { t } = useShoppingContext();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileInfo>({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    country: "SE",
    region: "",
  });

  // Load existing profile when modal opens; keep draft postal if profile has none
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const loadProfile = async () => {
      const draftPostal = initialPostalCode?.trim() || "";
      try {
        const response = await fetch("/api/user/profile");
        if (!response.ok) {
          if (!cancelled && draftPostal) {
            setFormData((prev) => ({
              ...prev,
              postal_code: prev.postal_code || draftPostal,
            }));
          }
          return;
        }
        const data = await response.json();
        const profile = data.profile || data;

        if (cancelled || !profile) {
          if (!cancelled && draftPostal) {
            setFormData((prev) => ({
              ...prev,
              postal_code: prev.postal_code || draftPostal,
            }));
          }
          return;
        }

        const countryCode =
          getCountryCodeFromProfileCountry(profile.country ?? null) ?? "SE";
        setFormData({
          full_name: profile.full_name || "",
          email: profile.email || "",
          phone: profile.phone || "",
          address: profile.address || "",
          city: profile.city || "",
          postal_code: profile.postal_code || draftPostal,
          country: countryCode,
          region: profile.region || "",
        });
      } catch (error) {
        if (!cancelled && draftPostal) {
          setFormData((prev) => ({
            ...prev,
            postal_code: prev.postal_code || draftPostal,
          }));
        }
        const msg = error instanceof Error ? error.message : String(error);
        if (msg !== "Failed to fetch") {
          console.error("Error loading profile:", error);
        }
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [open, initialPostalCode]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const email = (formData.email ?? "").trim();
      const fullName = (formData.full_name ?? "").trim();
      const address = (formData.address ?? "").trim();
      const city = (formData.city ?? "").trim();
      const postal = (formData.postal_code ?? "").trim();

      if (!fullName || !email || !address || !city || !postal) {
        toast.warning(t("checkout.profileAddressIncomplete"));
        return;
      }

      const payload = {
        ...formData,
        full_name: fullName,
        email,
        address,
        city,
        postal_code: postal,
      };

      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Guest / dirtywine local checkout: no session — keep address in client draft.
      if (response.status === 401) {
        onProfileSaved({
          ...payload,
          id: "",
          created_at: new Date().toISOString(),
        });
        setOpen(false);
        return;
      }

      if (!response.ok) {
        let message = t("checkout.profileSaveFailed");
        try {
          const errBody = (await response.json()) as { error?: string };
          if (typeof errBody?.error === "string" && errBody.error.trim()) {
            message = errBody.error;
          }
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }

      const result = await response.json();
      const updatedProfile = result.profile || result;

      onProfileSaved(updatedProfile);
      setOpen(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg !== "Failed to fetch") {
        console.error("Error saving profile:", error);
      }
      toast.error(
        msg === "Failed to fetch"
          ? t("checkout.profileSaveFailed")
          : msg || t("checkout.profileSaveFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full">
            <User className="w-4 h-4 mr-2" />
            {t("checkout.profileAddButton")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="max-w-md"
        aria-describedby="profile-modal-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <User className="w-5 h-5" />
            {t("checkout.profileContactTitle")}
          </DialogTitle>
          <p
            id="profile-modal-description"
            className="text-sm text-gray-600 mt-2"
          >
            {t("checkout.profileContactDesc")}
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="full_name">{t("checkout.fullName")}</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              placeholder={t("checkout.enterFullName")}
              autoComplete="name"
            />
          </div>

          <div>
            <Label htmlFor="email">{t("checkout.email")}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder={t("checkout.otpEmailLabel")}
              autoComplete="email"
            />
          </div>

          <div>
            <Label htmlFor="phone">{t("checkout.phoneNumber")}</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder={t("checkout.enterPhone")}
            />
          </div>

          <div>
            <Label htmlFor="address">{t("checkout.address")}</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder={t("checkout.enterAddress")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">{t("checkout.city")}</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder={t("checkout.enterCity")}
              />
            </div>
            <div>
              <Label htmlFor="postal_code">{t("checkout.postalCode")}</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) =>
                  setFormData({ ...formData, postal_code: e.target.value })
                }
                placeholder={t("checkout.enterPostalCodeShort")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="country">{t("checkout.country")}</Label>
            <Select
              value={formData.country}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  country: value,
                  region: value === "US" ? formData.region : "",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("checkout.selectCountry")} />
              </SelectTrigger>
              <SelectContent>
                {getSupportedProfileCountries().map(({ code, nameEn }) => (
                  <SelectItem key={code} value={code}>
                    {nameEn} ({code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.country === "US" ? (
            <div>
              <Label htmlFor="region">{t("checkout.stateTerritory")}</Label>
              <Select
                value={
                  formData.region && formData.region.length > 0
                    ? formData.region
                    : undefined
                }
                onValueChange={(value) =>
                  setFormData({ ...formData, region: value })
                }
              >
                <SelectTrigger id="region">
                  <SelectValue placeholder={t("checkout.selectState")} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {listUsStateCodesSorted().map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1"
            >
              {t("checkout.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-black hover:bg-black/90 text-white"
            >
              {loading ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
