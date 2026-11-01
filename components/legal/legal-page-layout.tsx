import type { ReactNode } from "react";

type LegalPageLayoutProps = {
  title: string;
  lastUpdated: string;
  version: string;
  children: ReactNode;
};

export function LegalPageLayout({
  title,
  lastUpdated,
  version,
  children,
}: LegalPageLayoutProps) {
  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-16 pt-24 sm:px-6 sm:py-24 sm:pt-28">
        <h1 className="text-3xl sm:text-4xl font-medium text-foreground tracking-tight">
          {title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Senast uppdaterad {lastUpdated} · Version {version}
        </p>
        <hr className="my-10 border-border" />
        {children}
      </div>
    </main>
  );
}
