import Link from "next/link";
import type { ReactNode } from "react";
import { consumeSoldOutChoiceToken } from "@/lib/pallet-coverage-close/sold-out-tokens";
import { persistSoldOutCustomerChoice } from "@/lib/pallet-coverage-close/apply-sold-out-choice";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/**
 * Customer sold-out-at-lock choice page.
 * Copy is PLACEHOLDER — TODO(Juliette/Margaux). Axel must approve word for word.
 */
export default async function PalletLockChoicePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const token = firstParam(params.token).trim();
  const lang =
    firstParam(params.lang).trim().toLowerCase() === "en" ? "en" : "sv";
  const choice = firstParam(params.choice).trim().toLowerCase();
  const replacementWineId = firstParam(params.replacement_wine_id).trim();

  if (!token) {
    return (
      <Shell
        title={lang === "sv" ? "Länken saknas" : "Missing link"}
        body={
          // TODO(Juliette/Margaux)
          lang === "sv"
            ? "TODO(Juliette/Margaux): Öppna länken från mejlet."
            : "TODO(Juliette/Margaux): Open the link from the email."
        }
      />
    );
  }

  const consumed = await consumeSoldOutChoiceToken(token);
  if (!consumed.ok) {
    return (
      <Shell
        title={lang === "sv" ? "Kunde inte öppna" : "Could not open"}
        body={consumed.message}
      />
    );
  }

  if (choice === "remove" || choice === "replace") {
    let replacementAmountOre: number | null = null;
    if (choice === "replace" && replacementWineId) {
      const sb = getSupabaseAdmin();
      const { data: wine } = await sb
        .from("wines")
        .select("base_price_cents")
        .eq("id", replacementWineId)
        .maybeSingle();
      const { data: line } = await sb
        .from("order_reservation_items")
        .select("quantity")
        .eq("id", consumed.reservationItemId)
        .maybeSingle();
      const qty = Math.max(0, Math.floor(Number(line?.quantity) || 0));
      replacementAmountOre = Math.round(
        (Number(wine?.base_price_cents) || 0) * qty,
      );
    }

    const applied = await persistSoldOutCustomerChoice({
      reservationId: consumed.reservationId,
      reservationItemId: consumed.reservationItemId,
      choice: choice === "remove" ? "remove" : "replace",
      replacementWineId: replacementWineId || null,
      replacementAmountOre,
    });

    if (!applied.ok) {
      return (
        <Shell
          title={lang === "sv" ? "Kunde inte spara" : "Could not save"}
          body={applied.message}
        />
      );
    }

    return (
      <Shell
        title={
          lang === "sv"
            ? "TODO(Juliette/Margaux): Val sparat"
            : "TODO(Juliette/Margaux): Choice saved"
        }
        body={
          choice === "remove"
            ? lang === "sv"
              ? "TODO(Juliette/Margaux): Vinet tas bort och debiteras inte."
              : "TODO(Juliette/Margaux): The wine is removed and will not be charged."
            : lang === "sv"
              ? "TODO(Juliette/Margaux): Ersättningsvinet är sparat."
              : "TODO(Juliette/Margaux): Your replacement wine is saved."
        }
      />
    );
  }

  // Show choice UI (placeholders)
  const removeHref = `/pallet-lock-choice?token=${encodeURIComponent(token)}&choice=remove&lang=${lang}`;
  return (
    <Shell
      title={
        lang === "sv"
          ? "TODO(Juliette/Margaux): Vinet är slut"
          : "TODO(Juliette/Margaux): Wine unavailable"
      }
      body={
        lang === "sv"
          ? "TODO(Juliette/Margaux): Välj ersättning eller ta bort (debiteras inte). Standard om du inte svarar: ta bort."
          : "TODO(Juliette/Margaux): Choose a replacement or remove (not charged). Default if no reply: remove."
      }
    >
      <div className="mt-6 flex flex-col gap-3">
        <Link
          href={removeHref}
          className="underline underline-offset-4 text-[#0A0A0A]"
        >
          {lang === "sv"
            ? "TODO(Juliette/Margaux): Ta bort vinet"
            : "TODO(Juliette/Margaux): Remove the wine"}
        </Link>
        <p className="text-sm text-muted-foreground">
          {lang === "sv"
            ? "TODO(Juliette/Margaux): Ersättningsval kommer via support/admin tills vinlista är inkopplad — skicka replacement_wine_id i URL."
            : "TODO(Juliette/Margaux): Replacement picker wires via replacement_wine_id query until catalog UI lands."}
        </p>
      </div>
    </Shell>
  );
}

function Shell({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-lg px-6 py-16 font-sans">
      <h1 className="text-xl font-medium text-[#0A0A0A]">{title}</h1>
      <p className="mt-3 text-sm text-[#737373] leading-relaxed">{body}</p>
      {children}
      <p className="mt-10 text-xs text-muted-foreground">
        <Link href="/" className="underline underline-offset-4">
          pactwines.com
        </Link>
      </p>
    </main>
  );
}
