"use client";
import dynamic from "next/dynamic";

const V0Setup = dynamic(() => import("@/components/v0-setup"), {
  ssr: false,
  loading: () => null,
});

export default function V0SetupLoader() {
  return <V0Setup />;
}
