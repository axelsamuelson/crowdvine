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
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  region?: string;
}

interface ProfileModalProps {
  onProfileSaved: (profile: ProfileInfo) => void;
  trigger?: React.ReactNode;
}

export function ProfileInfoModal({
  onProfileSaved,
  trigger,
}: ProfileModalProps) {
  const { t } = useShoppingContext();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileInfo>({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    country: "SE",
    region: "",
  });

  // Load existing profile when modal opens
  useEffect(() => {
    if (open) {
      loadProfile();
    }
  }, [open]);

  const loadProfile = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        const profile = data.profile || data;

        if (profile) {
          const countryCode =
            getCountryCodeFromProfileCountry(profile.country ?? null) ?? "SE";
          setFormData({
            full_name: profile.full_name || "",
            phone: profile.phone || "",
            address: profile.address || "",
            city: profile.city || "",
            postal_code: profile.postal_code || "",
            country: countryCode,
          });
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      const result = await response.json();
      const updatedProfile = result.profile || result;

      // Check if address is complete
      const hasAddress =
        formData.address && formData.city && formData.postal_code;

      if (!hasAddress) {
        toast.warning(t("checkout.profileAddressIncomplete"));
      }

      onProfileSaved(updatedProfile);
      setOpen(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(t("checkout.profileSaveFailed"));
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
                value={formData.region && formData.region.length > 0 ? formData.region : undefined}
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
