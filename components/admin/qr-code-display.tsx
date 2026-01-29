"use client";

import { QRCode } from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  title?: string;
}

export function QRCodeDisplay({
  value,
  size = 256,
  title = "QR Code",
}: QRCodeDisplayProps) {
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

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* #region agent log */}
      {(() => {
        fetch('http://127.0.0.1:7243/ingest/9687b495-87d8-473b-8abd-6efc8f9371e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/admin/qr-code-display.tsx:43',message:'QRCodeDisplay render start',data:{hasButton:true,buttonLine:54},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
        return null;
      })()}
      {/* #endregion */}
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
        <QRCode
          id="qr-code-svg"
          value={value}
          size={size}
          level="H"
        />
      </div>
      {/* #region agent log */}
      {(() => {
        fetch('http://127.0.0.1:7243/ingest/9687b495-87d8-473b-8abd-6efc8f9371e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/admin/qr-code-display.tsx:54',message:'Button component render inside QRCodeDisplay',data:{componentType:'Button',willRenderAs:'button'},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
        return null;
      })()}
      {/* #endregion */}
      <Button onClick={downloadQRCode} variant="outline">
        <Download className="w-4 h-4 mr-2" />
        Download QR Code
      </Button>
    </div>
  );
}
