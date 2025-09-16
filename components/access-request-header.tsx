"use client";

import { cn } from "@/lib/utils";

interface AccessRequestHeaderProps {
  className?: string;
}

export function AccessRequestHeader({ className }: AccessRequestHeaderProps) {
  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50",
      "bg-background/10 backdrop-blur-lg border-b border-border/20",
      className
    )}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">PW</span>
            </div>
            <span className="text-foreground font-semibold text-lg">Pact Wines</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">Exclusive Access</span>
          </div>
        </div>
      </div>
    </header>
  );
}
