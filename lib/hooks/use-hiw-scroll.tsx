"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

type HiwScrollContextValue = {
  scrollRootRef: RefObject<HTMLDivElement | null>;
  scrollTick: number;
};

const HiwScrollContext = createContext<HiwScrollContextValue | null>(null);

export function HiwScrollProvider({ children }: { children: ReactNode }) {
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const [scrollTick, setScrollTick] = useState(0);
  const rafRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.classList.add("hiw-scroll-active");
    body.classList.add("hiw-scroll-active");
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.classList.remove("hiw-scroll-active");
      body.classList.remove("hiw-scroll-active");
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  useLayoutEffect(() => {
    const root = scrollRootRef.current;
    if (!root) return;

    const onScroll = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setScrollTick((tick) => tick + 1);
      });
    };

    const onWheel = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !root.contains(target)) return;

      const maxScroll = root.scrollHeight - root.clientHeight;
      if (maxScroll <= 0) return;

      const next = Math.max(
        0,
        Math.min(maxScroll, root.scrollTop + event.deltaY),
      );

      if (next !== root.scrollTop) {
        event.preventDefault();
        root.scrollTop = next;
      }
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();

    return () => {
      root.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <HiwScrollContext.Provider value={{ scrollRootRef, scrollTick }}>
      <div
        ref={scrollRootRef}
        className="hiw-scroll-root"
        data-hiw-scroll-root
      >
        {children}
      </div>
    </HiwScrollContext.Provider>
  );
}

function getScrolledIntoElement(element: HTMLElement): number {
  const scrollRoot = element.closest(
    "[data-hiw-scroll-root]",
  ) as HTMLElement | null;

  if (scrollRoot) {
    const containerRect = scrollRoot.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    return containerRect.top - elementRect.top;
  }

  return -element.getBoundingClientRect().top;
}

function getViewportHeight(element: HTMLElement): number {
  const scrollRoot = element.closest(
    "[data-hiw-scroll-root]",
  ) as HTMLElement | null;
  return scrollRoot?.clientHeight ?? window.innerHeight;
}

export function useHiwScrollProgress(
  measure: (element: HTMLElement) => number,
): [RefObject<HTMLElement | null>, number] {
  const context = useContext(HiwScrollContext);
  const ref = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setProgress(measure(element));
  }, [context?.scrollTick, measure]);

  return [ref, progress];
}

export function useHiwScrollContainer(): HTMLElement | null {
  const context = useContext(HiwScrollContext);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setContainer(context?.scrollRootRef.current ?? null);
  }, [context?.scrollRootRef, context?.scrollTick]);

  return container;
}

export function measureViewportScrollProgress(
  element: HTMLElement,
  scrollableVhMultiplier: number,
): number {
  const viewportHeight = getViewportHeight(element);
  const scrolled = getScrolledIntoElement(element);
  return Math.max(
    0,
    Math.min(1, scrolled / (viewportHeight * scrollableVhMultiplier)),
  );
}

export function measureSectionScrollProgress(element: HTMLElement): number {
  const viewportHeight = getViewportHeight(element);
  const scrollableRange = element.offsetHeight - viewportHeight;
  if (scrollableRange <= 0) return 0;

  const scrolled = getScrolledIntoElement(element);
  return Math.max(0, Math.min(1, scrolled / scrollableRange));
}

export function measureElementViewportProgress(element: HTMLElement): number {
  const viewportHeight = getViewportHeight(element);
  const scrollRoot = element.closest(
    "[data-hiw-scroll-root]",
  ) as HTMLElement | null;
  const rect = element.getBoundingClientRect();
  const originTop = scrollRoot
    ? scrollRoot.getBoundingClientRect().top
    : 0;

  const relativeTop = rect.top - originTop;
  const startTrigger = viewportHeight * 0.8;
  const endTrigger = viewportHeight * 0.2;
  const range = startTrigger - endTrigger;
  if (range <= 0) return 0;

  return Math.max(0, Math.min(1, (startTrigger - relativeTop) / range));
}

export function useHiwScrollListener(onScroll: () => void) {
  const context = useContext(HiwScrollContext);

  useLayoutEffect(() => {
    onScroll();
  }, [context?.scrollTick, onScroll]);
}
