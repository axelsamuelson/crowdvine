"use client";

import { ReactNode, useEffect, useRef } from "react";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";
import { cn } from "@/lib/utils";

interface DesktopGalleryWrapperProps {
  children: ReactNode;
}

export function DesktopGalleryWrapper({ children }: DesktopGalleryWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // PACT solid header only — Dirty Wine keeps gallery flush under transparent chrome.
  const isDirtywineSite = useB2BModeServerHint();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtTop = scrollTop === 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
      
      // If at top and scrolling up, or at bottom and scrolling down, allow page scroll
      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        // Don't preventDefault - let it propagate to document
        return;
      }
      // Otherwise, let the container handle the scroll
    };

    container.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "hidden overflow-y-auto relative col-span-7 col-start-6 w-full md:block",
        // pt-top-spacing keeps the first gallery image below the solid fixed header at 1440 (PACT).
        !isDirtywineSite && "md:pt-top-spacing",
      )}
      style={{ 
        touchAction: 'pan-y', 
        overscrollBehavior: 'auto'
      }}
    >
      {children}
    </div>
  );
}
