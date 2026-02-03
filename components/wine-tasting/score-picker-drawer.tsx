"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING_Y = ITEM_HEIGHT * 2;

const ITEMS_0_100 = Array.from({ length: 101 }, (_, i) => i);

interface ScorePickerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: number;
  onConfirm: (value: number) => void;
}

function WheelColumn({
  items,
  value,
  onChange,
  open,
  "aria-label": ariaLabel,
}: {
  items: number[];
  value: number;
  onChange: (v: number) => void;
  open: boolean;
  "aria-label": string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);
  const ignoreScrollUntilRef = useRef(0);
  const hasScrolledForOpenRef = useRef(false);

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = scrollRef.current;
      if (!el) return;
      isProgrammaticScrollRef.current = true;
      ignoreScrollUntilRef.current = Date.now() + 400;
      const clamped = Math.max(0, Math.min(index, items.length - 1));
      const maxScroll = items.length * ITEM_HEIGHT - WHEEL_HEIGHT + PADDING_Y * 2;
      const scrollTop = Math.max(0, Math.min(clamped * ITEM_HEIGHT, maxScroll));
      el.scrollTo({ top: scrollTop, behavior: "auto" });
      requestAnimationFrame(() => {
        isProgrammaticScrollRef.current = false;
      });
    },
    [items.length],
  );

  useEffect(() => {
    if (!open) {
      hasScrolledForOpenRef.current = false;
      return;
    }
    if (hasScrolledForOpenRef.current) return;
    hasScrolledForOpenRef.current = true;
    const idx = items.indexOf(value);
    if (idx < 0) return;
    const t = requestAnimationFrame(() => scrollToIndex(idx));
    return () => cancelAnimationFrame(t);
  }, [open, value, items, scrollToIndex]);

  const getIndexFromScrollTop = useCallback((scrollTop: number) => {
    const centerOffset = scrollTop + WHEEL_HEIGHT / 2 - PADDING_Y;
    return Math.round(centerOffset / ITEM_HEIGHT);
  }, []);

  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current || Date.now() < ignoreScrollUntilRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const index = getIndexFromScrollTop(el.scrollTop);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    if (items[clamped] !== undefined) onChange(items[clamped]);
  }, [items, onChange, getIndexFromScrollTop]);

  const scrollEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleScrollEnd = useCallback(() => {
    if (isProgrammaticScrollRef.current || Date.now() < ignoreScrollUntilRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const index = getIndexFromScrollTop(el.scrollTop);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    scrollToIndex(clamped);
    if (items[clamped] !== undefined) onChange(items[clamped]);
  }, [items, onChange, scrollToIndex, getIndexFromScrollTop]);

  const onScrollWithSnap = useCallback(() => {
    handleScroll();
    if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
    scrollEndTimeoutRef.current = setTimeout(handleScrollEnd, 120);
  }, [handleScroll, handleScrollEnd]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onEnd = () => handleScrollEnd();
    el.addEventListener("scrollend", onEnd);
    return () => {
      el.removeEventListener("scrollend", onEnd);
      if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
    };
  }, [handleScrollEnd]);

  return (
    <div
      ref={scrollRef}
      role="listbox"
      aria-label={ariaLabel}
      className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth snap-y snap-mandatory scrollbar-hide"
      style={{ height: WHEEL_HEIGHT }}
      onScroll={onScrollWithSnap}
    >
      <div style={{ paddingTop: PADDING_Y, paddingBottom: PADDING_Y }}>
        {items.map((item) => (
          <div
            key={item}
            className={cn(
              "flex items-center justify-center text-lg font-medium snap-center",
              item === value && "text-foreground font-semibold",
              item !== value && "text-muted-foreground",
            )}
            style={{ height: ITEM_HEIGHT }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScorePickerDrawer({
  open,
  onOpenChange,
  value,
  onConfirm,
}: ScorePickerDrawerProps) {
  const [localValue, setLocalValue] = useState(Math.round(Math.max(0, Math.min(100, value))));

  useEffect(() => {
    if (open) {
      setLocalValue(Math.round(Math.max(0, Math.min(100, value))));
    }
  }, [open, value]);

  const handleConfirm = () => {
    const clamped = Math.max(0, Math.min(100, localValue));
    onConfirm(clamped);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] rounded-t-2xl">
        <DrawerHeader className="text-center pb-2">
          <DrawerTitle className="text-lg font-semibold">Set score</DrawerTitle>
          <DrawerDescription>
            Swipe to change score from 0 to 100
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4">
          <div className="flex gap-2 rounded-xl bg-muted/50 border border-border overflow-hidden">
            <span className="text-xs text-muted-foreground py-2 self-center shrink-0 pl-2">Score</span>
            <div className="flex flex-1 min-w-0 relative">
              <div
                className="absolute inset-0 pointer-events-none flex items-center justify-center"
                aria-hidden
              >
                <div
                  className="w-full border-y border-border/60 bg-background/40"
                  style={{ height: ITEM_HEIGHT }}
                />
              </div>
              <div className="flex-1 min-w-0 relative z-10">
                <WheelColumn
                  items={ITEMS_0_100}
                  value={localValue}
                  onChange={setLocalValue}
                  open={open}
                  aria-label="Score 0–100"
                />
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground py-2 pr-2 shrink-0" aria-live="polite">
              {localValue}
            </p>
          </div>
        </div>
        <DrawerFooter className="pt-2 pb-6 px-4">
          <Button
            onClick={handleConfirm}
            className="w-full bg-black hover:bg-black/90 text-white rounded-md"
          >
            Done
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full rounded-md">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
