"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Upload,
  Download,
} from "lucide-react";

interface Wine {
  id: string;
  wine_name: string;
  label_image_path?: string;
}

interface WineImage {
  id: string;
  wine_id: string;
  wine_name: string;
  image_path: string;
  alt_text: string;
  created_at: string;
}

interface HealthReport {
  timestamp: string;
  summary: {
    totalWineImages: number;
    totalWinesWithLabelImage: number;
    totalWines: number;
    healthScore: number;
    healthyImages: number;
    missingImages: number;
    inaccessibleImages: number;
  };
  wineImages: Array<{
    id: string;
    wine_id: string;
    image_path: string;
    status: "healthy" | "missing";
    accessible: boolean;
    error?: string;
  }>;
  wines: Array<{
    id: string;
    wine_name: string;
    label_image_path: string;
    status: "healthy" | "missing";
    accessible: boolean;
    error?: string;
  }>;
  recommendations: Array<{
    type: "info" | "warning" | "error";
    message: string;
    action: string;
  }>;
}

interface ImageHealthDashboardProps {
  wines: Wine[];
  wineImages: WineImage[];
}

export default function ImageHealthDashboard({
  wines,
  wineImages,
}: ImageHealthDashboardProps) {
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runHealthCheck = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/image-health");
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      const report = await response.json();
      setHealthReport(report);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to run health check",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getHealthScoreBg = (score: number) => {
    if (score >= 90) return "bg-green-100";
    if (score >= 70) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Image Health Dashboard</h2>
          <p className="text-gray-600">
            Monitor the health and accessibility of your wine images
          </p>
        </div>
        <Button onClick={runHealthCheck} disabled={loading} variant="outline">
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Checking..." : "Run Health Check"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {healthReport && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Health Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${getHealthScoreColor(healthReport.summary.healthScore)}`}
                >
                  {healthReport.summary.healthScore}%
                </div>
                <div
                  className={`text-xs ${getHealthScoreBg(healthReport.summary.healthScore)} px-2 py-1 rounded mt-1`}
                >
                  {healthReport.summary.healthScore >= 90
                    ? "Excellent"
                    : healthReport.summary.healthScore >= 70
                      ? "Good"
                      : "Needs Attention"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {healthReport.summary.totalWineImages +
                    healthReport.summary.totalWinesWithLabelImage}
                </div>
                <div className="text-xs text-gray-500">
                  {healthReport.summary.totalWineImages} wine images +{" "}
                  {healthReport.summary.totalWinesWithLabelImage} label images
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Healthy Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {healthReport.summary.healthyImages}
                </div>
                <div className="text-xs text-gray-500">
                  Accessible and working
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {healthReport.summary.missingImages +
                    healthReport.summary.inaccessibleImages}
                </div>
                <div className="text-xs text-gray-500">
                  {healthReport.summary.missingImages} missing,{" "}
                  {healthReport.summary.inaccessibleImages} inaccessible
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {healthReport.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>
                  Actions to improve your image health
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {healthReport.recommendations.map((rec, index) => (
                  <Alert
                    key={index}
                    variant={rec.type === "error" ? "destructive" : "default"}
                  >
                    <div className="flex items-start space-x-2">
                      {getRecommendationIcon(rec.type)}
                      <div>
                        <AlertDescription className="font-medium">
                          {rec.message}
                        </AlertDescription>
                        <AlertDescription className="text-sm mt-1">
                          {rec.action}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Detailed Issues */}
          {(healthReport.summary.missingImages > 0 ||
            healthReport.summary.inaccessibleImages > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Image Issues</CardTitle>
                <CardDescription>Images that need attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Missing Images */}
                  {healthReport.wineImages
                    .filter((img) => img.status === "missing")
                    .map((img, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">
                            Wine Image: {img.wine_id}
                          </div>
                          <div className="text-sm text-gray-500">
                            {img.image_path}
                          </div>
                          <Badge variant="destructive" className="mt-1">
                            Missing
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">{img.error}</div>
                      </div>
                    ))}

                  {healthReport.wines
                    .filter((wine) => wine.status === "missing")
                    .map((wine, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{wine.wine_name}</div>
                          <div className="text-sm text-gray-500">
                            {wine.label_image_path}
                          </div>
                          <Badge variant="destructive" className="mt-1">
                            Missing
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          {wine.error}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Last Updated */}
          <div className="text-sm text-gray-500 text-center">
            Last updated: {new Date(healthReport.timestamp).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
