import Link from "next/link";
import { applyReservationExtensionConfirm } from "@/lib/reservations/expiry-run";
import {
  buildExtensionConfirmSuccessBody,
  EXTENSION_CONFIRM_PAGE_COPY,
  EXTENSION_CONFIRM_PAGE_ERROR_COPY,
} from "@/lib/reservations/expiry-emails";
import { consumeReservationExtensionToken } from "@/lib/reservations/expiry-tokens";
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

export default async function ReservationExtensionConfirmPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const token = firstParam(params.token).trim();
  const locale = resolveLocale(firstParam(params.lang).trim().toLowerCase());
  const copyOk = EXTENSION_CONFIRM_PAGE_COPY[locale];
  const copyErr = EXTENSION_CONFIRM_PAGE_ERROR_COPY[locale];

  if (!token) {
    return (
      <ConfirmShell
        title={copyErr.title}
        body={copyErr.missing_token}
        locale={locale}
      />
    );
  }

  const consumed = await consumeReservationExtensionToken(token);
  if (!consumed.ok) {
    const body =
      copyErr[consumed.code as keyof typeof copyErr] ?? copyErr.db_error;
    return (
      <ConfirmShell title={copyErr.title} body={String(body)} locale={locale} />
    );
  }

  const applied = await applyReservationExtensionConfirm({
    reservationId: consumed.reservationId,
  });

  if (!applied.ok) {
    return (
      <ConfirmShell
        title={copyErr.title}
        body={copyErr.not_eligible}
        locale={locale}
      />
    );
  }

  const body = buildExtensionConfirmSuccessBody({
    locale,
    newEndDate: applied.newEndDate,
    extensionDays: applied.extensionDays,
  });

  return <ConfirmShell title={copyOk.title} body={body} locale={locale} ok />;
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
