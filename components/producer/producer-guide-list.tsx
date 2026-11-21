import Link from "next/link";

import type { ProducerMentionedGuide } from "@/lib/guides/guides-for-producer";

const ARROW_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-[18px] shrink-0 text-[#0a0a0a]"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

/**
 * Guide links on producer profiles — same row treatment as guide shop links (PR260).
 */
export function ProducerGuideList({
  guides,
}: {
  guides: readonly ProducerMentionedGuide[];
}) {
  if (guides.length === 0) return null;

  return (
    <ul className="mt-3 border-t border-[#d4d4d4]">
      {guides.map((guide) => (
        <li key={guide.href} className="border-b border-[#d4d4d4]">
          <Link
            href={guide.href}
            className="flex min-h-11 items-center justify-between gap-4 px-0.5 py-2 text-[15px] font-medium tracking-[-0.01em] text-[#0a0a0a] no-underline hover:text-[#0a0a0a]"
          >
            <span className="min-w-0 text-left leading-snug">{guide.title}</span>
            {ARROW_ICON}
          </Link>
        </li>
      ))}
    </ul>
  );
}
