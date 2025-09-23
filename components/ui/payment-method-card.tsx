"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Star, X } from "lucide-react";

interface PaymentMethodCardProps {
  method: {
    id: string;
    type: "card" | "bank";
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

// Brand logos matching Stripe's official design
const BrandLogo = ({ brand }: { brand?: string }) => {
  const brandLower = brand?.toLowerCase() || "";

  if (brandLower.includes("visa")) {
    return (
      <div className="flex items-center justify-center w-12 h-8 bg-white rounded border border-gray-200">
        <svg viewBox="0 0 40 24" className="w-10 h-6">
          <rect width="40" height="24" rx="3" fill="#1A1F71" />
          <text
            x="20"
            y="16"
            fontSize="10"
            fontWeight="bold"
            fill="white"
            textAnchor="middle"
          >
            VISA
          </text>
        </svg>
      </div>
    );
  }

  if (brandLower.includes("mastercard") || brandLower.includes("master")) {
    return (
      <div className="flex items-center justify-center w-12 h-8 bg-white rounded border border-gray-200">
        <svg viewBox="0 0 40 24" className="w-10 h-6">
          <rect width="40" height="24" rx="3" fill="#EB001B" />
          <circle cx="15" cy="12" r="8" fill="#F79E1B" />
          <circle cx="25" cy="12" r="8" fill="#FF5F00" />
          <path
            d="M20 8c-2.2 0-4 1.8-4 4s1.8 4 4 4c1.1 0 2.1-.5 2.8-1.2-1.4-1.4-1.4-3.6 0-5.6-.7-.7-1.7-1.2-2.8-1.2z"
            fill="#EB001B"
          />
        </svg>
      </div>
    );
  }

  if (brandLower.includes("amex") || brandLower.includes("american express")) {
    return (
      <div className="flex items-center justify-center w-12 h-8 bg-white rounded border border-gray-200">
        <svg viewBox="0 0 40 24" className="w-10 h-6">
          <rect width="40" height="24" rx="3" fill="#006FCF" />
          <text
            x="20"
            y="10"
            fontSize="5"
            fontWeight="bold"
            fill="white"
            textAnchor="middle"
          >
            AMERICAN
          </text>
          <text
            x="20"
            y="16"
            fontSize="5"
            fontWeight="bold"
            fill="white"
            textAnchor="middle"
          >
            EXPRESS
          </text>
        </svg>
      </div>
    );
  }

  if (brandLower.includes("discover")) {
    return (
      <div className="flex items-center justify-center w-12 h-8 bg-white rounded border border-gray-200">
        <svg viewBox="0 0 40 24" className="w-10 h-6">
          <rect width="40" height="24" rx="3" fill="#FF6000" />
          <circle cx="20" cy="12" r="5" fill="white" />
          <text
            x="20"
            y="14"
            fontSize="6"
            fontWeight="bold"
            fill="#FF6000"
            textAnchor="middle"
          >
            D
          </text>
        </svg>
      </div>
    );
  }

  if (brandLower.includes("diners")) {
    return (
      <div className="flex items-center justify-center w-12 h-8 bg-white rounded border border-gray-200">
        <svg viewBox="0 0 40 24" className="w-10 h-6">
          <rect width="40" height="24" rx="3" fill="#0079BE" />
          <text
            x="20"
            y="10"
            fontSize="4"
            fontWeight="bold"
            fill="white"
            textAnchor="middle"
          >
            DINERS
          </text>
          <text
            x="20"
            y="16"
            fontSize="4"
            fontWeight="bold"
            fill="white"
            textAnchor="middle"
          >
            CLUB
          </text>
        </svg>
      </div>
    );
  }

  if (brandLower.includes("jcb")) {
    return (
      <div className="flex items-center justify-center w-12 h-8 bg-white rounded border border-gray-200">
        <svg viewBox="0 0 40 24" className="w-10 h-6">
          <rect width="40" height="24" rx="3" fill="#007B49" />
          <text
            x="20"
            y="14"
            fontSize="7"
            fontWeight="bold"
            fill="white"
            textAnchor="middle"
          >
            JCB
          </text>
        </svg>
      </div>
    );
  }

  if (brandLower.includes("unionpay") || brandLower.includes("union")) {
    return (
      <div className="flex items-center justify-center w-12 h-8 bg-white rounded border border-gray-200">
        <svg viewBox="0 0 40 24" className="w-10 h-6">
          <rect width="40" height="24" rx="3" fill="#E21836" />
          <text
            x="20"
            y="8"
            fontSize="4"
            fontWeight="bold"
            fill="white"
            textAnchor="middle"
          >
            UNION
          </text>
          <text
            x="20"
            y="14"
            fontSize="4"
            fontWeight="bold"
            fill="white"
            textAnchor="middle"
          >
            PAY
          </text>
        </svg>
      </div>
    );
  }

  // Default generic card icon for unknown brands
  return (
    <div className="flex items-center justify-center w-12 h-8 bg-gradient-to-r from-gray-400 to-gray-600 rounded border border-gray-200">
      <CreditCard className="w-5 h-5 text-white" />
    </div>
  );
};

const StripeLogo = () => (
  <div className="flex items-center gap-1">
    <svg viewBox="0 0 24 24" className="w-4 h-4">
      <rect width="24" height="24" rx="4" fill="#635BFF" />
      <path
        d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.274 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.407-2.2 1.407-1.99 0-4.043-.921-5.827-1.845L4.717 24c1.73.921 4.351 1.685 7.552 1.685 2.508 0 4.682-.657 6.104-1.892 1.545-1.31 2.352-3.147 2.352-5.373 0-4.039-2.467-5.76-6.476-7.219z"
        fill="white"
      />
    </svg>
    <span className="text-xs font-medium text-gray-600">Stripe</span>
  </div>
);

export function PaymentMethodCard({
  method,
  onSetDefault,
  onDelete,
  className,
}: PaymentMethodCardProps) {
  return (
    <div
      className={cn(
        "relative p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow",
        method.is_default &&
          "ring-2 ring-blue-500 ring-opacity-20 bg-gradient-to-br from-blue-50 to-white",
        className,
      )}
    >
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
                Expires {method.expiry_month.toString().padStart(2, "0")}/
                {method.expiry_year}
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
      <div
        className="absolute inset-0 rounded-lg border-2 border-transparent pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.05) 100%)",
        }}
      />
    </div>
  );
}
