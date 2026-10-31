"use client";

import { ReactNode, useEffect, useRef } from "react";

interface DesktopGalleryWrapperProps {
  children: ReactNode;
}

export function DesktopGalleryWrapper({ children }: DesktopGalleryWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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
      // Offset below fixed header so nav (e.g. HEM) never sits on the hero image
      className="relative col-span-7 col-start-6 hidden w-full overflow-y-auto md:block md:pt-top-spacing"
      style={{
        touchAction: "pan-y",
        overscrollBehavior: "auto",
      }}
    >
      {children}
    </div>
  );
}
