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

  if (isAdminRoute || isAccessRequestRoute) {
    return null;
  }

  return <Header collections={collections} />;
}
