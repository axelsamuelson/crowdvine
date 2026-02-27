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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  comment: string;
  /** When true, wheel starts at value but we don't treat value as "saved" - localValue is set by wheel after scroll */
  initialScrollOnly?: boolean;
  onConfirm: (value: number, comment: string) => void;
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
      // After programmatic scroll, update parent so display shows the scrolled-to value
      const valueToReport = items[clamped];
      if (valueToReport !== undefined) {
        setTimeout(() => onChange(valueToReport), 450);
      }
    },
    [items, onChange],
  );

  useEffect(() => {
    if (!open) {
      hasScrolledForOpenRef.current = false;
      return;
    }
    if (hasScrolledForOpenRef.current) return;
    const idx = items.indexOf(value);
    if (idx < 0) return;
    hasScrolledForOpenRef.current = true;
    // Retry scroll until drawer content is mounted (Vaul renders when open)
    let attempts = 0;
    const maxAttempts = 20;
    const tryScroll = () => {
      const el = scrollRef.current;
      if (el) {
        scrollToIndex(idx);
        return;
      }
      attempts += 1;
      if (attempts < maxAttempts) setTimeout(tryScroll, 50);
    };
    const t = setTimeout(tryScroll, 80);
    return () => clearTimeout(t);
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
  comment,
  initialScrollOnly = false,
  onConfirm,
}: ScorePickerDrawerProps) {
  const [localValue, setLocalValue] = useState(Math.round(Math.max(0, Math.min(100, value))));
  const [localComment, setLocalComment] = useState(comment);

  useEffect(() => {
    if (open) {
      setLocalComment(comment);
      if (initialScrollOnly) {
        setLocalValue(0);
      } else {
        setLocalValue(Math.round(Math.max(0, Math.min(100, value))));
      }
    }
  }, [open, value, comment, initialScrollOnly]);

  const handleConfirm = () => {
    const clamped = Math.max(0, Math.min(100, localValue));
    onConfirm(clamped, localComment.trim());
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] rounded-t-2xl">
        <DrawerHeader className="text-center pb-2">
          <DrawerTitle className="text-lg font-semibold text-neutral-900">Set score</DrawerTitle>
          <DrawerDescription className="text-neutral-500">
            Swipe to change score from 0 to 100
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4">
          <div className="flex gap-2 rounded-xl bg-neutral-50 border border-neutral-200 overflow-hidden">
            <div className="flex flex-1 min-w-0 relative">
              <div
                className="absolute inset-0 pointer-events-none flex items-center justify-center"
                aria-hidden
              >
                <div
                  className="w-full border-y border-neutral-200 bg-white/60"
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
            <p className="text-sm font-semibold text-amber-700 py-2 pr-2 shrink-0" aria-live="polite">
              {localValue}
            </p>
          </div>
        </div>
        <div className="px-4 pb-4 space-y-2">
          <Label htmlFor="score-drawer-comment" className="text-neutral-700 font-medium">Comment</Label>
          <Textarea
            id="score-drawer-comment"
            placeholder="Your notes..."
            value={localComment}
            onChange={(e) => setLocalComment(e.target.value)}
            rows={3}
            className="resize-none rounded-xl border-neutral-200 focus-visible:ring-neutral-400"
          />
        </div>
        <DrawerFooter className="pt-2 pb-6 px-4">
          <Button
            onClick={handleConfirm}
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl h-12 font-medium"
          >
            Done
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full rounded-xl h-12 border-neutral-200 text-neutral-700">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
