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
    <main className="bg-stone-50 min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-24">
        <h1 className="text-3xl sm:text-4xl font-medium text-stone-900 tracking-tight">
          {title}
        </h1>
        <p className="mt-3 text-sm text-stone-400">
          Senast uppdaterad {lastUpdated} · Version {version}
        </p>
        <hr className="my-10 border-stone-200" />
        {children}
      </div>
    </main>
  );
}
