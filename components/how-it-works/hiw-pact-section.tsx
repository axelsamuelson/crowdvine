"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useHiwScrollContainer } from "@/lib/hooks/use-hiw-scroll";

const STEPS = [
  {
    number: "01",
    title: "Du beställer",
    text: "Betalning tas inte direkt. Vi reserverar din plats på pallen.",
  },
  {
    number: "02",
    title: "Pallen fylls",
    text: "Du ser status i realtid. Fler beställare ansluter.",
  },
  {
    number: "03",
    title: "Producenten skickar",
    text: "Direkt från källaren i Languedoc till din dörr i Stockholm.",
  },
] as const;

function SequentialStep({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRoot = useHiwScrollContainer();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          window.setTimeout(() => setVisible(true), index * 200);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "40px", root: scrollRoot },
    );

    const node = ref.current;
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [index, scrollRoot]);

  return (
    <div
      ref={ref}
      className={`border-t border-stone-200 py-10 transition-all duration-700 ease-out md:py-12 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

export function HiwPactSection() {
  return (
    <section className="bg-white">
      <div className="border-b border-stone-200 px-6 py-20 md:px-12 md:py-28 lg:px-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-medium leading-tight tracking-tight text-stone-900 md:text-5xl lg:text-6xl">
            Logistik är inte romantiskt.
            <br />
            Men det är det som fattas.
          </h2>
          <p className="mt-8 text-lg leading-relaxed text-stone-600 md:text-xl">
            Problemet är inte att dessa viner inte finns. Det är att de inte når
            dig.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-stone-600 md:text-xl">
            En liten producent i Languedoc med 1 500 flaskor per år har varken
            tid, råd eller distribution för att nå Stockholm. En enskild flaska
            kostar mer att frakta än den är värd.
          </p>
          <p className="mt-4 text-lg font-medium leading-relaxed text-stone-900 md:text-xl">
            PACT löser ett konkret logistikproblem.
          </p>
        </div>
      </div>

      <div className="px-6 py-4 md:px-12 lg:px-20">
        <div className="mx-auto max-w-4xl">
          {STEPS.map((step, index) => (
            <SequentialStep key={step.number} index={index}>
              <p className="text-sm font-medium tracking-widest text-stone-500">
                {step.number}
              </p>
              <h3 className="mt-2 text-2xl font-medium text-stone-900 md:text-3xl">
                {step.title}
              </h3>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-600 md:text-lg">
                {step.text}
              </p>
            </SequentialStep>
          ))}
        </div>
      </div>

      <div className="border-t border-stone-200 px-6 py-20 md:px-12 md:py-28 lg:px-20">
        <blockquote className="mx-auto max-w-4xl text-center font-serif text-3xl leading-snug text-stone-900 md:text-4xl lg:text-5xl">
          Varje flaska är ett val om
          <br />
          vem som ska tjäna på vin.
        </blockquote>

        <div className="mx-auto mt-12 flex max-w-lg flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/vin"
            className="inline-flex items-center justify-center rounded-full bg-stone-900 px-8 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Utforska sortimentet
          </Link>
          <Link
            href="/#taste-quiz"
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-8 py-3.5 text-sm font-medium text-stone-900 transition-colors hover:border-stone-900"
          >
            Hitta ditt vin
          </Link>
        </div>
      </div>
    </section>
  );
}
