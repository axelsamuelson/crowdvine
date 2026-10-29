"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type SystembolagetGuideNavLink = {
  category: string;
  href: string;
  short: string;
  name: string;
};

type SystembolagetGuideNavProps = {
  label: string;
  items: SystembolagetGuideNavLink[];
  active: string;
};

function centerActiveLink(node: HTMLDivElement) {
  const activeLink = node.querySelector<HTMLElement>("[data-active='true']");
  if (!activeLink) return;
  const previous = node.style.scrollBehavior;
  node.style.scrollBehavior = "auto";
  const target =
    activeLink.offsetLeft - (node.clientWidth - activeLink.clientWidth) / 2;
  node.scrollLeft = Math.max(0, target);
  node.style.scrollBehavior = previous;
}

/**
 * Horizontal guide index. Sticks under the site header while the list scrolls,
 * so switching Systembolaget guides does not require reaching the page footer.
 */
export function SystembolagetGuideNav({
  label,
  items,
  active,
}: SystembolagetGuideNavProps) {
  const [edges, setEdges] = useState({ left: false, right: true });
  const [stuck, setStuck] = useState(false);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  const setScrollerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) centerActiveLink(node);
      setScroller(node);
    },
    [active],
  );

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    let frame = 0;
    const update = () => {
      const stickyTop = Number.parseFloat(getComputedStyle(nav).top);
      const next = nav.getBoundingClientRect().top <= stickyTop + 1;
      setStuck((current) => (current === next ? current : next));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!scroller) return;
    centerActiveLink(scroller);
    const update = () => {
      const max = scroller.scrollWidth - scroller.clientWidth;
      setEdges({
        left: scroller.scrollLeft > 2,
        right: max - scroller.scrollLeft > 2,
      });
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [scroller, items]);

  if (items.length < 2) return null;

  return (
    <>
      {stuck ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[var(--top-spacing)] bg-background"
        />
      ) : null}
      <nav
        ref={navRef}
        aria-label={label}
        className="sticky top-top-spacing z-30 -mx-6 mt-6 border-b border-border bg-background"
      >
        <div className="relative">
          <div
            ref={setScrollerRef}
            className="scrollbar-hide flex overflow-x-auto overscroll-x-contain px-3.5"
          >
            {items.map((item) => {
              const isActive = item.category === active;
              return (
                <Link
                  key={item.category}
                  href={item.href}
                  data-active={isActive ? "true" : undefined}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={item.name}
                  className={cn(
                    "relative shrink-0 cursor-pointer whitespace-nowrap px-2.5 py-3 text-sm transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/25",
                    isActive
                      ? "font-medium text-foreground shadow-[inset_0_-2px_0_0_currentColor]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.short}
                </Link>
              );
            })}
          </div>
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent transition-opacity duration-200",
              edges.left ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent transition-opacity duration-200",
              edges.right ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      </nav>
    </>
  );
}
