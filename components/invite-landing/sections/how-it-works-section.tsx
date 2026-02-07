"use client";

import { motion } from "framer-motion";
import { Wine, Package, Truck } from "lucide-react";

const STEPS = [
  {
    step: 1,
    title: "Discover wines",
    description:
      "Browse wines directly from producers. Filter by region, color, and style. See transparent pricing with no middlemen.",
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=400&fit=crop",
    icon: Wine,
  },
  {
    step: 2,
    title: "Reserve in a pallet",
    description:
      "Join a pallet with other members to reach the minimum order. Reserve your bottles and see the pallet fill up in real time.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop",
    icon: Package,
  },
  {
    step: 3,
    title: "Checkout & delivery",
    description:
      "When the pallet is full, complete your order. Wines are shipped together—better for the producer, better for you.",
    image: "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=600&h=400&fit=crop",
    icon: Truck,
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-background px-6 py-24">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          className="text-3xl md:text-4xl font-sans font-medium text-foreground mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          This is how it works.
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {STEPS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                className="group"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                {/* Snapshot-style card */}
                <div className="relative rounded-xl overflow-hidden border border-border bg-card shadow-sm mb-6">
                  {/* Browser-style top bar */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/50">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
                      <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
                      <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
                    </div>
                    <div className="flex-1 flex justify-center">
                      <span className="text-xs text-muted-foreground font-mono truncate max-w-[140px]">
                        {item.title.toLowerCase().replace(/\s+/g, "-")}
                      </span>
                    </div>
                  </div>
                  {/* Image snapshot */}
                  <div className="relative aspect-[3/2] overflow-hidden">
                    <img
                      src={item.image}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <div className="flex items-center gap-2 rounded-lg bg-background/90 backdrop-blur-sm px-3 py-2">
                        <Icon className="w-4 h-4 text-foreground" />
                        <span className="text-sm font-medium text-foreground">{item.title}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className="font-sans text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
