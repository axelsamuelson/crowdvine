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
import { FileText, Image, MapPin, Phone, Mail, Instagram } from "lucide-react";
import { clearLogoCache } from "@/components/layout/header/logo-svg";
import { clearFooterLogoCache } from "@/components/layout/footer-logo-svg";

export default function ContentPage() {
  const [content, setContent] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [logoImages, setLogoImages] = useState<Record<string, File[]>>({
    header_logo: [],
    footer_logo: [],
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

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      const uploadResult = await uploadResponse.json();
      const imagePath = uploadResult.files[0];

      await updateSiteContent(key, imagePath);
      setFormData((prev) => ({ ...prev, [key]: imagePath }));
      setSuccess(`${key.replace("_", " ")} updated successfully!`);

      // Rensa cache för att visa nya loggan direkt
      if (key === "header_logo") {
        clearLogoCache();
      } else if (key === "footer_logo") {
        clearFooterLogoCache();
      }

      // Clear the image upload
      setLogoImages((prev) => ({ ...prev, [key]: [] }));
    } catch (err) {
      setError(`Failed to upload ${key.replace("_", " ")}`);
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
        <TabsList className="grid w-full grid-cols-4">
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
        </TabsList>

        <TabsContent value="logos" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Header Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Header Logo
                </CardTitle>
                <CardDescription>
                  Logo displayed in the site header
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.header_logo && (
                  <div className="relative w-32 h-16 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={formData.header_logo}
                      alt="Header logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <ImageUpload
                  images={logoImages.header_logo}
                  onImagesChange={(images) =>
                    setLogoImages((prev) => ({ ...prev, header_logo: images }))
                  }
                />
                <Button
                  onClick={() => handleLogoUpload("header_logo")}
                  disabled={saving || logoImages.header_logo.length === 0}
                >
                  {saving ? "Uploading..." : "Upload Header Logo"}
                </Button>
              </CardContent>
            </Card>

            {/* Footer Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Footer Logo
                </CardTitle>
                <CardDescription>
                  Logo displayed in the site footer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.footer_logo && (
                  <div className="relative w-32 h-16 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={formData.footer_logo}
                      alt="Footer logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <ImageUpload
                  images={logoImages.footer_logo}
                  onImagesChange={(images) =>
                    setLogoImages((prev) => ({ ...prev, footer_logo: images }))
                  }
                />
                <Button
                  onClick={() => handleLogoUpload("footer_logo")}
                  disabled={saving || logoImages.footer_logo.length === 0}
                >
                  {saving ? "Uploading..." : "Upload Footer Logo"}
                </Button>
              </CardContent>
            </Card>
          </div>
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
                      handleInputChange("homepage_hero_subtitle", e.target.value)
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
                  <Label htmlFor="homepage_hero_description_1">Description Line 1</Label>
                  <Input
                    id="homepage_hero_description_1"
                    value={formData.homepage_hero_description_1 || ""}
                    onChange={(e) =>
                      handleInputChange("homepage_hero_description_1", e.target.value)
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
                  <Label htmlFor="homepage_hero_description_2">Description Line 2</Label>
                  <Input
                    id="homepage_hero_description_2"
                    value={formData.homepage_hero_description_2 || ""}
                    onChange={(e) =>
                      handleInputChange("homepage_hero_description_2", e.target.value)
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
      </Tabs>
    </div>
  );
}
