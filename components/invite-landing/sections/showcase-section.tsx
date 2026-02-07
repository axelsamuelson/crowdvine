"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { CheckCircle2, Leaf, Grape } from "lucide-react";
import { Button } from "@/components/ui/button";

type WineColor = "red" | "white" | "orange";
type WineStyle = "natural" | "traditional";

interface ShowcaseWine {
  id: string;
  title: string;
  handle: string;
  color: WineColor;
  imageUrl: string;
  imageAlt: string;
}

const COLOR_LABELS: Record<WineColor, string> = {
  red: "Red",
  white: "White",
  orange: "Orange",
};

const COLOR_GRADIENTS: Record<WineColor, string> = {
  red: "from-red-950/70",
  white: "from-amber-50/80",
  orange: "from-orange-500/75",
};

/** True if the color value is a blend (e.g. "Red & Orange", "Red/White"). */
function isBlendColor(name: string): boolean {
  const n = name.toLowerCase().trim();
  return (n.includes("&") || n.includes("/")) && (
    n.includes("red") || n.includes("white") || n.includes("orange") || n.includes("rött") || n.includes("vitt")
  );
}

function getWineColor(product: {
  options?: Array< { name?: string; values?: Array<{ name?: string }> }>;
  tags?: string[];
}): WineColor | null {
  const colorOption = product.options?.find(
    (o) => o.name?.toLowerCase() === "color"
  );
  const value = colorOption?.values?.[0];
  const name = typeof value === "string" ? value : (value as { name?: string })?.name;
  if (!name) {
    const tag = product.tags?.find((t) =>
      ["red", "white", "orange", "rött", "vitt"].some((c) =>
        String(t).toLowerCase().includes(c)
      )
    );
    if (!tag) return null;
    const t = String(tag).toLowerCase();
    if (t.includes("&") || t.includes("/")) return null;
    if (t.includes("orange")) return "orange";
    if (t.includes("red") || t.includes("rött")) return "red";
    if (t.includes("white") || t.includes("vitt")) return "white";
    return null;
  }
  if (isBlendColor(name)) return null;
  const n = name.toLowerCase();
  if (n.includes("orange")) return "orange";
  if (n.includes("red") || n.includes("rött")) return "red";
  if (n.includes("white") || n.includes("vitt")) return "white";
  return null;
}

function pickOneRandom<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

const WINE_STYLE_OPTIONS: { value: WineStyle; label: string; description: string; icon: typeof Leaf }[] = [
  { value: "natural", label: "Natural", description: "Minimal intervention, organic, low-sulphite wines.", icon: Leaf },
  { value: "traditional", label: "Traditional", description: "Classic winemaking, time-honoured methods.", icon: Grape },
];

const WINE_REGIONS = [
  "Champagne",
  "Alsace",
  "Jura",
  "Burgundy",
  "Beaujolais",
  "Savoie",
  "Loire Valley",
  "Bordeaux",
  "Rhône Valley",
  "Languedoc-Roussillon",
  "Provence",
  "Corsica",
] as const;
type WineRegion = (typeof WINE_REGIONS)[number];

interface ShowcaseSectionProps {
  onComplete?: () => void;
}

