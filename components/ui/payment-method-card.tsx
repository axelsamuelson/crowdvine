"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Star, X } from "lucide-react";

interface PaymentMethodCardProps {
  method: {
    id: string;
    type: 'card' | 'bank';
    last4?: string;
    brand?: string;
    is_default: boolean;
    expiry_month?: number;
    expiry_year?: number;
  };
  onSetDefault?: (methodId: string) => void;
  onDelete?: (methodId: string) => void;
  className?: string;
}

// Brand logos as SVG components
const BrandLogo = ({ brand }: { brand?: string }) => {
  const brandLower = brand?.toLowerCase() || '';
  
  if (brandLower.includes('visa')) {
    return (
      <div className="flex items-center justify-center w-12 h-8 bg-white rounded border">
        <svg viewBox="0 0 24 16" className="w-8 h-5">
          <rect width="24" height="16" rx="2" fill="#1434CB"/>
          <text x="12" y="11" fontSize="8" fontWeight="bold" fill="white" textAnchor="middle">VISA</text>
        </svg>
      </div>
    );
  }
  
  if (brandLower.includes('mastercard') || brandLower.includes('master')) {
    return (
      <div className="flex items-center justify-center w-12 h-8 bg-white rounded border">
        <svg viewBox="0 0 24 16" className="w-8 h-5">
          <rect width="24" height="16" rx="2" fill="#EB001B"/>
          <circle cx="9" cy="8" r="5" fill="#F79E1B"/>
          <circle cx="15" cy="8" r="5" fill="#FF5F00"/>
          <text x="12" y="11" fontSize="4" fontWeight="bold" fill="white" textAnchor="middle">Mastercard</text>
        </svg>
      </div>
    );
  }
  
  if (brandLower.includes('amex') || brandLower.includes('american express')) {
    return (
      <div className="flex items-center justify-center w-12 h-8 bg-white rounded border">
        <svg viewBox="0 0 24 16" className="w-8 h-5">
          <rect width="24" height="16" rx="2" fill="#006FCF"/>
          <text x="12" y="8" fontSize="4" fontWeight="bold" fill="white" textAnchor="middle">AMERICAN</text>
          <text x="12" y="12" fontSize="4" fontWeight="bold" fill="white" textAnchor="middle">EXPRESS</text>
        </svg>
      </div>
    );
  }
  
  if (brandLower.includes('discover')) {
    return (
      <div className="flex items-center justify-center w-12 h-8 bg-white rounded border">
        <svg viewBox="0 0 24 16" className="w-8 h-5">
          <rect width="24" height="16" rx="2" fill="#FF6000"/>
          <circle cx="12" cy="8" r="3" fill="white"/>
          <text x="12" y="9" fontSize="3" fontWeight="bold" fill="#FF6000" textAnchor="middle">D</text>
        </svg>
      </div>
    );
  }
  
  // Default generic card icon
  return (
    <div className="flex items-center justify-center w-12 h-8 bg-gradient-to-r from-gray-400 to-gray-600 rounded border">
      <CreditCard className="w-5 h-5 text-white" />
    </div>
  );
};

const StripeLogo = () => (
  <div className="flex items-center gap-1">
    <svg viewBox="0 0 24 24" className="w-4 h-4">
      <rect width="24" height="24" rx="4" fill="#635BFF"/>
      <text x="12" y="16" fontSize="8" fontWeight="bold" fill="white" textAnchor="middle">S</text>
    </svg>
    <span className="text-xs font-medium text-gray-600">Stripe</span>
  </div>
);

export function PaymentMethodCard({ 
  method, 
  onSetDefault, 
  onDelete, 
  className 
}: PaymentMethodCardProps) {
  return (
    <div className={cn(
      "relative p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow",
      method.is_default && "ring-2 ring-blue-500 ring-opacity-20 bg-gradient-to-br from-blue-50 to-white",
      className
    )}>
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <BrandLogo brand={method.brand} />
          <div>
            <p className="font-semibold text-gray-900">
              {method.brand?.toUpperCase()} •••• {method.last4}
            </p>
            {method.expiry_month && method.expiry_year && (
              <p className="text-sm text-gray-600">
                Expires {method.expiry_month.toString().padStart(2, '0')}/{method.expiry_year}
              </p>
            )}
          </div>
        </div>
        
        {method.is_default && (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Star className="w-3 h-3 mr-1" />
            Default
          </Badge>
        )}
      </div>
      
      {/* Card Footer */}
      <div className="flex items-center justify-between">
        <StripeLogo />
        
        <div className="flex items-center gap-2">
          {!method.is_default && onSetDefault && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSetDefault(method.id)}
              className="text-xs"
            >
              Set Default
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(method.id)}
              className="text-red-600 hover:text-red-700 hover:border-red-300"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Card-like styling overlay */}
      <div className="absolute inset-0 rounded-lg border-2 border-transparent pointer-events-none" 
           style={{
             background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.05) 100%)'
           }} />
    </div>
  );
}
