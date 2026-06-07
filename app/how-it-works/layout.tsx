import type { ReactNode } from "react";
import { HiwScrollProvider } from "@/lib/hooks/use-hiw-scroll";

export default function HowItWorksLayout({ children }: { children: ReactNode }) {
  return (
    <HiwScrollProvider>
      <div className="hiw-page">{children}</div>
    </HiwScrollProvider>
  );
}
