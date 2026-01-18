"use client";

import { cn } from "@/lib/utils";

interface SocialProfileTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    count?: number;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function SocialProfileTabs({
  tabs,
  activeTab,
  onTabChange,
}: SocialProfileTabsProps) {
  return (
    <div className="mt-1 border-b border-border">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex-1 whitespace-nowrap px-4 py-4 text-sm font-medium transition-colors hover:bg-muted/50 min-w-fit",
                isActive
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <span className="relative inline-block">
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1 text-muted-foreground">
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute -bottom-4 left-0 right-0 h-0.5 rounded-full bg-primary" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}



