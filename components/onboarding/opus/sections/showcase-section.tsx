"use client";

import { motion } from "framer-motion";

const showcaseImages = [
  "/opus/modern-architecture-building-exterior-minimal.jpg",
  "/opus/interior-design-minimalist-living-room-natural-lig.jpg",
];

export function ShowcaseSection() {
  return (
    <section className="bg-background px-6 py-24">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-serif text-foreground">
              Templates that feel like magazines.
            </h2>
            <p className="text-muted-foreground mt-6 text-lg leading-relaxed">
              Opus templates are built around narrative flow. Each section feels
              intentional, like turning a page in a beautifully designed
              publication.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <button
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                data-clickable
              >
                Browse templates
              </button>
              <button
                className="text-foreground hover:text-foreground/70 transition-colors underline underline-offset-4"
                data-clickable
              >
                View showcase
              </button>
            </div>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="grid grid-cols-2 gap-4">
              {showcaseImages.map((src, i) => (
                <motion.div
                  key={i}
                  className="rounded-xl overflow-hidden shadow-xl"
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.2 }}
                  data-clickable
                >
                  <img
                    src={src || "/placeholder.svg"}
                    alt={`Showcase ${i + 1}`}
                    className="w-full h-full object-cover aspect-[4/5]"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}


