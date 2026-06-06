"use client";

import { Children, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface WinePdpEnrichmentMotionProps {
  children: ReactNode;
  className?: string;
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export function WinePdpEnrichmentMotion({
  children,
  className,
}: WinePdpEnrichmentMotionProps) {
  const reduceMotion = useReducedMotion();
  const items = Children.toArray(children).filter(Boolean);

  if (reduceMotion) {
    return <div className={className}>{items}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.08 } },
      }}
    >
      {items.map((child, i) => (
        <motion.div
          key={i}
          className="w-full"
          variants={item}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
