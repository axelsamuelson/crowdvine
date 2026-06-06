"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, Move, Eye, Star, StarOff } from "lucide-react";
import { WineImage } from "@/lib/types/wine-images";

interface WineImageUploadProps {
  wineId?: string;
  existingImages?: WineImage[];
  onImagesChange?: (images: File[]) => void;
  onExistingImagesChange?: (images: WineImage[]) => void;
  images?: File[];
  /** Render without outer Card (e.g. inside AdminFormSection) */
  embedded?: boolean;
}

export function WineImageUpload({
  wineId,
  existingImages = [],
  onImagesChange,
  onExistingImagesChange,
  images = [],
  embedded = false,
}: WineImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError("");

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length !== files.length) {
      setError("Some files are not images and were ignored");
    }

    if (imageFiles.length > 0 && onImagesChange) {
      const newImages = [...images, ...imageFiles];
      onImagesChange(newImages);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length > 0 && onImagesChange) {
      const newImages = [...images, ...imageFiles];
      onImagesChange(newImages);
    }
  };

  const removeNewImage = (index: number) => {
    if (onImagesChange) {
      const newImages = images.filter((_, i) => i !== index);
      onImagesChange(newImages);
    }
  };

  const moveNewImage = (fromIndex: number, toIndex: number) => {
    if (onImagesChange) {
      const newImages = [...images];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      onImagesChange(newImages);
    }
  };

  const removeExistingImage = async (imageId: string) => {
    if (!wineId) return;

    setLoading(true);
    try {
      const { deleteWineImage } = await import("@/lib/actions/wine-images");
      await deleteWineImage(imageId);

      if (onExistingImagesChange) {
        const updatedImages = existingImages.filter(
          (img) => img.id !== imageId,
        );
        onExistingImagesChange(updatedImages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete image");
    } finally {
      setLoading(false);
    }
  };

  const setPrimaryImage = async (imageId: string) => {
    if (!wineId) return;

    setLoading(true);
    try {
      const { setPrimaryWineImage } = await import("@/lib/actions/wine-images");
      await setPrimaryWineImage(imageId);

      if (onExistingImagesChange) {
        const updatedImages = existingImages.map((img) => ({
          ...img,
          is_primary: img.id === imageId,
        }));
        onExistingImagesChange(updatedImages);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set primary image",
      );
    } finally {
      setLoading(false);
    }
  };

  const reorderExistingImages = async (imageIds: string[]) => {
    if (!wineId) return;

    setLoading(true);
    try {
      const { reorderWineImages } = await import("@/lib/actions/wine-images");
      await reorderWineImages(wineId, imageIds);

      if (onExistingImagesChange) {
        const updatedImages = imageIds
          .map((id, index) => {
            const image = existingImages.find((img) => img.id === id);
            return image ? { ...image, sort_order: index } : null;
          })
          .filter(Boolean) as WineImage[];
        onExistingImagesChange(updatedImages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder images");
    } finally {
      setLoading(false);
    }
  };

  const moveExistingImage = (fromIndex: number, toIndex: number) => {
    const newOrder = [...existingImages];
    const [movedImage] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedImage);

    const imageIds = newOrder.map((img) => img.id);
    reorderExistingImages(imageIds);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const allImages = [
    ...existingImages,
    ...images.map((file, index) => ({
      id: `new-${index}`,
      wine_id: wineId || "",
      image_path: URL.createObjectURL(file),
      alt_text: file.name,
      sort_order: existingImages.length + index,
      is_primary: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isNew: true,
    })),
  ];

  const uploadContent = (
    <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Upload Area */}
        <div
          className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5 dark:bg-zinc-800/80"
              : "border-gray-300 bg-white hover:border-gray-400 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-500"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="mb-2 text-lg font-medium text-gray-900 dark:text-zinc-100">
            Släpp bilder här eller klicka för att ladda upp
          </p>
          <p className="mb-4 text-sm text-gray-500 dark:text-zinc-400">
            JPG, PNG, GIF upp till 10 MB per fil
          </p>
          <Button
            onClick={openFileDialog}
            variant="outline"
            type="button"
            disabled={loading}
            className="rounded-lg border-gray-200 bg-white text-xs text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            Välj filer
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Image List */}
        {allImages.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100">
              Bilder ({allImages.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allImages.map((image, index) => {
                const isNewImage = "isNew" in image;
                const isExistingImage = !isNewImage;

                return (
                  <div key={image.id} className="relative group">
                    <div className="w-20 h-20 rounded-lg border overflow-hidden bg-white dark:bg-zinc-800">
                      <img
                        src={image.image_path}
                        alt={image.alt_text || `Product image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Primary indicator */}
                    {image.is_primary && (
                      <div className="absolute top-1 left-1 bg-yellow-500 text-white text-xs px-1 py-0.5 rounded">
                        ★
                      </div>
                    )}

                    {/* Position indicator */}
                    <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded text-[10px]">
                      {index + 1}
                    </div>

                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        type="button"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          const newWindow = window.open(image.image_path);
                          if (newWindow) newWindow.focus();
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>

                      {isExistingImage && (
                        <Button
                          size="sm"
                          variant="secondary"
                          type="button"
                          className="h-6 w-6 p-0"
                          onClick={() => setPrimaryImage(image.id)}
                          disabled={loading || image.is_primary}
                        >
                          {image.is_primary ? (
                            <Star className="h-3 w-3 text-yellow-500" />
                          ) : (
                            <StarOff className="h-3 w-3" />
                          )}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="destructive"
                        type="button"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          if (isNewImage) {
                            removeNewImage(index - existingImages.length);
                          } else {
                            removeExistingImage(image.id);
                          }
                        }}
                        disabled={loading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Move buttons */}
                    <div className="absolute bottom-1 left-1 space-y-1">
                      {index > 0 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-4 w-4 p-0 text-xs"
                          type="button"
                          onClick={() => {
                            if (
                              isExistingImage &&
                              index < existingImages.length
                            ) {
                              moveExistingImage(index, index - 1);
                            } else if (isNewImage) {
                              moveNewImage(
                                index - existingImages.length,
                                index - existingImages.length - 1,
                              );
                            }
                          }}
                          disabled={loading}
                        >
                          ↑
                        </Button>
                      )}
                      {index < allImages.length - 1 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-4 w-4 p-0 text-xs"
                          type="button"
                          onClick={() => {
                            if (
                              isExistingImage &&
                              index < existingImages.length - 1
                            ) {
                              moveExistingImage(index, index + 1);
                            } else if (isNewImage) {
                              moveNewImage(
                                index - existingImages.length,
                                index - existingImages.length + 1,
                              );
                            }
                          }}
                          disabled={loading}
                        >
                          ↓
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-gray-500 dark:text-zinc-400">
              <p>• Första bilden blir huvudbild (★)</p>
              <p>• Använd pilarna för att ändra ordning</p>
              <p>• Klicka på ögat för att förhandsgranska</p>
            </div>
          </div>
        )}
    </div>
  );

  if (embedded) {
    return uploadContent;
  }

  return (
    <Card className="dark:border-zinc-800 dark:bg-[#0F0F12]">
      <CardHeader>
        <CardTitle>Produktbilder</CardTitle>
        <CardDescription>
          Ladda upp etikett och galleribilder. Första bilden blir huvudbild.
        </CardDescription>
      </CardHeader>
      <CardContent>{uploadContent}</CardContent>
    </Card>
  );
}
