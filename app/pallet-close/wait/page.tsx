import Link from "next/link";
import { applyPalletCloseWait } from "@/lib/checkout/pallet-close/actions";
import { consumePalletCloseActionToken } from "@/lib/checkout/pallet-close/tokens";
import { formatSharedPalletChargeDeadline } from "@/lib/checkout/shared-pallet-deadline";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function PalletCloseWaitPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const token = firstParam(params.token).trim();
  const lang = firstParam(params.lang).trim().toLowerCase() === "en" ? "en" : "sv";

  if (!token) {
    return (
      <Shell
        title={lang === "sv" ? "Länken saknas" : "Missing link"}
        body={
          lang === "sv"
            ? "Öppna länken från mejlet för att vänta längre."
            : "Open the link from the email to wait longer."
        }
      />
    );
  }

  const consumed = await consumePalletCloseActionToken(token, "wait");
  if (!consumed.ok) {
    return (
      <Shell
        title={lang === "sv" ? "Kunde inte bekräfta" : "Could not confirm"}
        body={consumed.message}
      />
    );
  }

  const applied = await applyPalletCloseWait({
    reservationId: consumed.reservationId,
  });
  if (!applied.ok) {
    return (
      <Shell
        title={lang === "sv" ? "Kunde inte förlänga" : "Could not extend"}
        body={
          lang === "sv"
            ? "Reservationen går inte att förlänga just nu."
            : "This reservation cannot be extended right now."
        }
      />
    );
  }

  const deadlineLabel =
    formatSharedPalletChargeDeadline(applied.newDeadlineAt ?? null, lang) ||
    applied.newDeadlineAt?.slice(0, 10) ||
    "";

  return (
    <Shell
      title={lang === "sv" ? "Du väntar längre" : "You chose to wait"}
      body={
        lang === "sv"
          ? `Nytt sista datum: ${deadlineLabel}. Samma pris. Kostnadsfri avbokning tills dess.`
          : `New last date: ${deadlineLabel}. Same price. Free cancellation until then.`
      }
      ok
    />
  );
}

function Shell({
  title,
  body,
  ok = false,
}: {
  title: string;
  body: string;
  ok?: boolean;
}) {
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
        className={`mt-8 inline-flex w-fit rounded-xl px-5 py-3 text-sm font-medium ${
          ok ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-800"
        }`}
      >
        Till startsidan
      </Link>
    </main>
  );
}
