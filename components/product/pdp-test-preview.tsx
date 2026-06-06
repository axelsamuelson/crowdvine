import Link from "next/link";
import { cn } from "@/lib/utils";

interface PdpTestFixtureTabsProps {
  active: string;
}

export function PdpTestFixtureTabs({ active }: PdpTestFixtureTabsProps) {
  const tabs = [
    { id: "full", label: "Full (Au Mas)" },
    { id: "minimal", label: "Minimal" },
    { id: "summary-only", label: "Summary only" },
  ] as const;

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`/dev/pdp-test?fixture=${tab.id}`}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            active === tab.id
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
