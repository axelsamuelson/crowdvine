"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  title?: string;
  showTitle?: boolean;
  showDownload?: boolean;
}

export function QRCodeDisplay({
  value,
  size = 256,
  title = "QR Code",
  showTitle = true,
  showDownload = true,
}: QRCodeDisplayProps) {
  const [QRCode, setQRCode] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dynamic import to avoid build-time module resolution issues
    import("react-qr-code")
      .then((module) => {
        setQRCode(() => module.default || module.QRCode);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load react-qr-code:", error);
        setLoading(false);
      });
  }, []);
  const downloadQRCode = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `qr-code-${Date.now()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success("QR code downloaded");
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center space-y-4">
        {showTitle && title && <h3 className="text-lg font-semibold">{title}</h3>}
        <div className="p-4 bg-white rounded-lg border-2 border-gray-200 flex items-center justify-center" style={{ width: size, height: size }}>
          <div className="text-sm text-gray-500">Loading QR code...</div>
        </div>
      </div>
    );
  }

  if (!QRCode) {
    return (
      <div className="flex flex-col items-center space-y-4">
        {showTitle && title && <h3 className="text-lg font-semibold">{title}</h3>}
        <div className="p-4 bg-white rounded-lg border-2 border-gray-200 flex items-center justify-center" style={{ width: size, height: size }}>
          <div className="text-sm text-red-500">Failed to load QR code</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {showTitle && title && <h3 className="text-lg font-semibold">{title}</h3>}
      <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
        <QRCode
          id="qr-code-svg"
          value={value}
          size={size}
          level="H"
        />
      </div>
      {showDownload && (
        <Button onClick={downloadQRCode} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download QR Code
        </Button>
      )}
    </div>
  );
}
