import Link from "next/link";

/** Compact shop CTA used on bilingual article guides. */
export function ArticleShopCta({
  href,
  label,
  lead,
}: {
  href: string;
  label: string;
  /** Optional supporting sentence above the link. */
  lead?: string;
}) {
  return (
    <aside className="space-y-2 border-t border-border pt-8 text-sm">
      {lead ? (
        <p className="text-[17px] leading-relaxed text-foreground/80">{lead}</p>
      ) : null}
      <p>
        <Link
          href={href}
          className="font-medium underline underline-offset-4 hover:text-foreground"
        >
          {label}
        </Link>
      </p>
    </aside>
  );
}
