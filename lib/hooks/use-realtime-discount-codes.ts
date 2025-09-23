"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { toast } from "sonner";

interface DiscountCode {
  id: string;
  code: string;
  discount_percentage: number;
  expires_at: string;
  max_uses: number;
  current_uses: number;
  created_at: string;
  used_at?: string;
  used_by?: string;
  invitation_id?: string;
}

interface UseRealtimeDiscountCodesProps {
  userId: string;
  onDiscountCodesUpdate: (codes: DiscountCode[]) => void;
}

export function useRealtimeDiscountCodes({
  userId,
  onDiscountCodesUpdate,
}: UseRealtimeDiscountCodesProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Use the imported supabase client

    console.log(
      "Setting up realtime subscription for discount codes for user:",
      userId,
    );

    // Subscribe to changes on the discount_codes table
    const channel = supabase
      .channel(`discount-codes-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "discount_codes",
          filter: `earned_by_user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("New discount code received:", payload);

          const newCode = payload.new as DiscountCode;

          // Show toast for new discount codes
          if (newCode.discount_percentage === 10) {
            toast.success(
              "🎁 You've earned a 10% reward! Your friend made a reservation!",
            );
          } else if (newCode.discount_percentage === 5) {
            toast.success(
              "🎁 You've earned a 5% reward! Your friend joined the platform!",
            );
          }

          // Fetch updated list of discount codes
          fetchUpdatedDiscountCodes();
        },
      )
      .on("system", {}, (status) => {
        console.log("Discount codes realtime system status:", status);
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          console.log(
            "Successfully subscribed to discount codes realtime updates",
          );
        } else if (status === "CHANNEL_ERROR") {
          setIsConnected(false);
          console.error("Discount codes realtime channel error");
        } else if (status === "TIMED_OUT") {
          setIsConnected(false);
          console.error("Discount codes realtime connection timed out");
        } else if (status === "CLOSED") {
          setIsConnected(false);
          console.log("Discount codes realtime connection closed");
        }
      })
      .subscribe();

    const fetchUpdatedDiscountCodes = async () => {
      try {
        const response = await fetch("/api/discount-codes");
        if (response.ok) {
          const codes = await response.json();
          onDiscountCodesUpdate(codes);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error("Error fetching updated discount codes:", error);
      }
    };

    return () => {
      console.log("Cleaning up discount codes realtime subscription");
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [userId, onDiscountCodesUpdate]);

  return {
    isConnected,
    lastUpdate,
  };
}
