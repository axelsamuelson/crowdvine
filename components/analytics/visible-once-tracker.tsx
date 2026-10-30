"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  /** Stable key so the same logical element fires once per mount. */
  onceKey: string;
  onVisible: () => void;
  children: ReactNode;
  className?: string;
  /** Fraction of element that must be visible (0–1). */
  threshold?: number;
};

const firedKeys = new Set<string>();

/**
 * Fires `onVisible` once the child enters the viewport (IntersectionObserver).
 * Dedupes by `onceKey` for the lifetime of the page (module Set + ref).
 */
export function VisibleOnceTracker({
  onceKey,
  onVisible,
  children,
  className,
  threshold = 0.4,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current || firedKeys.has(onceKey)) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (!hit || calledRef.current || firedKeys.has(onceKey)) return;
        calledRef.current = true;
        firedKeys.add(onceKey);
        obs.disconnect();
        onVisible();
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [onceKey, onVisible, threshold]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
