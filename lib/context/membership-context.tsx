"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface MembershipContextType {
  level: string | null;
  discountPercentage: number;
  loading: boolean;
}

const MembershipContext = createContext<MembershipContextType>({
  level: null,
  discountPercentage: 0,
  loading: true,
});

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const [membershipData, setMembershipData] = useState<MembershipContextType>({
    level: null,
    discountPercentage: 0,
    loading: true,
  });

  useEffect(() => {
    fetchMembership();
  }, []);

  const fetchMembership = async () => {
    try {
      const response = await fetch('/api/user/membership');
      if (response.ok) {
        const data = await response.json();
        
        // Get discount perk
        const discountPerk = data.perks?.find((p: any) => p.perk_type === 'discount');
        const discountMatch = discountPerk?.perk_value?.match(/(\d+)/);
        const discount = discountMatch ? parseInt(discountMatch[1]) : 0;

        console.log("🎯 Member discount loaded:", {
          level: data.membership.level,
          discountPercentage: discount,
          discountPerk,
        });

        setMembershipData({
          level: data.membership.level,
          discountPercentage: discount,
          loading: false,
        });
      } else {
        // Not logged in or no membership
        console.log("👤 User not logged in or no membership");
        setMembershipData({ level: null, discountPercentage: 0, loading: false });
      }
    } catch (error) {
      console.error('Error fetching membership:', error);
      setMembershipData({ level: null, discountPercentage: 0, loading: false });
    }
  };

  return (
    <MembershipContext.Provider value={membershipData}>
      {children}
    </MembershipContext.Provider>
  );
}

export const useMembership = () => useContext(MembershipContext);

