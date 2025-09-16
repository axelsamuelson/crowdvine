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

  // Debug logging
  console.log("ConditionalHeader - pathname:", pathname);
  console.log("ConditionalHeader - isAdminRoute:", isAdminRoute);
  console.log("ConditionalHeader - isAccessRequestRoute:", isAccessRequestRoute);

  if (isAdminRoute || isAccessRequestRoute) {
    console.log("ConditionalHeader - returning null (no header)");
    return null;
  }

  console.log("ConditionalHeader - returning Header component");
  return <Header collections={collections} />;
}
