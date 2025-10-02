"use client";

import { useState } from "react";
import { Upload, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface UploadResult {
  success: boolean;
  message: string;
  stats?: {
    total: number;
    created: number;
    errors: number;
  };
  errors?: string[];
}

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        toast.error("Please select a CSV file");
        return;
      }
      setFile(selectedFile);
      setResult(null); // Clear previous results
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      setResult(data);

      if (response.ok) {
        toast.success(data.message);
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById("csv-file") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed");
      setResult({
        success: false,
        message: "Upload failed due to network error"
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    window.open("/templates/bulk-products-template.csv", "_blank");
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bulk Product Upload</h1>
        <p className="text-gray-600">
          Upload multiple wine products at once using a CSV file. This saves time when adding many products to your inventory.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Template Download */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Download Template
            </CardTitle>
            <CardDescription>
              Use this CSV template to format your product data correctly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={downloadTemplate}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload CSV File
            </CardTitle>
            <CardDescription>
              Select a CSV file with your product data to upload
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label 
                htmlFor="csv-file" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Select CSV File
              </label>
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
              />
            </div>

            {file && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-gray-900">{file.name}</span>
                  <span className="text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Products
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* CSV Format Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>CSV Format Requirements</CardTitle>
            <CardDescription>
              Your CSV file must include these columns in this exact order:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="font-medium text-gray-900">Required Columns:</div>
                <div className="text-gray-700">Description</div>
                
                <div className="font-mono text-xs bg-white p-1 rounded border">Wine Name</div>
                <div>Product name (e.g., "Domaine de la Clape Rouge")</div>
                
                <div className="font-mono text-xs bg-white p-1 rounded border">Vintage</div>
                <div>Year (e.g., "2020")</div>
                
                <div className="font-mono text-xs bg-white p-1 rounded border">Grape Varieties</div>
                <div>Grape types (e.g., "Syrah; Grenache; Mourvèdre")</div>
                
                <div className="font-mono text-xs bg-white p-1 rounded border">Color</div>
                <div>Must be "red", "white", or "rose"</div>
                
                <div className="font-mono text-xs bg-white p-1 rounded border">Base Price (SEK)</div>
                <div>Price in Swedish Kronor (e.g., "148.00")</div>
                
                <div className="font-mono text-xs bg-white p-1 rounded border">Producer Name</div>
                <div>Winery name (will be created if doesn't exist)</div>
                
                <div className="font-mono text-xs bg-white p-1 rounded border">Handle</div>
                <div>Unique URL slug (auto-generated if empty)</div>
                
                <div className="font-mono text-xs bg-white p-1 rounded border">Description</div>
                <div>Short product description</div>
                
                <div className="font-mono text-xs bg-white p-1 rounded border">Description HTML</div>
                <div>HTML formatted description (optional)</div>
                
                <div className="font-mono text-xs bg-white p-1 rounded border">Image URL</div>
                <div>URL to product image</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                Upload Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                    {result.message}
                  </AlertDescription>
                </Alert>

                {result.stats && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Statistics:</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Total Rows:</span>
                        <span className="ml-1 font-semibold text-gray-900">{result.stats.total}</span>
                      </div>
                      <div>
                        <span className="font-medium text-green-600">Created:</span>
                        <span className="ml-1 font-semibold text-green-700">{result.stats.created}</span>
                      </div>
                      <div>
                        <span className="font-medium text-red-600">Errors:</span>
                        <span className="ml-1 font-semibold text-red-700">{result.stats.errors}</span>
                      </div>
                    </div>
                  </div>
                )}

                {result.errors && result.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-900 mb-2">Errors:</h4>
                    <ul className="space-y-1 text-sm text-red-800">
                      {result.errors.map((error, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-1 h-1 bg-red-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          <span>{error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
