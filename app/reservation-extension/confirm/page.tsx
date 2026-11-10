import Link from "next/link";
import {
  EXTENSION_CONFIRM_PAGE_COPY,
  EXTENSION_LEGACY_LINK_BODY,
} from "@/lib/reservations/expiry-emails";
import type { AppLocale } from "@/lib/i18n/locale";
import { isAppLocale } from "@/lib/i18n/locale";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function resolveLocale(raw: string): AppLocale {
  return isAppLocale(raw) ? raw : "sv";
}

/**
 * Legacy extension-confirm page.
 * Confirmation is no longer required (Axel 2026-11-10).
 * Any visit shows a fixed friendly message and changes nothing in the DB.
 * Uses the site layout (header + Geist from root layout).
 */
export default async function ReservationExtensionConfirmPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const locale = resolveLocale(firstParam(params.lang).trim().toLowerCase());
  const copy = EXTENSION_CONFIRM_PAGE_COPY[locale];
  const body = EXTENSION_LEGACY_LINK_BODY[locale];

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-6 py-16 font-sans">
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
        {copy.title}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-neutral-700">{body}</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/profile/reservations"
          className="inline-flex items-center justify-center rounded-[4px] bg-[#0A0A0A] px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          {copy.orderCta}
        </Link>
        <Link
          href="/profile/reservations"
          className="inline-flex items-center justify-center rounded-[4px] border border-[#0A0A0A] bg-white px-5 py-2.5 text-sm font-medium text-[#0A0A0A] hover:bg-neutral-50"
        >
          {copy.cancelCta}
        </Link>
      </div>
    </main>
  );
}
