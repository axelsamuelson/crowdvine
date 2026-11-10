import Link from "next/link";
import { redirect } from "next/navigation";
import { beginPalletCloseSwitchDirect } from "@/lib/checkout/pallet-close/actions";
import { consumePalletCloseActionToken } from "@/lib/checkout/pallet-close/tokens";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function PalletCloseSwitchDirectPage({
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
            ? "Öppna länken från mejlet för att byta till direktleverans."
            : "Open the link from the email to switch to direct delivery."
        }
      />
    );
  }

  const consumed = await consumePalletCloseActionToken(token, "switch_direct");
  if (!consumed.ok) {
    return (
      <Shell
        title={lang === "sv" ? "Kunde inte bekräfta" : "Could not confirm"}
        body={consumed.message}
      />
    );
  }

  const started = await beginPalletCloseSwitchDirect({
    reservationId: consumed.reservationId,
  });
  if (!started.ok || !started.nextPath) {
    return (
      <Shell
        title={
          lang === "sv"
            ? "Direktleverans ej tillgänglig"
            : "Direct delivery unavailable"
        }
        body={
          lang === "sv"
            ? "Byt till direktleverans är avstängt eller går inte just nu. Du kan fortfarande vänta längre eller avboka."
            : "Switch to direct is disabled or unavailable. You can still wait longer or cancel."
        }
      />
    );
  }

  redirect(started.nextPath);
}

function Shell({
  title,
  body,
}: {
  title: string;
  body: string;
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
        className="mt-8 inline-flex w-fit rounded-xl bg-neutral-200 px-5 py-3 text-sm font-medium text-neutral-800"
      >
        Till startsidan
      </Link>
    </main>
  );
}
