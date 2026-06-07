"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import {
  ADMIN_FORM_FIELDS_CLASS,
  ADMIN_ACTIVE_SWITCH_CLASS,
  ADMIN_HELP_TEXT_CLASS,
  ADMIN_TOGGLE_ROW_CLASS,
} from "@/lib/admin-form-styles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  CreateWineData,
  Wine,
  createWine,
  updateWine,
} from "@/lib/actions/wines";
import { Producer } from "@/lib/actions/producers";
import { extractWineArray, extractWineText } from "@/lib/i18n/wine-locale";
import { WineImageUpload } from "@/components/admin/wine-image-upload";
import { WineImage } from "@/lib/types/wine-images";
import { PricingCalculator } from "@/components/admin/pricing-calculator-simple";
import GrapeVarietiesSelector from "@/components/admin/grape-varieties-selector";
import { Switch } from "@/components/ui/switch";
import {
  getGrapeVarieties,
  createGrapeVariety,
} from "@/lib/actions/grape-varieties";
import { calculateB2BPriceExclVat } from "@/lib/price-breakdown";
import { WineB2BPalletStockTable } from "@/components/admin/wine-b2b-pallet-stock-table";
import {
  WineEnrichmentCollapsible,
  WINE_ENRICHMENT_DROPDOWN_LIST_CLASS,
} from "@/components/product/wine-enrichment-collapsible";
import { cn } from "@/lib/utils";

const DEFAULT_PRODUCER_MARGIN = 10;

const FARMING_OPTIONS = [
  { value: "organic_certified", label: "Ekologisk certifierad" },
  { value: "biodynamic_certified", label: "Biodynamisk certifierad" },
  { value: "natural", label: "Natural" },
  { value: "sustainable", label: "Hållbar" },
  { value: "conventional", label: "Konventionell" },
] as const;

type WineFormData = CreateWineData & {
  food_pairing_text: string;
  awards_text: string;
};

function formatCommaList(values: string[] | null | undefined): string {
  return values?.join(", ") ?? "";
}

/** Hero copy: prefer summary, fall back to legacy description column. */
function heroDescriptionFromWine(w: Wine | undefined, locale: "sv" | "en"): string {
  if (!w) return "";
  const summary = copyTextFromWine(w.summary as WineCopyField, locale);
  if (summary) return summary;
  return copyTextFromWine(w.description as WineCopyField, locale);
}

