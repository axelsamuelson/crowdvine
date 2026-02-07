"use client";

import { motion } from "framer-motion";

const IMG_PREFIX = "/invite-opus";
const portfolioItems = [
  "/invite-opus/screenshots/Frame%202%20(2).jpg",
  `${IMG_PREFIX}/portfolio-website-design-preview-modern.jpg`,
  `${IMG_PREFIX}/photography-portfolio-website-clean.jpg`,
  `${IMG_PREFIX}/architecture-firm-website-minimal.jpg`,
  `${IMG_PREFIX}/design-agency-portfolio-dark-theme.jpg`,
  `${IMG_PREFIX}/artist-portfolio-website-creative.jpg`,
  `${IMG_PREFIX}/writer-portfolio-website-elegant.jpg`,
];

export function CarouselSection() {
  const items = [...portfolioItems, ...portfolioItems];

  return (
    <section className="bg-primary py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 mb-12">
        <motion.h2
          className="text-3xl md:text-4xl font-serif text-primary-foreground"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Wines from our producers.
        </motion.h2>
      </div>

      <div className="relative">
        <motion.div
          className="flex gap-6"
          animate={{ x: [0, "-50%"] }}
          transition={{
            duration: 30,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        >
          {items.map((src, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[300px] md:w-[400px] rounded-xl overflow-hidden shadow-2xl"
              data-clickable
            >
              <img
                src={src}
                alt=""
                className="w-full h-auto"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
