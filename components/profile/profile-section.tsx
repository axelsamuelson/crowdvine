"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ProfileSectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  highlight?: "subtle" | "plain";
  id?: string;
}

export function ProfileSection({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  highlight = "subtle",
  id,
}: ProfileSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-2xl border shadow-sm",
        highlight === "subtle"
          ? "border-slate-200 bg-white/90 backdrop-blur"
          : "border-transparent bg-transparent shadow-none",
        className,
      )}
    >
      {(title || actions || description) && (
        <div className="flex flex-wrap items-start gap-3 border-b border-slate-100 px-4 py-4 md:px-6">
          <div className="flex-1 min-w-[200px]">
            {title && (
              <h2 className="text-base font-semibold text-slate-900">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-slate-500">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      <div className={cn("px-4 py-4 md:px-6 md:py-6", contentClassName)}>
        {children}
      </div>
    </section>
  );
}

