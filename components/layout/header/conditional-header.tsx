"use client";

import { usePathname } from "next/navigation";
import { Header } from "./index";
import { Collection } from "@/lib/shopify/types";

interface ConditionalHeaderProps {
  collections: Collection[];
}

export function ConditionalHeader({ collections }: ConditionalHeaderProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isAccessRequestRoute = pathname === "/access-request";
  const isCheckoutSuccessRoute = pathname === "/checkout/success";
  const isLogInRoute = pathname === "/log-in";
  const isInvitationRoute = pathname.startsWith("/i/") || pathname.startsWith("/c/");
  const isSignupRoute = pathname === "/signup";

  if (
    isAdminRoute || 
    isAccessRequestRoute || 
    isCheckoutSuccessRoute || 
    isLogInRoute ||
    isInvitationRoute || // Hide header on invitation signup pages
    isSignupRoute // Hide header on access token signup page
  ) {
    return null;
  }

  return <Header collections={collections} />;
}
