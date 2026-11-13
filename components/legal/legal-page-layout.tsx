import type { ReactNode } from "react";

import "./legal-page.css";

export type LegalTocItem = {
  id: string;
  /** Must be the section heading text verbatim — no new copy */
  label: string;
};

type LegalPageLayoutProps = {
  title: string;
  lastUpdated: string;
  version: string;
  children: ReactNode;
  /** Optional TOC using existing section headings as link text */
  toc?: LegalTocItem[];
  /** UI chrome locale for “Last updated” / TOC aria-label. Defaults to Swedish. */
  locale?: "sv" | "en";
};

export function LegalPageLayout({
  title,
  lastUpdated,
  version,
  children,
  toc,
  locale = "sv",
}: LegalPageLayoutProps) {
  const metaLine =
    locale === "en"
      ? `Last updated ${lastUpdated} · Version ${version}`
      : `Senast uppdaterad ${lastUpdated} · Version ${version}`;
  const tocAriaLabel = locale === "en" ? "Contents" : "Innehåll";

  // Root <html lang> can stay "sv" on static EN legal routes when
  // x-pathname is unavailable; scope content language on this wrapper.
  const contentLang = locale === "en" ? "en" : "sv";

  return (
    <main data-legal-page lang={contentLang} className="bg-background min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-16 pt-24 sm:px-6 sm:py-24 sm:pt-28">
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-[#0A0A0A]">
          {title}
        </h1>
        <p className="mt-3 text-sm text-[#404040]">{metaLine}</p>
        {toc && toc.length > 0 ? (
          <nav aria-label={tocAriaLabel} className="mt-6">
            <ul className="space-y-1.5 text-sm text-[#404040]">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="underline underline-offset-2 text-[#0A0A0A]"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <hr className="my-10 border-border" />
        {children}
      </div>
    </main>
  );
}
