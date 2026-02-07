"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImageUpload } from "@/components/admin/image-upload";
import {
  getSiteContent,
  updateSiteContent,
  SiteContent,
} from "@/lib/actions/content";
import {
  FileText,
  Image,
  MapPin,
  Phone,
  Mail,
  Instagram,
  Settings,
} from "lucide-react";
import { clearLogoCache } from "@/components/layout/header/logo-svg";
import { clearFooterLogoCache } from "@/components/layout/footer-logo-svg";
import { clearAlternativeLogoCache } from "@/components/layout/alternative-logo-svg";

export default function ContentPage() {
  const [content, setContent] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [logoImages, setLogoImages] = useState<Record<string, File[]>>({
    header_logo_pact: [],
    footer_logo_pact: [],
    alternative_logo_pact: [],
    header_logo_dirtywine: [],
    footer_logo_dirtywine: [],
    alternative_logo_dirtywine: [],
  });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const data = await getSiteContent();
      setContent(data);

      // Initialize form data
      const initialData: Record<string, string> = {};
      data.forEach((item) => {
        initialData[item.key] = item.value || "";
      });
      setFormData(initialData);
    } catch (err) {
      setError("Failed to load content");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (key: string) => {
    if (logoImages[key].length === 0) return;

    setSaving(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("files", logoImages[key][0]);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        const msg = uploadResult?.error || uploadResult?.errors?.join?.("; ") || "Failed to upload image";
        throw new Error(msg);
      }
      const imagePath = uploadResult.files?.[0];
      if (!imagePath) {
        throw new Error("No file URL returned from upload");
      }

      await updateSiteContent(key, imagePath);
      setFormData((prev) => ({ ...prev, [key]: imagePath }));
      setSuccess(`${key.replace("_", " ")} updated successfully!`);

      // Rensa cache för att visa nya loggan direkt (alla domäner)
      if (key.startsWith("header_logo")) {
        clearLogoCache();
        window.dispatchEvent(new CustomEvent("logoCacheCleared"));
      }
      if (key.startsWith("footer_logo")) {
        clearFooterLogoCache();
        window.dispatchEvent(new CustomEvent("footerLogoCacheCleared"));
      }
      if (key.startsWith("alternative_logo")) {
        clearAlternativeLogoCache();
      }

      // Clear the image upload
      setLogoImages((prev) => ({ ...prev, [key]: [] }));
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to upload ${key.replace("_", " ")}`;
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      await updateSiteContent(key, formData[key]);
      setSuccess("Content updated successfully!");
    } catch (err) {
      setError("Failed to update content");
    } finally {
      setSaving(false);
    }
  };

  const getContentByKey = (key: string) => {
    return content.find((item) => item.key === key);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-600">
          Manage logos, text content, and contact information
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="logos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="logos" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Logos
          </TabsTrigger>
          <TabsTrigger value="homepage" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Homepage
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logos" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Välj varumärke (domän). pactwines.com använder PACT-logor, dirtywine.se använder DIRTYWINE-logor.
          </p>
          <Tabs defaultValue="pact" className="space-y-6">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="pact">PACT</TabsTrigger>
              <TabsTrigger value="dirtywine">DIRTYWINE</TabsTrigger>
            </TabsList>
            <TabsContent value="pact" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      Header Logo (PACT)
                    </CardTitle>
                    <CardDescription>
                      Logo i headern på pactwines.com
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.header_logo_pact && (
                      <div className="relative w-32 h-16 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={formData.header_logo_pact}
                          alt="Header logo PACT"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <ImageUpload
                      images={logoImages.header_logo_pact}
                      onImagesChange={(images) =>
                        setLogoImages((prev) => ({ ...prev, header_logo_pact: images }))
                      }
                    />
                    <Button
                      onClick={() => handleLogoUpload("header_logo_pact")}
                      disabled={saving || logoImages.header_logo_pact.length === 0}
                    >
                      {saving ? "Laddar upp..." : "Ladda upp header-logga"}
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      Footer Logo (PACT)
                    </CardTitle>
                    <CardDescription>
                      Logo i footern på pactwines.com
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.footer_logo_pact && (
                      <div className="relative w-32 h-16 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={formData.footer_logo_pact}
                          alt="Footer logo PACT"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <ImageUpload
                      images={logoImages.footer_logo_pact}
                      onImagesChange={(images) =>
                        setLogoImages((prev) => ({ ...prev, footer_logo_pact: images }))
                      }
                    />
                    <Button
                      onClick={() => handleLogoUpload("footer_logo_pact")}
                      disabled={saving || logoImages.footer_logo_pact.length === 0}
                    >
                      {saving ? "Laddar upp..." : "Ladda upp footer-logga"}
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      Alternative Logo (PACT)
                    </CardTitle>
                    <CardDescription>
                      Alternativ logo för t.ex. välkomstsidor på pactwines.com
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.alternative_logo_pact && (
                      <div className="relative w-32 h-16 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={formData.alternative_logo_pact}
                          alt="Alternative logo PACT"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <ImageUpload
                      images={logoImages.alternative_logo_pact}
                      onImagesChange={(images) =>
                        setLogoImages((prev) => ({ ...prev, alternative_logo_pact: images }))
                      }
                    />
                    <Button
                      onClick={() => handleLogoUpload("alternative_logo_pact")}
                      disabled={saving || logoImages.alternative_logo_pact.length === 0}
                    >
                      {saving ? "Laddar upp..." : "Ladda upp alternative logo"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="dirtywine" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      Header Logo (DIRTYWINE)
                    </CardTitle>
                    <CardDescription>
                      Logo i headern på dirtywine.se
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.header_logo_dirtywine && (
                      <div className="relative w-32 h-16 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={formData.header_logo_dirtywine}
                          alt="Header logo DIRTYWINE"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <ImageUpload
                      images={logoImages.header_logo_dirtywine}
                      onImagesChange={(images) =>
                        setLogoImages((prev) => ({ ...prev, header_logo_dirtywine: images }))
                      }
                    />
                    <Button
                      onClick={() => handleLogoUpload("header_logo_dirtywine")}
                      disabled={saving || logoImages.header_logo_dirtywine.length === 0}
                    >
                      {saving ? "Laddar upp..." : "Ladda upp header-logga"}
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      Footer Logo (DIRTYWINE)
                    </CardTitle>
                    <CardDescription>
                      Logo i footern på dirtywine.se
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.footer_logo_dirtywine && (
                      <div className="relative w-32 h-16 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={formData.footer_logo_dirtywine}
                          alt="Footer logo DIRTYWINE"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <ImageUpload
                      images={logoImages.footer_logo_dirtywine}
                      onImagesChange={(images) =>
                        setLogoImages((prev) => ({ ...prev, footer_logo_dirtywine: images }))
                      }
                    />
                    <Button
                      onClick={() => handleLogoUpload("footer_logo_dirtywine")}
                      disabled={saving || logoImages.footer_logo_dirtywine.length === 0}
                    >
                      {saving ? "Laddar upp..." : "Ladda upp footer-logga"}
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      Alternative Logo (DIRTYWINE)
                    </CardTitle>
                    <CardDescription>
                      Alternativ logo för t.ex. välkomstsidor på dirtywine.se
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.alternative_logo_dirtywine && (
                      <div className="relative w-32 h-16 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={formData.alternative_logo_dirtywine}
                          alt="Alternative logo DIRTYWINE"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <ImageUpload
                      images={logoImages.alternative_logo_dirtywine}
                      onImagesChange={(images) =>
                        setLogoImages((prev) => ({ ...prev, alternative_logo_dirtywine: images }))
                      }
                    />
                    <Button
                      onClick={() => handleLogoUpload("alternative_logo_dirtywine")}
                      disabled={saving || logoImages.alternative_logo_dirtywine.length === 0}
                    >
                      {saving ? "Laddar upp..." : "Ladda upp alternative logo"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="homepage" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Hero Title */}
            <Card>
              <CardHeader>
                <CardTitle>Hero Title</CardTitle>
                <CardDescription>
                  Main hero title displayed on the homepage sidebar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="homepage_hero_title">Hero Title</Label>
                  <Input
                    id="homepage_hero_title"
                    value={formData.homepage_hero_title || ""}
                    onChange={(e) =>
                      handleInputChange("homepage_hero_title", e.target.value)
                    }
                    placeholder="Refined. Minimal. Never boring."
                  />
                </div>
                <Button
                  onClick={() => handleSave("homepage_hero_title")}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Hero Title"}
                </Button>
              </CardContent>
            </Card>

            {/* Hero Subtitle */}
            <Card>
              <CardHeader>
                <CardTitle>Hero Subtitle</CardTitle>
                <CardDescription>
                  First subtitle line displayed below the hero title
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="homepage_hero_subtitle">Hero Subtitle</Label>
                  <Input
                    id="homepage_hero_subtitle"
                    value={formData.homepage_hero_subtitle || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "homepage_hero_subtitle",
                        e.target.value,
                      )
                    }
                    placeholder="Furniture that speaks softly, but stands out loud."
                  />
                </div>
                <Button
                  onClick={() => handleSave("homepage_hero_subtitle")}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Hero Subtitle"}
                </Button>
              </CardContent>
            </Card>

            {/* Hero Description Line 1 */}
            <Card>
              <CardHeader>
                <CardTitle>Hero Description Line 1</CardTitle>
                <CardDescription>
                  Second description line on the homepage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="homepage_hero_description_1">
                    Description Line 1
                  </Label>
                  <Input
                    id="homepage_hero_description_1"
                    value={formData.homepage_hero_description_1 || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "homepage_hero_description_1",
                        e.target.value,
                      )
                    }
                    placeholder="Clean lines, crafted with wit."
                  />
                </div>
                <Button
                  onClick={() => handleSave("homepage_hero_description_1")}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Description Line 1"}
                </Button>
              </CardContent>
            </Card>

            {/* Hero Description Line 2 */}
            <Card>
              <CardHeader>
                <CardTitle>Hero Description Line 2</CardTitle>
                <CardDescription>
                  Third description line on the homepage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="homepage_hero_description_2">
                    Description Line 2
                  </Label>
                  <Input
                    id="homepage_hero_description_2"
                    value={formData.homepage_hero_description_2 || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "homepage_hero_description_2",
                        e.target.value,
                      )
                    }
                    placeholder="Elegance with a wink — style first"
                  />
                </div>
                <Button
                  onClick={() => handleSave("homepage_hero_description_2")}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Description Line 2"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Phone Number */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Phone Number
                </CardTitle>
                <CardDescription>Contact phone number</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number || ""}
                    onChange={(e) =>
                      handleInputChange("phone_number", e.target.value)
                    }
                    placeholder="+46 70 123 45 67"
                  />
                </div>
                <Button
                  onClick={() => handleSave("phone_number")}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Phone"}
                </Button>
              </CardContent>
            </Card>

            {/* Email */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Address
                </CardTitle>
                <CardDescription>Contact email address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="info@crowdvine.se"
                  />
                </div>
                <Button onClick={() => handleSave("email")} disabled={saving}>
                  {saving ? "Saving..." : "Save Email"}
                </Button>
              </CardContent>
            </Card>

            {/* Instagram */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Instagram className="h-5 w-5" />
                  Instagram URL
                </CardTitle>
                <CardDescription>Instagram profile URL</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram_url">Instagram URL</Label>
                  <Input
                    id="instagram_url"
                    type="url"
                    value={formData.instagram_url || ""}
                    onChange={(e) =>
                      handleInputChange("instagram_url", e.target.value)
                    }
                    placeholder="https://instagram.com/crowdvine"
                  />
                </div>
                <Button
                  onClick={() => handleSave("instagram_url")}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Instagram"}
                </Button>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
                <CardDescription>Company address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address || ""}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    placeholder="Stockholm, Sverige"
                  />
                </div>
                <Button onClick={() => handleSave("address")} disabled={saving}>
                  {saving ? "Saving..." : "Save Address"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="location" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Latitude */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Latitude
                </CardTitle>
                <CardDescription>Latitude coordinate for map</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coordinates_lat">Latitude</Label>
                  <Input
                    id="coordinates_lat"
                    type="number"
                    step="any"
                    value={formData.coordinates_lat || ""}
                    onChange={(e) =>
                      handleInputChange("coordinates_lat", e.target.value)
                    }
                    placeholder="59.3293"
                  />
                </div>
                <Button
                  onClick={() => handleSave("coordinates_lat")}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Latitude"}
                </Button>
              </CardContent>
            </Card>

            {/* Longitude */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Longitude
                </CardTitle>
                <CardDescription>Longitude coordinate for map</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coordinates_lng">Longitude</Label>
                  <Input
                    id="coordinates_lng"
                    type="number"
                    step="any"
                    value={formData.coordinates_lng || ""}
                    onChange={(e) =>
                      handleInputChange("coordinates_lng", e.target.value)
                    }
                    placeholder="18.0686"
                  />
                </div>
                <Button
                  onClick={() => handleSave("coordinates_lng")}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Longitude"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Site Title */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Site Title
                </CardTitle>
                <CardDescription>
                  The main title displayed in the browser tab and page metadata
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site_title">Site Title</Label>
                  <Input
                    id="site_title"
                    value={formData.site_title || ""}
                    onChange={(e) =>
                      handleInputChange("site_title", e.target.value)
                    }
                    placeholder="CrowdVine - Premium Wine Community"
                  />
                </div>
                <Button
                  onClick={() => handleSave("site_title")}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Site Title"}
                </Button>
              </CardContent>
            </Card>

            {/* Site Description */}
            <Card>
              <CardHeader>
                <CardTitle>Site Description</CardTitle>
                <CardDescription>
                  The description shown in search results and social media
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site_description">Site Description</Label>
                  <Textarea
                    id="site_description"
                    value={formData.site_description || ""}
                    onChange={(e) =>
                      handleInputChange("site_description", e.target.value)
                    }
                    placeholder="Join our exclusive wine community. Discover curated wines from boutique producers worldwide."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={() => handleSave("site_description")}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Site Description"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