function parseCommaList(value: string): string[] | null {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

type WineCopyField = Record<string, string> | string | null | undefined;
type WineArrayField = Record<string, string[]> | string[] | null | undefined;

function copyTextFromWine(
  value: WineCopyField,
  locale: "sv" | "en",
): string {
  return extractWineText(value, locale) ?? "";
}

function copyArrayTextFromWine(
  value: WineArrayField,
  locale: "sv" | "en",
): string {
  return formatCommaList(extractWineArray(value, locale) ?? []);
}

interface WineFormProps {
  wine?: Wine;
  producers: Producer[];
  /** When true, producer can only set cost; margin is fixed by platform (no margin/B2B inputs) */
  isProducerView?: boolean;
  /** Pre-select this producer when creating a new wine (e.g. from /admin/wines/new?producer_id=xxx) */
  initialProducerId?: string;
}

export default function WineForm({ wine, producers, isProducerView = false, initialProducerId }: WineFormProps) {
  const [editLocale, setEditLocale] = useState<"sv" | "en">("sv");

  const [formData, setFormData] = useState<WineFormData>({
    handle: wine?.handle || "",
    wine_name: wine?.wine_name === "" ? "" : (wine?.wine_name ?? ""),
    vintage: wine?.vintage || "",
    grape_varieties: wine?.grape_varieties || "",
    color: wine?.color || "Red",
    producer_id: wine?.producer_id || initialProducerId || "",
    // Simplified pricing fields
    cost_currency: wine?.cost_currency || "EUR",
    cost_amount: wine?.cost_amount ?? 0,
    alcohol_tax_cents: 2219, // Fixed 22.19 SEK = 2219 cents
    price_includes_vat: true,
    // Producer view: fixed margin; admin can set margin
    margin_percentage: isProducerView ? DEFAULT_PRODUCER_MARGIN : (wine?.margin_percentage ?? 10.0),
    // Keep base_price_cents for backward compatibility
    base_price_cents: wine?.base_price_cents ?? 0,
    // Set the existing label_image_path if editing
    label_image_path: wine?.label_image_path || "",
    summary: copyTextFromWine(wine?.summary as WineCopyField, "sv"),
    tasting_notes: copyTextFromWine(wine?.tasting_notes as WineCopyField, "sv"),
    alcohol_percentage: wine?.alcohol_percentage ?? null,
    farming: wine?.farming ?? null,
    additives: wine?.additives ?? "",
    serving_temp_c: wine?.serving_temp_c ?? "",
    food_pairing_text: copyArrayTextFromWine(
      wine?.food_pairing as WineArrayField,
      "sv",
    ),
    winemaker_notes: copyTextFromWine(wine?.winemaker_notes as WineCopyField, "sv"),
    awards_text: copyArrayTextFromWine(wine?.awards as WineArrayField, "sv"),
    ageing: copyTextFromWine(wine?.ageing as WineCopyField, "sv"),
    soil_type: wine?.soil_type ?? "",
    elevation_masl: wine?.elevation_masl ?? null,
    volume_liters: wine?.volume_liters ?? 0.75,
    appellation: wine?.appellation ?? "",
    // B2B
    b2b_margin_percentage: wine?.b2b_margin_percentage ?? null,
    b2b_stock: wine?.b2b_stock ?? null,
    // Visibility (only when editing; new wines default to live)
    is_live: wine?.is_live ?? true,
  });

  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<WineImage[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableGrapeVarieties, setAvailableGrapeVarieties] = useState<any[]>(
    [],
  );
  const [selectedGrapeVarietyIds, setSelectedGrapeVarietyIds] = useState<
    string[]
  >([]);
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [shippingPerBottleSek, setShippingPerBottleSek] = useState<number>(0);
  const router = useRouter();

  // Fetch exchange rate for B2B price calculation when cost is not SEK
  useEffect(() => {
    const currency = formData.cost_currency || wine?.cost_currency || "EUR";
    if (currency === "SEK") {
      setExchangeRate(1);
      return;
    }
    let cancelled = false;
    fetch(`/api/exchange-rates?from=${currency}&to=SEK`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { rate?: number } | null) => {
        if (!cancelled && data?.rate && Number.isFinite(data.rate)) {
          setExchangeRate(data.rate);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [formData.cost_currency, wine?.cost_currency]);

  const fetchShippingFromPallets = () => {
    if (!wine?.id) return;
    fetch(`/api/admin/wines/${wine.id}/pallet-stock`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { shipping_per_bottle_sek_weighted_avg?: number } | null) => {
        if (data?.shipping_per_bottle_sek_weighted_avg != null) {
          setShippingPerBottleSek(data.shipping_per_bottle_sek_weighted_avg);
        } else {
          setShippingPerBottleSek(0);
        }
      })
      .catch(() => setShippingPerBottleSek(0));
  };

  useEffect(() => {
    if (!wine?.id) {
      setShippingPerBottleSek(0);
      return;
    }
    let cancelled = false;
    fetch(`/api/admin/wines/${wine.id}/pallet-stock`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { shipping_per_bottle_sek_weighted_avg?: number } | null) => {
        if (!cancelled && data?.shipping_per_bottle_sek_weighted_avg != null) {
          setShippingPerBottleSek(data.shipping_per_bottle_sek_weighted_avg);
        } else if (!cancelled) {
          setShippingPerBottleSek(0);
        }
      })
      .catch(() => cancelled || setShippingPerBottleSek(0));
    return () => {
      cancelled = true;
    };
  }, [wine?.id]);

  // Keep form in sync with the latest server value when reopening / navigating
  useEffect(() => {
    if (!wine) return;
    setFormData((prev) => ({
      ...prev,
      handle: wine.handle || "",
      wine_name: wine.wine_name === "" ? "" : wine.wine_name,
      vintage: wine.vintage || "",
      grape_varieties: wine.grape_varieties || "",
      color: wine.color || "Red",
      producer_id: wine.producer_id || "",
      cost_currency: wine.cost_currency || "EUR",
      cost_amount: wine.cost_amount ?? 0,
      alcohol_tax_cents: 2219,
      price_includes_vat: wine.price_includes_vat ?? true,
      margin_percentage: isProducerView ? DEFAULT_PRODUCER_MARGIN : (wine.margin_percentage ?? 10.0),
      base_price_cents: wine.base_price_cents ?? 0,
      label_image_path: wine.label_image_path || "",
      summary: heroDescriptionFromWine(wine, editLocale),
      tasting_notes: copyTextFromWine(wine.tasting_notes as WineCopyField, editLocale),
      alcohol_percentage: wine.alcohol_percentage ?? null,
      farming: wine.farming ?? null,
      additives: wine.additives ?? "",
      serving_temp_c: wine.serving_temp_c ?? "",
      food_pairing_text: copyArrayTextFromWine(
        wine.food_pairing as WineArrayField,
        editLocale,
      ),
      winemaker_notes: copyTextFromWine(wine.winemaker_notes as WineCopyField, editLocale),
      awards_text: copyArrayTextFromWine(wine.awards as WineArrayField, editLocale),
      ageing: copyTextFromWine(wine.ageing as WineCopyField, editLocale),
      soil_type: wine.soil_type ?? "",
      elevation_masl: wine.elevation_masl ?? null,
      volume_liters: wine.volume_liters ?? 0.75,
      appellation: wine.appellation ?? "",
      b2b_margin_percentage: wine.b2b_margin_percentage ?? null,
      b2b_stock: wine.b2b_stock ?? null,
    }));
  }, [wine?.id, isProducerView, editLocale]);

  useEffect(() => {
    if (!wine) return;
    setFormData((prev) => ({
      ...prev,
      summary: extractWineText(wine.summary as WineCopyField, editLocale) ?? "",
      tasting_notes:
        extractWineText(wine.tasting_notes as WineCopyField, editLocale) ?? "",
      ageing: extractWineText(wine.ageing as WineCopyField, editLocale) ?? "",
      winemaker_notes:
        extractWineText(wine.winemaker_notes as WineCopyField, editLocale) ??
        "",
      description:
        extractWineText(wine.description as WineCopyField, editLocale) ?? "",
      food_pairing_text: formatCommaList(
        extractWineArray(wine.food_pairing as WineArrayField, editLocale) ?? [],
      ),
      awards_text: formatCommaList(
        extractWineArray(wine.awards as WineArrayField, editLocale) ?? [],
      ),
    }));
  }, [editLocale, wine]);

  // Load grape varieties on component mount
  useEffect(() => {
    const loadGrapeVarieties = async () => {
      try {
        const varieties = await getGrapeVarieties();
        setAvailableGrapeVarieties(varieties);
      } catch (error) {
        console.error("Failed to load grape varieties:", error);
      }
    };
    loadGrapeVarieties();
  }, []);

  // Load existing grape varieties for editing
  useEffect(() => {
    const loadExistingGrapeVarieties = async () => {
      if (wine && wine.id) {
        try {
          const { getWineGrapeVarieties } = await import(
            "@/lib/actions/grape-varieties"
          );
          const existingVarietyIds = await getWineGrapeVarieties(wine.id);
          setSelectedGrapeVarietyIds(existingVarietyIds);
        } catch (error) {
          console.error("Failed to load existing grape varieties:", error);
        }
      }
    };

    if (wine && availableGrapeVarieties.length > 0) {
      loadExistingGrapeVarieties();
    }
  }, [wine, availableGrapeVarieties]);

  // Load existing images for editing
  useEffect(() => {
    const loadExistingImages = async () => {
      if (wine && wine.id) {
        try {
          const { getWineImages } = await import("@/lib/actions/wine-images");
          const images = await getWineImages(wine.id);
          setExistingImages(images);
        } catch (error) {
          console.error("Failed to load existing images:", error);
        }
      }
    };

    if (wine) {
      loadExistingImages();
    }
  }, [wine]);

  const handleGrapeVarietiesChange = (varietyIds: string[]) => {
    setSelectedGrapeVarietyIds(varietyIds);
    // Update the formData grape_varieties field with comma-separated names
    const varietyNames = availableGrapeVarieties
      .filter((v) => varietyIds.includes(v.id))
      .map((v) => v.name)
      .join(", ");
    setFormData((prev) => ({ ...prev, grape_varieties: varietyNames }));
  };

  const handleAddNewGrapeVariety = async (name: string) => {
    try {
      const newVariety = await createGrapeVariety({ name, description: "" });
      setAvailableGrapeVarieties((prev) => [...prev, newVariety]);
      // Automatically select the newly created variety
      handleGrapeVarietiesChange([...selectedGrapeVarietyIds, newVariety.id]);
    } catch (error) {
      console.error("Failed to create grape variety:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Generate handle from wine name and vintage
    const generatedHandle = `${formData.wine_name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")}-${formData.vintage}`;

    // Validate required fields
    const missingFields: string[] = [];

    if (!formData.wine_name.trim()) missingFields.push("Wine Name");
    if (!formData.vintage.trim()) missingFields.push("Vintage");
    if (!formData.producer_id) missingFields.push("Producer");

    if (missingFields.length > 0) {
      setError(
        `Please fill in the following required fields: ${missingFields.join(", ")}`,
      );
      setLoading(false);
      return;
    }

    try {
      // Upload new images if any were added
      let imagePaths: string[] = [];
      if (images.length > 0) {
        try {
          const formDataUpload = new FormData();
          images.forEach((image) => {
            formDataUpload.append("files", image);
          });

          console.log("📤 Uploading", images.length, "images...");

          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: formDataUpload,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            console.error("❌ Upload failed:", errorData);
            throw new Error(
              errorData.error || errorData.details || "Failed to upload images",
            );
          }

          const uploadResult = await uploadResponse.json();
          imagePaths = uploadResult.files || [];
          console.log("✅ Images uploaded:", imagePaths);
        } catch (uploadError) {
          console.error("Image upload error:", uploadError);
          // Make image upload non-blocking - wine can be created without images
          setError(
            `Warning: Image upload failed - ${uploadError instanceof Error ? uploadError.message : "Unknown error"}. Wine will be created without images.`,
          );
          // Continue with wine creation even if images fail
        }
      }

      // Store B2B price and cost in SEK (exactly as shown in admin) so tasting summary breakdown matches
      const hasB2B =
        formData.b2b_margin_percentage != null &&
        formData.b2b_margin_percentage >= 0 &&
        formData.b2b_margin_percentage < 100 &&
        (formData.cost_amount ?? 0) > 0;
      const b2b_price_cents = hasB2B
        ? Math.round(
            calculateB2BPriceExclVat(
              formData.cost_amount ?? 0,
              exchangeRate,
              2219,
              formData.b2b_margin_percentage!,
              shippingPerBottleSek,
            ) * 100,
          )
        : null;
      const b2b_cost_sek =
        hasB2B
          ? Math.round((formData.cost_amount ?? 0) * exchangeRate * 100) / 100
          : null;

      const { food_pairing_text, awards_text, ...formRest } = formData;

      const abvFromAlcohol =
        formRest.alcohol_percentage != null
          ? String(formRest.alcohol_percentage)
          : null;

      // Use first uploaded image as main image if available, otherwise keep existing
      const wineData = {
        ...formRest,
        abv: abvFromAlcohol,
        description: null,
        food_pairing: parseCommaList(food_pairing_text),
        awards: parseCommaList(awards_text),
        handle: generatedHandle,
        label_image_path:
          imagePaths.length > 0 ? imagePaths[0] : formData.label_image_path,
        is_live: formData.is_live ?? true,
        b2b_price_cents,
        b2b_cost_sek,
      };

      let savedWine;
      if (wine) {
        savedWine = await updateWine(wine.id, wineData, editLocale);
      } else {
        savedWine = await createWine(wineData, editLocale);
      }

      // Save new images to wine_images table
      if (savedWine && imagePaths.length > 0) {
        const { createWineImage } = await import("@/lib/actions/wine-images");

        for (let i = 0; i < imagePaths.length; i++) {
          await createWineImage({
            wine_id: savedWine.id,
            image_path: imagePaths[i],
            alt_text: `${savedWine.wine_name} ${savedWine.vintage}`,
            sort_order: existingImages.length + i,
            is_primary: i === 0 && existingImages.length === 0, // First image is primary if no existing images
          });
        }
      }

      // Update wine-grape varieties relationships
      if (savedWine && selectedGrapeVarietyIds.length > 0) {
        const { updateWineGrapeVarieties } = await import(
          "@/lib/actions/grape-varieties"
        );
        await updateWineGrapeVarieties(savedWine.id, selectedGrapeVarietyIds);
      }

      router.push("/admin/wines");
    } catch (err) {
      console.error("Wine creation error:", err);
      if (err instanceof Error) {
        setError(`Failed to save wine: ${err.message}`);
      } else {
        setError("An unexpected error occurred while saving the wine");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    field: keyof WineFormData,
    value: string | number | boolean | null,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isLiveInShop = formData.is_live ?? true;

  return (
    <div className="space-y-6">
      <form
        id="wine-edit-form"
        onSubmit={handleSubmit}
        className={`grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,600px)_300px] ${ADMIN_FORM_FIELDS_CLASS}`}
      >
        {error && (
          <Alert variant="destructive" className="lg:col-span-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

          <div className="min-w-0 space-y-4">
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            size="sm"
            variant={editLocale === "sv" ? "default" : "outline"}
            onClick={() => setEditLocale("sv")}
          >
            Svenska
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editLocale === "en" ? "default" : "outline"}
            onClick={() => setEditLocale("en")}
          >
            English
          </Button>
        </div>
        <AdminFormSection
          title="Grundinfo"
          description="Namn, producent, färg och volym."
        >
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-[180px_1fr] items-center gap-x-4">
              <Label htmlFor="wine_name" className="text-right text-sm">
                Vinnamn *
              </Label>
              <Input
                id="wine_name"
                value={formData.wine_name}
                onChange={(e) => handleChange("wine_name", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-[180px_1fr] items-center gap-x-4">
              <Label htmlFor="vintage" className="text-right text-sm">
                Vintage *
              </Label>
              <Input
                id="vintage"
                value={formData.vintage}
                onChange={(e) => handleChange("vintage", e.target.value)}
                placeholder="2024"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-[180px_1fr] items-center gap-x-4">
              <Label htmlFor="producer_id" className="text-right text-sm">
                Producent *
              </Label>
              <Select
                value={formData.producer_id}
                onValueChange={(value) => handleChange("producer_id", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj producent" />
                </SelectTrigger>
                <SelectContent>
                  {producers.map((producer) => (
                    <SelectItem key={producer.id} value={producer.id}>
                      {producer.name} ({producer.region})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[180px_1fr] items-start gap-x-4">
              <Label htmlFor="color" className="pt-2 text-right text-sm">
                Färg *
              </Label>
              <div>
                <Select
                  value={formData.color}
                  onValueChange={(value) => handleChange("color", value)}
                >
                  <SelectTrigger id="color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Red">Rött</SelectItem>
                    <SelectItem value="White">Vitt</SelectItem>
                    <SelectItem value="Rose">Rosé</SelectItem>
                    <SelectItem value="Orange">Orange</SelectItem>
                    <SelectItem value="Red & Orange">Rött &amp; orange (blandning)</SelectItem>
                    <SelectItem value="Red & White">Rött &amp; vitt (blandning)</SelectItem>
                    <SelectItem value="Orange & White">Orange &amp; vitt (blandning)</SelectItem>
                  </SelectContent>
                </Select>
                <p className={ADMIN_HELP_TEXT_CLASS}>
                  Visas som Färg i specs-rutorna på PDP.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-[180px_1fr] items-center gap-x-4">
              <Label htmlFor="volume_liters" className="text-right text-sm">
                Volym (liter)
              </Label>
              <Input
                id="volume_liters"
                type="number"
                min={0.1}
                max={30}
                step={0.01}
                placeholder="0.75"
                value={
                  formData.volume_liters != null
                    ? String(formData.volume_liters)
                    : ""
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    handleChange("volume_liters", 0.75);
                    return;
                  }
                  const num = parseFloat(v);
                  if (!Number.isNaN(num)) handleChange("volume_liters", num);
                }}
              />
            </div>
          </div>

          <GrapeVarietiesSelector
            selectedVarieties={selectedGrapeVarietyIds}
            onVarietiesChange={handleGrapeVarietiesChange}
            availableVarieties={availableGrapeVarieties}
            onAddNewVariety={handleAddNewGrapeVariety}
            disabled={loading}
          />
        </AdminFormSection>

        <AdminFormSection
          title="Bilder"
          description="Etikett och produktbilder i galleriet."
        >
          <WineImageUpload
            wineId={wine?.id}
            existingImages={existingImages}
            images={images}
            onImagesChange={setImages}
            onExistingImagesChange={setExistingImages}
            embedded
          />
        </AdminFormSection>

        <AdminFormSection
          title="Produktsida — hero"
          description="Beskrivning i den vita boxen. Visas i full bredd under titel och pris."
        >
          <div className="space-y-2">
            <Label htmlFor="summary">Beskrivning</Label>
            <Textarea
              id="summary"
              value={formData.summary ?? ""}
              onChange={(e) => handleChange("summary", e.target.value)}
              placeholder="Text som visas i hero-boxen på PDP..."
              rows={4}
            />
          </div>
        </AdminFormSection>

        <AdminFormSection
          title="Produktsida — specs"
          description="Rutorna under Lägg i varukorg. Producent (region) kommer från producentposten — redigeras under Producenter."
        >
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-[180px_1fr] items-center gap-x-4">
              <Label htmlFor="appellation" className="text-right text-sm">
                Appellation
              </Label>
              <Input
                id="appellation"
                value={formData.appellation}
                onChange={(e) => handleChange("appellation", e.target.value)}
                placeholder="t.ex. Vin de France"
              />
            </div>

            <div className="grid grid-cols-[180px_1fr] items-center gap-x-4">
              <Label htmlFor="alcohol_percentage" className="text-right text-sm">
                Alkohol (%)
              </Label>
              <Input
                id="alcohol_percentage"
                type="number"
                min={0}
                max={25}
                step={0.1}
                placeholder="t.ex. 13.5"
                value={
                  formData.alcohol_percentage != null
                    ? String(formData.alcohol_percentage)
                    : ""
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    handleChange("alcohol_percentage", null);
                    return;
                  }
                  const num = parseFloat(v);
                  if (!Number.isNaN(num)) handleChange("alcohol_percentage", num);
                }}
              />
            </div>

            <div className="grid grid-cols-[180px_1fr] items-center gap-x-4">
              <Label htmlFor="farming" className="text-right text-sm">
                Odling
              </Label>
              <Select
                value={formData.farming ?? "none"}
                onValueChange={(value) =>
                  handleChange("farming", value === "none" ? null : value)
                }
              >
                <SelectTrigger id="farming">
                  <SelectValue placeholder="Välj odlingsfilosofi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {FARMING_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[180px_1fr] items-start gap-x-4">
              <Label htmlFor="additives" className="pt-2 text-right text-sm">
                Tillsatser
              </Label>
              <div>
                <Input
                  id="additives"
                  value={formData.additives ?? ""}
                  onChange={(e) =>
                    handleChange("additives", e.target.value || null)
                  }
                  placeholder="t.ex. inga tillsatta sulfiter"
                />
                <p className={ADMIN_HELP_TEXT_CLASS}>
                  Visas som &quot;Odling &amp; tillsatser&quot; på PDP.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[180px_1fr] items-center gap-x-4">
              <Label htmlFor="serving_temp_c" className="text-right text-sm">
                Serveringstemperatur (°C)
              </Label>
              <Input
                id="serving_temp_c"
                value={formData.serving_temp_c ?? ""}
                onChange={(e) =>
                  handleChange("serving_temp_c", e.target.value || null)
                }
                placeholder="t.ex. 13–15"
              />
            </div>

            <div className="grid grid-cols-[180px_1fr] items-center gap-x-4">
              <Label htmlFor="elevation_masl" className="text-right text-sm">
                Höjd över havet (m)
              </Label>
              <Input
                id="elevation_masl"
                type="number"
                min={0}
                step={1}
                placeholder="350"
                value={
                  formData.elevation_masl != null
                    ? String(formData.elevation_masl)
                    : ""
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    handleChange("elevation_masl", null);
                    return;
                  }
                  const num = parseInt(v, 10);
                  if (!Number.isNaN(num)) handleChange("elevation_masl", num);
                }}
              />
            </div>

            <div className="grid grid-cols-[180px_1fr] items-center gap-x-4">
              <Label htmlFor="soil_type" className="text-right text-sm">
                Jordtyp
              </Label>
              <Input
                id="soil_type"
                value={formData.soil_type ?? ""}
                onChange={(e) =>
                  handleChange("soil_type", e.target.value || null)
                }
                placeholder="t.ex. galets roulés"
              />
            </div>
          </div>
        </AdminFormSection>

        <AdminFormSection
          title="Produktsida — dropdowns"
          description="Expanderbara sektioner under specs på PDP — samma layout som på produktsidan."
        >
          <div className={WINE_ENRICHMENT_DROPDOWN_LIST_CLASS}>
            <WineEnrichmentCollapsible
              title="Smaknoter"
              defaultOpen={Boolean(formData.tasting_notes?.trim())}
            >
              <div className="space-y-2">
                <Label htmlFor="tasting_notes" className="sr-only">
                  Smaknoter
                </Label>
                <Textarea
                  id="tasting_notes"
                  value={formData.tasting_notes ?? ""}
                  onChange={(e) =>
                    handleChange("tasting_notes", e.target.value)
                  }
                  placeholder="Smakbeskrivning..."
                  rows={4}
                />
              </div>
            </WineEnrichmentCollapsible>

            <WineEnrichmentCollapsible
              title="Passar till"
              defaultOpen={Boolean(formData.food_pairing_text?.trim())}
            >
              <div className="space-y-2">
                <Label htmlFor="food_pairing_text" className="sr-only">
                  Passar till
                </Label>
                <Textarea
                  id="food_pairing_text"
                  value={formData.food_pairing_text}
                  onChange={(e) =>
                    handleChange("food_pairing_text", e.target.value)
                  }
                  placeholder="grillat lamm, hårdost"
                  rows={2}
                />
                <p className={ADMIN_HELP_TEXT_CLASS}>Separera med komma.</p>
              </div>
            </WineEnrichmentCollapsible>

            <WineEnrichmentCollapsible
              title="Lagring / elevage"
              defaultOpen={Boolean(formData.ageing?.trim())}
            >
              <div className="space-y-2">
                <Label htmlFor="ageing" className="sr-only">
                  Lagring / elevage
                </Label>
                <Textarea
                  id="ageing"
                  value={formData.ageing ?? ""}
                  onChange={(e) =>
                    handleChange("ageing", e.target.value || null)
                  }
                  placeholder="t.ex. 12 månader på tank"
                  rows={2}
                />
              </div>
            </WineEnrichmentCollapsible>

            <WineEnrichmentCollapsible
              title="Producentens noteringar"
              defaultOpen={Boolean(formData.winemaker_notes?.trim())}
            >
              <div className="space-y-2">
                <Label htmlFor="winemaker_notes" className="sr-only">
                  Producentens noteringar
                </Label>
                <Textarea
                  id="winemaker_notes"
                  value={formData.winemaker_notes ?? ""}
                  onChange={(e) =>
                    handleChange("winemaker_notes", e.target.value)
                  }
                  rows={3}
                />
              </div>
            </WineEnrichmentCollapsible>

            <WineEnrichmentCollapsible
              title="Utmärkelser"
              defaultOpen={Boolean(formData.awards_text?.trim())}
            >
              <div className="space-y-2">
                <Label htmlFor="awards_text" className="sr-only">
                  Utmärkelser
                </Label>
                <Textarea
                  id="awards_text"
                  value={formData.awards_text}
                  onChange={(e) => handleChange("awards_text", e.target.value)}
                  rows={2}
                />
                <p className={ADMIN_HELP_TEXT_CLASS}>Separera med komma.</p>
              </div>
            </WineEnrichmentCollapsible>
          </div>
        </AdminFormSection>
          </div>

          <div className="space-y-4 self-start">
            <div>
            {wine ? (
              <AdminFormSection title="Synlighet">
                <div
                  className={cn(
                    ADMIN_TOGGLE_ROW_CLASS,
                    isLiveInShop
                      ? "border-emerald-500/40 bg-emerald-500/5 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                      : "border-red-500/40 bg-red-500/5 dark:border-red-500/30 dark:bg-red-500/10",
                  )}
                >
                  <div>
                    <Label className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                      Synlig i shop
                    </Label>
                    <p className={ADMIN_HELP_TEXT_CLASS}>
                      Av = dolt för kunder i shop och sök.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                        isLiveInShop
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                          : "bg-red-500/15 text-red-800 dark:text-red-300",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-2 w-2 rounded-full",
                          isLiveInShop ? "bg-emerald-500" : "bg-red-500",
                        )}
                      />
                      {isLiveInShop ? "Synlig" : "Dold"}
                    </span>
                    <Switch
                      checked={isLiveInShop}
                      onCheckedChange={(checked) => handleChange("is_live", checked)}
                      aria-label="Vin synligt i shop"
                      className={ADMIN_ACTIVE_SWITCH_CLASS}
                    />
                  </div>
                </div>
              </AdminFormSection>
            ) : null}
            </div>

            <AdminFormSection
              title="Prissättning"
              description="Kostnad och marginal styr kundpris och price breakdown på PDP."
            >
              <PricingCalculator
                embedded
                pricingData={{
                  cost_currency: formData.cost_currency,
                  cost_amount: formData.cost_amount,
                  price_includes_vat: formData.price_includes_vat,
                  margin_percentage: isProducerView
                    ? DEFAULT_PRODUCER_MARGIN
                    : formData.margin_percentage,
                  calculated_price_cents: formData.base_price_cents ?? 0,
                }}
                onPricingChange={(pricingData) => {
                  setFormData((prev) => ({
                    ...prev,
                    cost_currency: pricingData.cost_currency,
                    cost_amount: pricingData.cost_amount,
                    price_includes_vat: pricingData.price_includes_vat,
                    margin_percentage: isProducerView
                      ? DEFAULT_PRODUCER_MARGIN
                      : pricingData.margin_percentage,
                    base_price_cents: pricingData.calculated_price_cents,
                  }));
                }}
                showMargin={!isProducerView}
              />
            </AdminFormSection>

            {!isProducerView ? (
              <AdminFormSection
                title="B2B"
                description="Marginal och lager för B2B-kunder."
              >
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="b2b_margin_percentage">
                      B2B-marginal (%)
                    </Label>
                    <Input
                      id="b2b_margin_percentage"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      placeholder="t.ex. 15"
                      value={
                        formData.b2b_margin_percentage != null
                          ? String(formData.b2b_margin_percentage)
                          : ""
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") {
                          handleChange("b2b_margin_percentage", null);
                          return;
                        }
                        const num = parseFloat(v);
                        if (!Number.isNaN(num) && num >= 0 && num <= 100) {
                          handleChange("b2b_margin_percentage", num);
                        }
                      }}
                    />
                    <p className={ADMIN_HELP_TEXT_CLASS}>
                      Påverkar B2B-priset.
                    </p>
                    {formData.b2b_margin_percentage != null &&
                    formData.b2b_margin_percentage >= 0 &&
                    formData.b2b_margin_percentage < 100 &&
                    (formData.cost_amount ?? 0) > 0 ? (
                      <div className="space-y-0.5 text-xs text-zinc-400">
                        <div className="text-xs font-medium text-zinc-200">
                          B2B-pris:{" "}
                          {Math.round(
                            calculateB2BPriceExclVat(
                              formData.cost_amount ?? 0,
                              exchangeRate,
                              2219,
                              formData.b2b_margin_percentage,
                              shippingPerBottleSek,
                            ),
                          )}{" "}
                          SEK exkl. moms
                        </div>
                        <div className="text-xs font-medium text-zinc-200">
                          {Math.round(
                            calculateB2BPriceExclVat(
                              formData.cost_amount ?? 0,
                              exchangeRate,
                              2219,
                              formData.b2b_margin_percentage,
                              shippingPerBottleSek,
                            ) * 1.25,
                          )}{" "}
                          SEK inkl. moms
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {wine?.id ? (
                  <WineB2BPalletStockTable
                    wineId={wine.id}
                    onStockUpdated={fetchShippingFromPallets}
                    embedded
                  />
                ) : null}
              </AdminFormSection>
            ) : null}
          </div>
      </form>
    </div>
  );
}
