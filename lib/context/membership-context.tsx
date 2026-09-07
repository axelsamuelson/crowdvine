"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";

interface MembershipContextType {
  level: string | null;
  discountPercentage: number;
  loading: boolean;
}

const MembershipContext = createContext<MembershipContextType>({
  level: null,
  discountPercentage: 0,
  loading: false,
});

function hasSupabaseAuthCookieHint(): boolean {
  if (typeof document === "undefined") return false;
  // Supabase SSR cookies look like sb-<ref>-auth-token (chunked variants included).
  return /(?:^|;\s*)sb-[^=]+-auth-token/.test(document.cookie);
}

export function MembershipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [membershipData, setMembershipData] = useState<MembershipContextType>({
    level: null,
    discountPercentage: 0,
    loading: true,
  });

  useLayoutEffect(() => {
    if (!hasSupabaseAuthCookieHint()) {
      setMembershipData({
        level: null,
        discountPercentage: 0,
        loading: false,
      });
      return;
    }

    let cancelled = false;

    const fetchMembership = async () => {
      try {
        const response = await fetch("/api/user/membership");
        if (cancelled) return;
        if (response.ok) {
          const data = await response.json();
          const discountPerk = data.perks?.find(
            (p: { perk_type?: string; perk_value?: string }) =>
              p.perk_type === "discount",
          );
          const discountMatch = discountPerk?.perk_value?.match(/(\d+)/);
          const discount = discountMatch ? parseInt(discountMatch[1], 10) : 0;
          setMembershipData({
            level: data.membership.level,
            discountPercentage: discount,
            loading: false,
          });
        } else {
          setMembershipData({
            level: null,
            discountPercentage: 0,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setMembershipData({
            level: null,
            discountPercentage: 0,
            loading: false,
          });
        }
      }
    };

    void fetchMembership();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MembershipContext.Provider value={membershipData}>
      {children}
    </MembershipContext.Provider>
  );
}

export const useMembership = () => useContext(MembershipContext);
