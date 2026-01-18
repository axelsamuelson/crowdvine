"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface VercelTabsProps {
  tabs: string[];
  defaultTab?: number;
  onTabChange?: (index: number) => void;
  className?: string;
}

export function VercelTabs({
  tabs,
  defaultTab = 0,
  onTabChange,
  className,
}: VercelTabsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(defaultTab);
  const [hoverStyle, setHoverStyle] = useState({});
  const [activeStyle, setActiveStyle] = useState({ left: "0px", width: "0px" });
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (hoveredIndex !== null) {
      const hoveredElement = tabRefs.current[hoveredIndex];
      if (hoveredElement) {
        const { offsetLeft, offsetWidth } = hoveredElement;
        setHoverStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
      }
    }
  }, [hoveredIndex]);

  useEffect(() => {
    const activeElement = tabRefs.current[activeIndex];
    if (activeElement) {
      const { offsetLeft, offsetWidth } = activeElement;
      setActiveStyle({
        left: `${offsetLeft}px`,
        width: `${offsetWidth}px`,
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    requestAnimationFrame(() => {
      const overviewElement = tabRefs.current[0];
      if (overviewElement) {
        const { offsetLeft, offsetWidth } = overviewElement;
        setActiveStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
      }
    });
  }, []);

  const handleTabClick = (index: number) => {
    setActiveIndex(index);
    onTabChange?.(index);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Hover Highlight */}
      <div
        className="absolute h-[30px] transition-all duration-300 ease-out bg-gray-100 dark:bg-[#ffffff1a] rounded-[6px] flex items-center"
        style={{
          ...hoverStyle,
          opacity: hoveredIndex !== null ? 1 : 0,
        }}
      />

      {/* Active Indicator */}
      <div
        className="absolute bottom-[-6px] h-[2px] bg-gray-900 dark:bg-gray-900 transition-all duration-300 ease-out"
        style={activeStyle}
      />

      {/* Tabs */}
      <div className="relative flex space-x-[6px] items-center">
        {tabs.map((tab, index) => (
          <div
            key={index}
            ref={(el) => (tabRefs.current[index] = el)}
            className={cn(
              "px-3 py-2 cursor-pointer transition-colors duration-300 h-[30px] font-sans",
              index === activeIndex
                ? "text-gray-900 dark:text-gray-900 font-semibold"
                : "text-gray-500 dark:text-gray-400 font-normal"
            )}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => handleTabClick(index)}
          >
            <div className={cn(
              "text-sm leading-5 whitespace-nowrap flex items-center justify-center h-full",
              index === activeIndex
                ? "text-gray-900 dark:text-gray-900"
                : "text-gray-500 dark:text-gray-400"
            )}>
              {tab}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

