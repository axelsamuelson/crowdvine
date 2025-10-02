"use client";

import { useState } from "react";
import { Upload, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface UploadResult {
  success: boolean;
  message: string;
  details?: {
    summary?: {
      totalRows: number;
      parsedRows: number;
      errorCount: number;
      criticalErrors: number;
      headerErrors: number;
      rowErrors: number;
    };
    headerIssues?: string[];
    rowIssues?: string[];
    csvStructure?: {
      headerRow: string;
      expectedHeaders: string[];
      actualHeaders: string[];
      columnCount: number;
    };
    debugInfo?: {
      fileLines: number;
      fileSize: number;
      fileName: string;
      hasContent: boolean;
      isEmptyFile: boolean;
    };
    allErrors?: string[];
  };
  stats?: {
    total: number;
    created: number;
    errors: number;
    warnings: number;
  };
  errors?: string[];
  warnings?: Array<{
    row: number;
    wine: string;
    type: string;
    message: string;
    suggestions?: string[];
  }>;
}

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [step, settep] = useState<'upload' | 'review' | 'complete'>('upload');
  const [reviewProducts, setReviewProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [parseProgress, setParseProgress] = useState<{
    stage: string;
    percentage: number;
    details?: string;
  }>({ stage: '', percentage: 0 });

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

  const handleParse = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);
    setResult(null);
    
    // Reset progress
    setParseProgress({ stage: 'Starting upload...', percentage: 0 });

    try {
      // Calculate estimated parsing time based on file size
      const rows = (file.size / 50); // Rough estimate: ~50 bytes per row in CSV
      const estimatedTime = Math.max(2, Math.min(10, rows / 100)); // Between 2-10 seconds
      
      // Stage 1: Preparing file
      setParseProgress({ stage: 'Reading CSV file...', percentage: 5, details: `Processing ${file.name} (${file.size > 1024 ? (file.size/1024).toFixed(1) + ' KB' : file.size + ' bytes'})` });
      
      const formData = new FormData();
      formData.append("file", file);

      // Stage 2: Sending to server
      setParseProgress({ stage: 'Uploading to server...', percentage: 15, details: `Uploading file to server...` });
      
      const startTime = Date.now();
      
      const response = await fetch("/api/admin/bulk-upload/parse", {
        method: "POST",
        body: formData,
      });

      // Stage 3: Processing response  
      const uploadTime = Date.now() - startTime;
      setParseProgress({ stage: 'Parsing CSV data...', percentage: 60, details: `Server processing complete, parsing ${Math.round(rows)} estimated rows` });

      const data = await response.json();
      
      // Stage 4: Complete processing
      setParseProgress({ stage: 'Finalizing results...', percentage: 95, details: `Found ${data.products?.length || 0} products` });
      
      // Brief pause before showing final result
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Stage 5: Complete
      setParseProgress({ stage: 'Parse complete!', percentage: 100, details: `Ready to review ${data.products?.length || 0} products` });

      if (response.ok) {
        setReviewProducts(data.products);
        // Store products in sessionStorage for review page
        sessionStorage.setItem('bulkUploadProducts', JSON.stringify(data.products));
        setStep('review');
        toast.success(`CSV parsed successfully. Found ${data.products.length} products to review`);
        
        // Redirect to dedicated review page
        window.location.href = '/admin/bulk-upload/review';
      } else {
        console.log("Parse failed with details:", data);
        toast.error(data.error || "Parse failed");
        setResult({
          success: false,
          message: data.error || "Parse failed",
          details: data.details, // Include detailed error information
          errors: data.details?.allErrors || data.details || []
        });
        setStep('complete'); // Show errors in complete step if parsing failed
      }
    } catch (error) {
      console.error("Parse error:", error);
      toast.error("Parse failed");
      setParseProgress({ stage: 'Parse failed!', percentage: 0, details: 'An error occurred during parsing' });
      setResult({
        success: false,
        message: "Parse failed due to network error"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmUpload = async () => {
    const productsToUpload = reviewProducts.filter((_, index) => selectedProducts.has(index));
    
    if (productsToUpload.length === 0) {
      toast.error("Please select at least one product to upload");
      return;
    }

    setUploading(true);

    try {
      const response = await fetch("/api/admin/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: productsToUpload }),
      });

      const data = await response.json();
      setResult(data);
      setStep('complete');
      setFile(null);
      
      if (response.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

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
    setSelectedProducts(new Set(reviewProducts.map((_, index) => index)));
  };

  const deselectAllProducts = () => {
    setSelectedProducts(new Set());
  };

  const downloadTemplate = () => {
    // Add timestamp to bust cache
    const timestamp = new Date().getTime();
    window.open(`/templates/bulk-products-template.csv?v=${timestamp}`, "_blank");
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
                    onClick={handleParse}
                    disabled={!file || uploading}
                    className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      <>
                        <Upload {...uploading && { className: "w-4 h-4 mr-2 animate-pulse" }} />
                        Parse & Review
                      </>
                    )}
                  </Button>

                  {/* Progress Bar */}
                  {uploading && parseProgress.stage && (
                    <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                          {parseProgress.stage}
                        </span>
                        <span className="text-gray-500 font-mono">{parseProgress.percentage}%</span>
                      </div>
                      <Progress value={parseProgress.percentage} className="h-3 w-full" />
                      {parseProgress.details && (
                        <p className="text-xs text-gray-600 italic">{parseProgress.details}</p>
                      )}
                      {parseProgress.percentage < 100 && (
                        <p className="text-xs text-blue-600">
                          💡 Large files may take longer to process...
                        </p>
                      )}
                    </div>
                  )}
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
                
                <div className="font-mono text-xs bg-white p-1 rounded border">Cost</div>
                <div>Purchase cost (e.g., "7.50")</div>
                
                <div className="font-mono text-xs bg-white p-1 rounded border">Currency</div>
                <div>Currency code: EUR, USD, GBP, SEK</div>
                
                <div className="font-mono text-xs bg-white p-1 rounded border">Margin (%)</div>
                <div>Gross margin percentage (e.g., "10")</div>
                
                <div className="font-mono text-xs bg-white p-1 rounded border">Producer Name</div>
                <div>Winery name (will be created if doesn't exist)</div>
                
                <div className="font-mono text-xs bg-white p-1 rounded border">Description</div>
                <div>Short product description (optional - auto-generated if empty)</div>
                
                <div className="font-mono text-xs bg-white p-1 rounded border">Image URL</div>
                <div>Optional - uses default "Coming Soon" image if empty</div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-900">
                  <strong>Auto-generated:</strong> Handle (wine-name-vintage) and alcohol tax (22.19 SEK) are automatically added.<br/>
                  <strong>Default image:</strong> All bulk upload wines will use the same "Coming Soon" image unless Image URL is specified.
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-yellow-800">
                <strong>⚠️ If you get CSV parsing errors:</strong> Make sure to download the latest template from above. 
                Old templates may have different column names like "Base Price (SEK)" and "Handle" which are no longer valid.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Step */}
        {step === 'review' && reviewProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Review Products
              </CardTitle>
              <CardDescription>
                Review each product and select which ones to upload. Check producer names for typos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Selection Controls */}
              <div className="flex gap-3 mb-6">
                <Button
                  onClick={selectAllProducts}
                  variant="outline"
                  size="sm"
                >
                  Select All ({reviewProducts.length})
                </Button>
                <Button
                  onClick={deselectAllProducts}
                  variant="outline"
                  size="sm"
                >
                  Deselect All
                </Button>
                <div className="ml-auto text-sm text-gray-600">
                  {selectedProducts.size} of {reviewProducts.length} selected
                </div>
              </div>

              {/* Products List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {reviewProducts.map((product, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      selectedProducts.has(index)
                        ? 'border-gray-400 bg-gray-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Selection Checkbox */}
                      <div className="flex items-center mt-1">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(index)}
                          onChange={() => toggleProductSelection(index)}
                          disabled={product.rowIssues?.some((issue: string) => 
                            issue.includes('Critical:') || issue.includes('Error: Cost')
                          )}
                          className={`w-4 h-4 text-gray-600 bg-gray-100 border-gray-300 rounded focus:ring-gray-500 ${
                            product.rowIssues?.some((issue: string) => 
                              issue.includes('Critical:') || issue.includes('Error: Cost')
                            ) ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-sm">
                              {product.wine_name} ({product.vintage})
                            </h4>
                            <div className="text-xs text-gray-500 mt-1">
                              Row {product.rowNumber} • {product.grape_varieties} • {product.color}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {product.cost_amount && product.cost_currency ? 
                                `Cost: ${product.cost_amount} ${product.cost_currency}, Margin: ${product.margin_percentage}%` :
                                `Price: ${Math.ceil(product.base_price_cents / 100)} SEK`
                              }
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Handle: <span className="font-mono">{product.handle}</span>
                            </div>
                          </div>
                          
                          {/* Status Badge */}
                          <div className="ml-4">
                            {product.status === 'valid' && (
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </div>
                            )}
                            {product.status === 'warning' && (
                              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-yellow-600" />
                              </div>
                            )}
                            {product.status === 'error' && (
                              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Editable Fields */}
                        <div className="mt-3 space-y-3">
                          {/* Grape Varieties - Editable */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 w-24">Grapes:</span>
                            <input
                              type="text"
                              value={product.grape_varieties || product.grapeVarieties || ''}
                              onChange={(e) => {
                                const newProducts = [...reviewProducts];
                                newProducts[index].grape_varieties = e.target.value;
                                setReviewProducts(newProducts);
                              }}
                              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                              placeholder="Grape varieties (optional)"
                            />
                          </div>
                          
                          {/* Producer - Editable */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 w-24">Producer:</span>
                            <input
                              type="text"
                              value={product.producer_name || ''}
                              onChange={(e) => {
                                const newProducts = [...reviewProducts];
                                newProducts[index].producer_name = e.target.value;
                                setReviewProducts(newProducts);
                              }}
                              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                              placeholder="Producer name"
                            />
                          </div>
                          
                          {/* Description - Editable */}
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-medium text-gray-700 w-24">Description:</span>
                            <textarea
                              value={product.description || ''}
                              onChange={(e) => {
                                const newProducts = [...reviewProducts];
                                newProducts[index].description = e.target.value;
                                setReviewProducts(newProducts);
                              }}
                              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                              rows={2}
                              placeholder="Description (optional)"
                            />
                          </div>
                          
                          {/* Producer Suggestions */}
                          {product.similarProducers && product.similarProducers.length > 0 && (
                            <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <p className="text-xs font-medium text-yellow-800 mb-2">
                                Did you mean one of these producers?
                              </p>
                              <div className="space-y-1">
                                {product.similarProducers.map((suggestion: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between">
                                    <span className="text-xs text-yellow-700">
                                      {suggestion.name}
                                    </span>
                                    <span className="text-xs text-yellow-600">
                                      {Math.round(suggestion.similarity * 100)}% match
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Issues - Show parsing issues */}
                          {(product.rowIssues && product.rowIssues.length > 0) && (
                            <div className="mt-2 space-y-1">
                              {product.rowIssues.map((issue: string, idx: number) => (
                                <div key={idx} className={`text-xs p-2 rounded ${
                                  issue.includes('Critical:') || issue.includes('Error:')
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                }`}>
                                  {issue.includes('Critical:') ? '🚨' : issue.includes('Error:') ? '⚠️' : 'ℹ️'} {issue}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Legacy Issues */}
                          {product.issues && product.issues.length > 0 && (
                            <div className="mt-2">
                              {product.issues.map((issue: string, idx: number) => (
                                <div key={idx} className={`text-xs p-2 rounded ${
                                  product.status === 'error'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                }`}>
                                  ⚠️ {issue}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirm Buttons */}
              <div className="flex gap-3 mt-6 pt-4 border-t">
                <Button
                  onClick={() => setStep('upload')}
                  variant="outline"
                  className="bg-white hover:bg-gray-50"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmUpload}
                  disabled={selectedProducts.size === 0 || uploading}
                  className="bg-gray-900 hover:bg-gray-800 ml-auto"
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
            </CardContent>
          </Card>
        )}

        {/* Upload Results */}
        {step === 'complete' && result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                {result.success ? "Upload Complete" : "CSV Parsing Failed - Detailed Report"}
              </CardTitle>
              <CardDescription>
                {result.success ? "Your products have been processed." : "Detailed breakdown of what went wrong with your CSV."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                    {result.message}
                  </AlertDescription>
                </Alert>

                {/* Detailed Error Analysis for CSV failures */}
                {result.details && !result.success && (
                  <div className="space-y-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 mb-2">🧪 Debug Info:</h4>
                      <pre className="text-xs text-red-800 overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </div>
                    {/* Summary Statistics */}
                    {result.details.summary && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">📊 Error Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div className="text-center p-3 bg-white rounded">
                            <div className="text-xl font-bold text-gray-900">{result.details.summary.totalRows}</div>
                            <div className="text-xs text-gray-500">Total Rows</div>
                          </div>
                          <div className="text-center p-3 bg-green-100 rounded">
                            <div className="text-xl font-bold text-green-700">{result.details.summary.parsedRows}</div>
                            <div className="text-xs text-green-600">Parsed</div>
                          </div>
                          <div className="text-center p-3 bg-red-100 rounded">
                            <div className="text-xl font-bold text-red-700">{result.details.summary.errorCount}</div>
                            <div className="text-xs text-red-600">Errors</div>
                          </div>
                          <div className="text-center p-3 bg-red-200 rounded">
                            <div className="text-xl font-bold text-red-800">{result.details.summary.criticalErrors}</div>
                            <div className="text-xs text-red-700">Critical</div>
                          </div>
                          <div className="text-center p-3 bg-yellow-100 rounded">
                            <div className="text-xl font-bold text-yellow-700">{result.details.summary.headerErrors}</div>
                            <div className="text-xs text-yellow-600">Headers</div>
                          </div>
                          <div className="text-center p-3 bg-orange-100 rounded">
                            <div className="text-xl font-bold text-orange-700">{result.details.summary.rowErrors}</div>
                            <div className="text-xs text-orange-600">Row Issues</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CSV Structure Analysis */}
                    {result.details.csvStructure && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-3">📋 CSV Format Analysis</h4>
                        
                        <div className="space-y-3">
                          <div>
                            <h5 className="font-medium text-blue-800 mb-1">Your Header Row:</h5>
                            <code className="block bg-white p-2 rounded text-xs break-all">{result.details.csvStructure.headerRow}</code>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="font-medium text-blue-800 mb-2">✅ Expected Headers:</h5>
                              <div className="space-y-1">
                                {result.details.csvStructure.expectedHeaders.map((header, idx) => (
                                  <div key={idx} className={`text-xs px-2 py-1 rounded ${
                                    result.details?.csvStructure?.actualHeaders.includes(header)
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {(result.details?.csvStructure?.actualHeaders.includes(header) ? '✓' : '✗')} {header}
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="font-medium text-blue-800 mb-2">🔍 Your Headers:</h5>
                              <div className="space-y-1">
                                {result.details.csvStructure.actualHeaders.map((header, idx) => (
                                  <div key={idx} className="text-xs px-2 py-1 bg-white rounded">
                                    {header}
                                  </div>
                                ))}
                              </div>
                              {result.details.csvStructure.columnCount !== result.details.csvStructure.expectedHeaders.length && (
                                <div className="mt-2 text-xs text-orange-600">
                                  ⚠️ Column count mismatch: {result.details.csvStructure.columnCount} columns vs {result.details.csvStructure.expectedHeaders.length} expected
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="text-sm text-red-800">
                              <strong>💡 Quick Fix:</strong> Download the latest CSV template above and copy your data into it, ensuring all headers match exactly (case-sensitive).
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Header Issues */}
                    {result.details.headerIssues && result.details.headerIssues.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-semibold text-red-900 mb-3">🚫 Header Problems</h4>
                        <div className="space-y-2">
                          {result.details.headerIssues.map((issue, idx) => (
                            <div key={idx} className="p-2 bg-red-100 border border-red-300 rounded text-sm text-red-800">
                              {issue}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Row Issues */}
                    {result.details.rowIssues && result.details.rowIssues.length > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h4 className="font-semibold text-orange-900 mb-3">⚠️ Row-by-Row Issues</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {result.details.rowIssues.map((issue, idx) => (
                            <div key={idx} className="p-2 bg-orange-100 border border-orange-300 rounded text-sm text-orange-800">
                              {issue}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Debug Info */}
                    {result.details.debugInfo && (
                      <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">🔧 Technical Details</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><strong>File:</strong> {result.details.debugInfo.fileName}</div>
                          <div><strong>Size:</strong> {(result.details.debugInfo.fileSize / 1024).toFixed(1)} KB</div>
                          <div><strong>Lines:</strong> {result.details.debugInfo.fileLines}</div>
                          <div><strong>Has Content:</strong> {result.details.debugInfo.hasContent ? 'Yes' : 'No'}</div>
                          {result.details.debugInfo.isEmptyFile && (
                            <div className="col-span-2 text-red-600 font-medium">
                              ⚠️ Your file appears to be empty or corrupted!
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {result.stats && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Statistics:</h4>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Total Rows:</span>
                        <span className="ml-1 font-semibold text-gray-900">{result.stats.total}</span>
                      </div>
                      <div>
                        <span className="font-medium text-green-600">Created:</span>
                        <span className="ml-1 font-semibold text-green-700">{result.stats.created}</span>
                      </div>
                      <div>
                        <span className="font-medium text-yellow-600">Warnings:</span>
                        <span className="ml-1 font-semibold text-yellow-700">{result.stats.warnings}</span>
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

                {result.warnings && result.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">⚠️ Suggestions:</h4>
                    <div className="space-y-3">
                      {result.warnings.map((warning, index) => (
                        <div key={index} className="bg-white border border-yellow-200 rounded-lg p-3">
                          <div className="text-sm">
                            <span className="font-medium text-yellow-800">Row {warning.row}:</span>
                            <span className="text-yellow-700"> {warning.wine} ({warning.message})</span>
                          </div>
                          {warning.suggestions && warning.suggestions.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-yellow-800 mb-1">Did you mean:</p>
                              <ul className="space-y-1">
                                {warning.suggestions.map((suggestion, idx) => (
                                  <li key={idx} className="text-sm text-yellow-700 flex items-start">
                                    <span className="w-1 h-1 bg-yellow-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                    <span>{suggestion}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button onClick={() => setStep('upload')} className="bg-gray-900 hover:bg-gray-800">
                    Upload New CSV
                  </Button>
                  <Button onClick={() => setResult(null)}>
                    Clear Results
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
