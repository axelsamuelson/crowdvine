"use client";

import dynamic from "next/dynamic";

import type { ProducersDirectoryMapItem } from "@/components/producer/producers-directory-map";

const ProducersDirectoryMap = dynamic(
  () =>
    import("@/components/producer/producers-directory-map").then(
      (m) => m.ProducersDirectoryMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-gradient-to-b from-zinc-800 to-zinc-950" aria-hidden />
    ),
  },
);

type Props = {
  producers: ProducersDirectoryMapItem[];
  className?: string;
  highlightedProducerId?: string | null;
};

/** Defers Mapbox until after hydration — keeps producer directory HTML light. */
export function ProducersDirectoryMapLazy(props: Props) {
  return <ProducersDirectoryMap {...props} />;
}
