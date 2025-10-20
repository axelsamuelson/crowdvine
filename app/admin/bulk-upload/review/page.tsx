"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Edit,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";

export default function ReviewPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(
    new Set(),
  );
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    stage: string;
    percentage: number;
    details?: string;
  }>({ stage: "", percentage: 0 });
  const [editingRow, setEditingRow] = useState<null | number>(null);

  useEffect(() => {
    // Get products from sessionStorage or redirect back to upload
    const storedProducts = sessionStorage.getItem("bulkUploadProducts");
    if (!storedProducts) {
      toast.error("No products to review. Please upload CSV first.");
      router.push("/admin/bulk-upload");
      return;
    }

    const parsedProducts = JSON.parse(storedProducts);
    setProducts(parsedProducts);

    // Auto-select products that can be uploaded
    setSelectedProducts(
      new Set(
        parsedProducts
          .map((p: any, index: number) => {
            const hasCriticalIssues = p.rowIssues?.some(
              (issue: string) =>
                issue.includes("Critical:") || issue.includes("Error:"),
            );
            return p.canUpload !== false && !hasCriticalIssues ? index : null;
          })
          .filter((index: number | null) => index !== null),
      ),
    );
  }, [router]);

  const toggleProductSelection = (index: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProducts(newSelected);
  };

  const selectAllProducts = () => {
    setSelectedProducts(new Set(products.map((_, index) => index)));
  };

  const deselectAllProducts = () => {
    setSelectedProducts(new Set());
  };

  const updateProduct = (index: number, field: string, value: any) => {
    const newProducts = [...products];
    newProducts[index][field] = value;
    setProducts(newProducts);
    setEditingRow(null);
  };

  const handleConfirmUpload = async () => {
    const productsToUpload = products.filter((_, index) =>
      selectedProducts.has(index),
    );

    if (productsToUpload.length === 0) {
      toast.error("Please select at least one product to upload");
      return;
    }

    setUploading(true);

    // Reset progress
    setUploadProgress({ stage: "Preparing upload...", percentage: 0 });

    try {
      // Stage 1: Preparing data
      setUploadProgress({
        stage: "Preparing products for upload...",
        percentage: 10,
        details: `Processing ${productsToUpload.length} products`,
      });

      // Stage 2: Validating producers
      setUploadProgress({
        stage: "Validating producer data...",
        percentage: 25,
        details: "Checking producer information",
      });

      const response = await fetch("/api/admin/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: productsToUpload }),
      });

      // Stage 3: Processing upload
      setUploadProgress({
        stage: "Uploading to database...",
        percentage: 80,
        details: "Creating wines and producers",
      });

      const data = await response.json();

      // Stage 4: Completing
      setUploadProgress({
        stage: "Upload complete!",
        percentage: 100,
        details: `Successfully uploaded ${productsToUpload.length} products`,
      });

      if (response.ok) {
        toast.success(data.message);
        // Brief pause before redirect
        await new Promise((resolve) => setTimeout(resolve, 1000));
        sessionStorage.removeItem("bulkUploadProducts");
        router.push("/admin/bulk-upload");
      } else {
        setUploadProgress({
          stage: "Upload failed!",
          percentage: 0,
          details: data.error || "Unknown error occurred",
        });
        toast.error(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress({
        stage: "Upload failed!",
        percentage: 0,
        details: "Network error occurred",
      });
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (product: any) => {
    const hasCriticalIssues = product.rowIssues?.some((issue: string) =>
      issue.includes("Critical:"),
    );
    const hasErrors = product.rowIssues?.some((issue: string) =>
      issue.includes("Error:"),
    );

    if (hasCriticalIssues) {
      return <Badge variant="destructive">🚨 Critical</Badge>;
    } else if (hasErrors) {
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-800">
          ⚠️ Error
        </Badge>
      );
    } else if (product.rowIssues?.length > 0) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          ⚠️ Warning
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          ✅ Valid
        </Badge>
      );
    }
  };

  const getColorOptions = (product: any) => {
    const validColors = ["red", "white", "rose"];
    const currentColor = product.color?.toLowerCase();

    return validColors.map((color) => (
      <SelectItem key={color} value={color}>
        {color.charAt(0).toUpperCase() + color.slice(1)}
      </SelectItem>
    ));
  };

  const canUpload = (product: any) => {
    const hasCriticalIssues = product.rowIssues?.some(
      (issue: string) =>
        issue.includes("Critical:") ||
        issue.includes("Error: Cost") ||
        issue.includes("Error: Producer"),
    );
    return !hasCriticalIssues;
  };

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Loading products for review...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            onClick={() => router.push("/admin/bulk-upload")}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Upload
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Review Products
            </h1>
            <p className="text-gray-600">
              Review and edit products before uploading
            </p>
          </div>
        </div>

        {/* Selection Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex gap-3 items-center">
                <Button onClick={selectAllProducts} variant="outline" size="sm">
                  Select All ({products.length})
                </Button>
                <Button
                  onClick={deselectAllProducts}
                  variant="outline"
                  size="sm"
                >
                  Deselect All
                </Button>
                <div className="ml-auto text-sm text-gray-600">
                  {selectedProducts.size} of {products.length} selected
                </div>
                <Button
                  onClick={handleConfirmUpload}
                  disabled={selectedProducts.size === 0 || uploading}
                  className="bg-gray-900 hover:bg-gray-800"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload {selectedProducts.size} Products
                    </>
                  )}
                </Button>
              </div>

              {/* Upload Progress Bar */}
              {uploading && uploadProgress.stage && (
                <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-blue-800 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      {uploadProgress.stage}
                    </span>
                    <span className="text-blue-600 font-mono">
                      {uploadProgress.percentage}%
                    </span>
                  </div>
                  <Progress
                    value={uploadProgress.percentage}
                    className="h-3 w-full bg-blue-100"
                  />
                  {uploadProgress.details && (
                    <p className="text-xs text-blue-700 italic">
                      {uploadProgress.details}
                    </p>
                  )}
                  {uploadProgress.percentage < 100 &&
                    uploadProgress.percentage > 0 && (
                      <p className="text-xs text-blue-600">
                        🚀 Creating wines and producers in database...
                      </p>
                    )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Products Review
            </CardTitle>
            <CardDescription>
              Review each product and edit as needed. Products with critical
              issues cannot be uploaded.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Wine Name</TableHead>
                    <TableHead>Vintage</TableHead>
                    <TableHead>Grapes</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Producer</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product, index) => (
                    <TableRow
                      key={index}
                      className={!canUpload(product) ? "bg-red-50" : ""}
                    >
                      {/* Selection */}
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(index)}
                          onChange={() => toggleProductSelection(index)}
                          disabled={!canUpload(product)}
                          className={`w-4 h-4 ${!canUpload(product) ? "opacity-50 cursor-not-allowed" : ""}`}
                        />
                      </TableCell>

                      {/* Status */}
                      <TableCell>{getStatusBadge(product)}</TableCell>

                      {/* Wine Name */}
                      <TableCell className="font-medium">
                        {editingRow === index ? (
                          <Input
                            value={product.wine_name}
                            onChange={(e) =>
                              updateProduct(index, "wine_name", e.target.value)
                            }
                          />
                        ) : (
                          product.wine_name
                        )}
                      </TableCell>

                      {/* Vintage */}
                      <TableCell>
                        {editingRow === index ? (
                          <Input
                            value={product.vintage}
                            onChange={(e) =>
                              updateProduct(index, "vintage", e.target.value)
                            }
                          />
                        ) : (
                          product.vintage
                        )}
                      </TableCell>

                      {/* Grapes */}
                      <TableCell>
                        {editingRow === index ? (
                          <div className="space-y-2">
                            <Input
                              value={product.grape_varieties}
                              onChange={(e) =>
                                updateProduct(
                                  index,
                                  "grape_varieties",
                                  e.target.value,
                                )
                              }
                              placeholder="Syrah; Grenache; Mourvèdre"
                            />
                            {product.grapeSuggestions && (
                              <div className="text-xs text-blue-600">
                                Suggestions:{" "}
                                {product.grapeSuggestions.join(", ")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="text-sm">
                              {product.grape_varieties}
                            </div>
                            {product.originalGrapeText &&
                              product.originalGrapeText !==
                                product.grape_varieties && (
                                <div className="text-xs text-gray-500">
                                  Original: {product.originalGrapeText}
                                </div>
                              )}
                          </div>
                        )}
                      </TableCell>

                      {/* Color */}
                      <TableCell>
                        {editingRow === index ? (
                          <Select
                            value={product.color}
                            onValueChange={(value) =>
                              updateProduct(index, "color", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getColorOptions(product)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">
                            {product.color?.charAt(0).toUpperCase() +
                              product.color?.slice(1)}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Producer */}
                      <TableCell>
                        {editingRow === index ? (
                          <div className="space-y-2">
                            <Input
                              value={product.producer_name}
                              onChange={(e) =>
                                updateProduct(
                                  index,
                                  "producer_name",
                                  e.target.value,
                                )
                              }
                            />
                            {product.similarProducers &&
                              product.similarProducers.length > 0 && (
                                <div className="text-xs text-yellow-600">
                                  Similar:{" "}
                                  {product.similarProducers
                                    .map((p: any) => p.name)
                                    .join(", ")}
                                </div>
                              )}
                          </div>
                        ) : (
                          product.producer_name
                        )}
                      </TableCell>

                      {/* Cost */}
                      <TableCell>
                        <div className="text-sm">
                          {product.cost_amount} {product.cost_currency}
                          <br />
                          <span className="text-xs text-gray-500">
                            {product.margin_percentage}% margin
                          </span>
                        </div>
                      </TableCell>

                      {/* Issues */}
                      <TableCell>
                        {product.rowIssues && product.rowIssues.length > 0 ? (
                          <div className="space-y-1 max-w-xs">
                            {product.rowIssues
                              .slice(0, 2)
                              .map((issue: string, issueIndex: number) => (
                                <div
                                  key={issueIndex}
                                  className={`text-xs p-1 rounded ${
                                    issue.includes("Critical:") ||
                                    issue.includes("Error:")
                                      ? "bg-red-100 text-red-700 border border-red-200"
                                      : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                  }`}
                                >
                                  {issue}
                                </div>
                              ))}
                            {product.rowIssues.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{product.rowIssues.length - 2} more...
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-green-600">
                            ✓ No issues
                          </span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <Button
                          onClick={() =>
                            setEditingRow(editingRow === index ? null : index)
                          }
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          {editingRow === index ? "Save" : "Edit"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
