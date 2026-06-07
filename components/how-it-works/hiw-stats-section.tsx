"use client";

import { useEffect, useRef, useState } from "react";
import { useHiwScrollContainer } from "@/lib/hooks/use-hiw-scroll";

const STATS = [
  {
    value: "–41%",
    title: "Färre producenter",
    body: "Antalet vinproducerande företag i Frankrike föll med 41% mellan 2000 och 2020.",
    source: "Franska jordbruksministeriets statistikdepartement",
  },
  {
    value: "60+",
    title: "Tillåtna tillsatser",
    body: "Inom EU tillåts över 60 tillsatser och processtekniker i vinframställning.",
    source: "EU-förordning 606/2009",
  },
  {
    value: "3 led",
    title: "Innan du ser flaskan",
    body: "Importör. Grossist. Butik. Varje led tar sin marginal innan flaskan når dig.",
    source: "Silicon Valley Bank Wine Report",
  },
  {
    value: "2023",
    title: "Första gången",
    body: "Först 2023 blev det obligatoriskt att redovisa ingredienser på vin inom EU.",
    source: "EU-märkningsregler 2023",
  },
] as const;

function StatBlock({
  stat,
  index,
}: {
  stat: (typeof STATS)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRoot = useHiwScrollContainer();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          window.setTimeout(() => setVisible(true), index * 100);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "50px", root: scrollRoot },
    );

    const node = ref.current;
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [index, scrollRoot]);

  return (
    <div
      ref={ref}
      className={`border-b border-stone-200 py-10 md:py-12 hiw-fade-image ${
        visible ? "hiw-fade-image--visible" : "hiw-fade-image--hidden"
      }`}
    >
      <p className="text-[3.5rem] font-medium leading-none tracking-tight text-stone-900 md:text-[4.5rem]">
        {stat.value}
      </p>
      <h3 className="mt-4 text-lg font-medium text-stone-900 md:text-xl">
        {stat.title}
      </h3>
      <p className="mt-3 max-w-md text-base leading-relaxed text-stone-600">
        {stat.body}
      </p>
      <p className="mt-4 text-xs text-stone-500">Källa: {stat.source}</p>
    </div>
  );
}

export function HiwStatsSection() {
  return (
    <section className="bg-white px-6 py-20 md:px-12 md:py-28 lg:px-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-0 md:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat, index) => (
          <StatBlock key={stat.title} stat={stat} index={index} />
        ))}
      </div>
    </section>
  );
}