export function ShowcaseSection({ onComplete }: ShowcaseSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wines, setWines] = useState<ShowcaseWine[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [wineStyles, setWineStyles] = useState<Set<WineStyle>>(new Set());
  const [regions, setRegions] = useState<Set<WineRegion>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/crowdvine/products?limit=200")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Array<{
        id: string;
        title: string;
        handle: string;
        options?: Array<{ name?: string; values?: Array<{ name?: string }> }>;
        tags?: string[];
        featuredImage?: { url: string; altText?: string };
      }> | null) => {
        if (cancelled || !Array.isArray(data)) return;
        const byColor: Record<WineColor, typeof data> = {
          red: [],
          white: [],
          orange: [],
        };
        for (const p of data) {
          const color = getWineColor(p);
          if (color && byColor[color].length < 20) byColor[color].push(p);
        }
        const redOne = pickOneRandom(byColor.red);
        const whiteOne = pickOneRandom(byColor.white);
        const orangeOne = pickOneRandom(byColor.orange);
        const next: ShowcaseWine[] = [];
        if (redOne)
          next.push({
            id: redOne.id,
            title: redOne.title,
            handle: redOne.handle,
            color: "red",
            imageUrl: redOne.featuredImage?.url ?? "",
            imageAlt: redOne.featuredImage?.altText || redOne.title,
          });
        if (whiteOne)
          next.push({
            id: whiteOne.id,
            title: whiteOne.title,
            handle: whiteOne.handle,
            color: "white",
            imageUrl: whiteOne.featuredImage?.url ?? "",
            imageAlt: whiteOne.featuredImage?.altText || whiteOne.title,
          });
        if (orangeOne)
          next.push({
            id: orangeOne.id,
            title: orangeOne.title,
            handle: orangeOne.handle,
            color: "orange",
            imageUrl: orangeOne.featuredImage?.url ?? "",
            imageAlt: orangeOne.featuredImage?.altText || orangeOne.title,
          });
        setWines(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [150, -150]);
  const y3 = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const yValues = [y1, y2, y3];

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleWineStyle = (style: WineStyle) => {
    setWineStyles((prev) => {
      const next = new Set(prev);
      if (next.has(style)) next.delete(style);
      else next.add(style);
      return next;
    });
  };

  const handleStep1Submit = () => {
    if (favorites.size > 0) setStep(2);
  };

  const toggleRegion = (region: WineRegion) => {
    setRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };

  return (
    <section
      id="tailor-experience"
      ref={containerRef}
      className="bg-background px-6 py-32 overflow-hidden min-h-[600px] scroll-mt-24"
    >
      <div className="max-w-6xl mx-auto relative">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="origin-top"
            >
              <motion.p
                className="text-muted-foreground text-sm uppercase tracking-widest mb-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                WHAT DO YOU PREFER?
              </motion.p>
              <motion.p
                className="text-foreground/80 text-lg max-w-2xl mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                Pick your favourites—red, white, orange or all of them.
              </motion.p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {wines.length === 0 ? (
                  [1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="relative h-[400px] md:h-[500px] rounded-xl bg-muted animate-pulse"
                    />
                  ))
                ) : (
                  wines.map((wine, i) => {
                    const isSelected = favorites.has(wine.id);
                    return (
                      <motion.button
                        key={wine.id}
                        type="button"
                        onClick={() => toggleFavorite(wine.id)}
                        className={`relative h-[400px] md:h-[500px] rounded-xl overflow-hidden group text-left w-full cursor-pointer ${isSelected ? "ring-2 ring-foreground ring-offset-2" : ""}`}
                        style={{ y: yValues[i % 3] }}
                        initial={{ clipPath: "inset(100% 0 0 0)" }}
                        whileInView={{ clipPath: "inset(0 0 0 0)" }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 1,
                          delay: i * 0.15,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        data-clickable
                        aria-pressed={isSelected}
                        aria-label={isSelected ? `Remove ${COLOR_LABELS[wine.color]} from favourites` : `Add ${COLOR_LABELS[wine.color]} to favourites`}
                        whileTap={{ scale: 0.98 }}
                      >
                        <motion.img
                          src={wine.imageUrl || "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop"}
                          alt={wine.imageAlt}
                          className="w-full h-full object-cover"
                          whileHover={{ scale: 1.1 }}
                          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        />
                        <div className={`absolute inset-0 bg-gradient-to-t via-transparent to-transparent transition-opacity duration-300 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} ${COLOR_GRADIENTS[wine.color]}`} />
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              className="absolute inset-0 flex items-center justify-center"
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            >
                              <div className="rounded-full bg-white/95 p-3 shadow-lg">
                                <CheckCircle2
                                  className={`w-12 h-12 md:w-14 md:h-14 ${
                                    wine.color === "white"
                                      ? "text-amber-700"
                                      : wine.color === "red"
                                        ? "text-red-600"
                                        : "text-orange-500"
                                  }`}
                                  strokeWidth={2}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div className={`absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} ${wine.color === "white" ? "text-gray-800" : "text-white"}`}>
                          <span className={`text-xs uppercase tracking-wider ${wine.color === "white" ? "text-gray-800/90" : "text-white/90"}`}>
                            {COLOR_LABELS[wine.color]}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>

              <AnimatePresence>
                {favorites.size > 0 && (
                  <motion.div
                    className="mt-12 flex justify-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      type="button"
                      onClick={handleStep1Submit}
                      className="bg-foreground text-background hover:bg-foreground/90 font-sans px-8"
                    >
                      Continue
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : step === 2 ? (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 60, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="origin-top"
            >
              <motion.p
                className="text-muted-foreground text-sm uppercase tracking-widest mb-8"
              >
                AND YOUR STYLE?
              </motion.p>
              <motion.p
                className="text-foreground/80 text-lg max-w-2xl mb-12"
              >
                Do you prefer natural wines, traditional—or both?
              </motion.p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {WINE_STYLE_OPTIONS.map((opt, i) => {
                  const isSelected = wineStyles.has(opt.value);
                  const Icon = opt.icon;
                  return (
                    <motion.button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleWineStyle(opt.value)}
                      className={`relative rounded-2xl overflow-hidden group text-left w-full cursor-pointer border-2 transition-all duration-300 min-h-[220px] md:min-h-[260px] flex flex-col items-center justify-center p-8 ${
                        isSelected
                          ? "border-foreground bg-foreground text-background ring-2 ring-foreground ring-offset-2"
                          : "border-border bg-secondary/50 hover:border-foreground/40 hover:bg-secondary"
                      }`}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      whileTap={{ scale: 0.98 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <motion.div
                        className={`rounded-full p-4 mb-4 ${isSelected ? "bg-white/20" : "bg-muted"}`}
                        animate={isSelected ? { scale: 1.05 } : { scale: 1 }}
                      >
                        <Icon className={`w-12 h-12 md:w-14 md:h-14 ${isSelected ? "text-white" : "text-foreground/70"}`} strokeWidth={1.5} />
                      </motion.div>
                      <h3 className="font-sans text-xl md:text-2xl font-semibold mb-2">
                        {opt.label}
                      </h3>
                      <p className={`text-sm max-w-xs text-center ${isSelected ? "text-white/90" : "text-muted-foreground"}`}>
                        {opt.description}
                      </p>
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="absolute top-4 right-4"
                          >
                            <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={2} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence>
                {wineStyles.size > 0 && (
                  <motion.div
                    className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="font-sans"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setStep(3)}
                      className="bg-foreground text-background hover:bg-foreground/90 font-sans px-8"
                    >
                      Continue
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 60, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="origin-top"
            >
              <motion.p
                className="text-muted-foreground text-sm uppercase tracking-widest mb-8"
              >
                FAVOURITE REGIONS?
              </motion.p>
              <motion.p
                className="text-foreground/80 text-lg max-w-2xl mb-12"
              >
                Pick the French wine regions you love—one, a few, or all of them.
              </motion.p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                {WINE_REGIONS.map((region, i) => {
                  const isSelected = regions.has(region);
                  return (
                    <motion.button
                      key={region}
                      type="button"
                      onClick={() => toggleRegion(region)}
                      className={`relative rounded-xl overflow-hidden group text-left w-full cursor-pointer border-2 transition-all duration-300 min-h-[100px] md:min-h-[120px] flex flex-col items-center justify-center p-4 ${
                        isSelected
                          ? "border-foreground bg-foreground text-background ring-2 ring-foreground ring-offset-2"
                          : "border-border bg-secondary/50 hover:border-foreground/40 hover:bg-secondary"
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      whileTap={{ scale: 0.98 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <span className="font-sans text-sm md:text-base font-medium text-center">
                        {region}
                      </span>
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="absolute top-2 right-2"
                          >
                            <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence>
                {regions.size > 0 && (
                  <motion.div
                    className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="font-sans"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        onComplete?.();
                        document.getElementById("create-account")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="bg-foreground text-background hover:bg-foreground/90 font-sans px-8"
                    >
                      Submit
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
