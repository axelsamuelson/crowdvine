import Link from "next/link";
import { applyPalletCloseCancel } from "@/lib/checkout/pallet-close/actions";
import { consumePalletCloseActionToken } from "@/lib/checkout/pallet-close/tokens";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function PalletCloseCancelPage({
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
            ? "Öppna länken från mejlet för att avboka."
            : "Open the link from the email to cancel."
        }
      />
    );
  }

  const consumed = await consumePalletCloseActionToken(token, "cancel");
  if (!consumed.ok) {
    return (
      <Shell
        title={lang === "sv" ? "Kunde inte bekräfta" : "Could not confirm"}
        body={consumed.message}
      />
    );
  }

  const applied = await applyPalletCloseCancel({
    reservationId: consumed.reservationId,
  });
  if (!applied.ok) {
    return (
      <Shell
        title={lang === "sv" ? "Kunde inte avboka" : "Could not cancel"}
        body={
          lang === "sv"
            ? "Reservationen går inte att avboka just nu."
            : "This reservation cannot be cancelled right now."
        }
      />
    );
  }

  return (
    <Shell
      title={lang === "sv" ? "Reservation avbokad" : "Reservation cancelled"}
      body={
        lang === "sv"
          ? "Ingen debitering har skett. Det sparade kortet har kopplats bort."
          : "No charge was made. The saved card was detached."
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
