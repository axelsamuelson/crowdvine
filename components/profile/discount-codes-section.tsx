"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Gift, 
  Copy, 
  Check, 
  Calendar, 
  Percent,
  Tag,
  Clock,
  Wifi,
  WifiOff
} from "lucide-react";
import { toast } from "sonner";

interface DiscountCode {
  id: string;
  code: string;
  discount_percentage: number;
  discount_amount_cents?: number;
  is_active: boolean;
  usage_limit?: number;
  current_usage: number;
  expires_at?: string;
  earned_by_user_id?: string;
  used_by_user_id?: string;
  used_at?: string;
  created_at: string;
}

interface DiscountCodesSectionProps {
  userId: string;
  discountCodes?: any[];
  isConnected?: boolean;
}

export default function DiscountCodesSection({ userId, discountCodes: propDiscountCodes, isConnected }: DiscountCodesSectionProps) {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>(propDiscountCodes || []);
  const [loading, setLoading] = useState(!propDiscountCodes);
  const [copiedCodes, setCopiedCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (propDiscountCodes) {
      setDiscountCodes(propDiscountCodes);
      setLoading(false);
    } else {
      fetchDiscountCodes();
    }
  }, [userId, propDiscountCodes]);

  const fetchDiscountCodes = async () => {
    try {
      const response = await fetch('/api/discount-codes');
      if (response.ok) {
        const data = await response.json();
        setDiscountCodes(data.discountCodes || []);
      }
    } catch (error) {
      console.error('Error fetching discount codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodes(prev => new Set([...prev, code]));
      setTimeout(() => {
        setCopiedCodes(prev => {
          const newSet = new Set(prev);
          newSet.delete(code);
          return newSet;
        });
      }, 2000);
      toast.success("Discount code copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
    }).format(cents / 100);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isUsed = (discountCode: DiscountCode) => {
    return discountCode.used_by_user_id === userId;
  };

  const earnedCodes = discountCodes.filter(code => code.earned_by_user_id === userId);
  const usedCodes = discountCodes.filter(code => code.used_by_user_id === userId);

  if (loading) {
    return (
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Gift className="w-5 h-5" />
            My Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading discount codes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Gift className="w-5 h-5" />
          My Rewards
          {isConnected !== undefined && (
            <div className="flex items-center gap-2 ml-auto">
              {isConnected ? (
                <div className="flex items-center gap-1 text-green-600 text-xs">
                  <Wifi className="w-3 h-3" />
                  <span>Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </div>
              )}
            </div>
          )}
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Earned rewards and discount codes from inviting friends
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {earnedCodes.length === 0 && usedCodes.length === 0 ? (
          <div className="text-center py-8">
            <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rewards Yet</h3>
            <p className="text-gray-600 mb-4">
              Invite friends to earn rewards and discount codes!
            </p>
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
              <p className="font-medium text-blue-800 text-sm">
                💰 Earn rewards for each friend who joins and makes reservations!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Earned Codes */}
            {earnedCodes.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-green-600" />
                  Available Discounts ({earnedCodes.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {earnedCodes.map((code) => (
                    <div
                      key={code.id}
                      className={`bg-white rounded-lg border-2 p-4 ${
                        !code.is_active || isExpired(code.expires_at || null)
                          ? 'border-gray-200 bg-gray-50 opacity-60'
                          : 'border-green-200 bg-green-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-green-600" />
                          <span className="font-mono font-bold text-lg">
                            {code.code}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(code.code)}
                          disabled={!code.is_active || isExpired(code.expires_at || null)}
                          className="px-3"
                        >
                          {copiedCodes.has(code.code) ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">
                          {code.discount_percentage}% OFF
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          {code.expires_at && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                Expires {new Date(code.expires_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          
                          {code.usage_limit && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                {code.current_usage}/{code.usage_limit} uses
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 mt-2">
                          {!code.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                          {isExpired(code.expires_at || null) && (
                            <Badge variant="destructive" className="text-xs">
                              Expired
                            </Badge>
                          )}
                          {code.is_active && !isExpired(code.expires_at || null) && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Used Codes */}
            {usedCodes.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  Used Discounts ({usedCodes.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {usedCodes.map((code) => (
                    <div
                      key={code.id}
                      className="bg-white rounded-lg border-2 border-blue-200 bg-blue-50 p-4 opacity-75"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-blue-600" />
                          <span className="font-mono font-bold text-lg">
                            {code.code}
                          </span>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          Used
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">
                          {code.discount_percentage}% OFF
                        </p>
                        
                        {code.used_at && (
                          <p className="text-xs text-gray-600">
                            Used on {new Date(code.used_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
