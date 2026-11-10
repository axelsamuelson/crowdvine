import Link from "next/link";
import {
  buildExtensionConfirmSuccessBody,
  EXTENSION_CONFIRM_PAGE_COPY,
  EXTENSION_CONFIRM_PAGE_ERROR_COPY,
} from "@/lib/reservations/expiry-emails";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
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
 * Confirmation / extension is no longer required (Axel 2026-11-10).
 * Any old link shows a friendly message — never an error.
 */
export default async function ReservationExtensionConfirmPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const token = firstParam(params.token).trim();
  const locale = resolveLocale(firstParam(params.lang).trim().toLowerCase());
  const copyOk = EXTENSION_CONFIRM_PAGE_COPY[locale];

  // Best-effort: clear any leftover reply deadline so cron never auto-cancels.
  if (token) {
    try {
      const sb = getSupabaseAdmin();
      const { createHash } = await import("node:crypto");
      const tokenHash = createHash("sha256")
        .update(token, "utf8")
        .digest("hex");
      const { data } = await sb
        .from("reservation_extension_tokens")
        .select("reservation_id")
        .eq("token_hash", tokenHash)
        .maybeSingle();
      if (data?.reservation_id) {
        await sb
          .from("order_reservations")
          .update({ extension_reply_by: null })
          .eq("id", data.reservation_id);
      }
    } catch {
      // Friendly page regardless of DB issues.
    }
  }

  const body = token
    ? buildExtensionConfirmSuccessBody({ locale })
    : EXTENSION_CONFIRM_PAGE_ERROR_COPY[locale].missing_token;

  return (
    <ConfirmShell
      title={copyOk.title}
      body={body}
      locale={locale}
      ok
    />
  );
}

function ConfirmShell({
  title,
  body,
  locale,
  ok = false,
}: {
  title: string;
  body: string;
  locale: AppLocale;
  ok?: boolean;
}) {
  const cta = EXTENSION_CONFIRM_PAGE_COPY[locale].cta;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-6 py-16">
      <p className="mb-6 text-sm font-semibold tracking-[0.2em] text-neutral-500">
        PACT
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
        {title}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-neutral-700">{body}</p>
      <Link
        href="/"
        className={`mt-10 inline-flex w-fit items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium ${
          ok
            ? "bg-neutral-900 text-white hover:bg-neutral-800"
            : "border border-neutral-300 text-neutral-900 hover:bg-neutral-50"
        }`}
      >
        {cta}
      </Link>
    </main>
  );
}
