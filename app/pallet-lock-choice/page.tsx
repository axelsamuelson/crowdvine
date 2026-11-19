import Link from "next/link";
import type { ReactNode } from "react";
import { consumeSoldOutChoiceToken } from "@/lib/pallet-coverage-close/sold-out-tokens";
import { persistSoldOutCustomerChoice } from "@/lib/pallet-coverage-close/apply-sold-out-choice";
import {
  packingSourceIdForWine,
  resolveSoldOutAllowedChoices,
  type SoldOutChoice,
  type SoldOutLineSnapshot,
} from "@/lib/pallet-coverage-close/sold-out-choice";
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
  const choiceRaw = firstParam(params.choice).trim().toLowerCase();
  const replacementWineId = firstParam(params.replacement_wine_id).trim();

  if (!token) {
    return (
      <Shell
        title={lang === "sv" ? "Länken saknas" : "Missing link"}
        body={
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

  const sb = getSupabaseAdmin();
  const { data: orderLines } = await sb
    .from("order_reservation_items")
    .select(
      "id, item_id, quantity, sold_out_choice_state, wines(source_type, source_name, producer_id, base_price_cents)",
    )
    .eq("reservation_id", consumed.reservationId);

  const snapshots: SoldOutLineSnapshot[] = (orderLines ?? []).map((row) => {
    const wineRaw = (
      row as {
        wines?:
          | {
              source_type?: string | null;
              source_name?: string | null;
              producer_id?: string | null;
              base_price_cents?: number | null;
            }
          | {
              source_type?: string | null;
              source_name?: string | null;
              producer_id?: string | null;
              base_price_cents?: number | null;
            }[]
          | null;
      }
    ).wines;
    const wine = Array.isArray(wineRaw) ? wineRaw[0] : wineRaw;
    const qty = Math.max(0, Math.floor(Number(row.quantity) || 0));
    const unit = Number(wine?.base_price_cents) || 0;
    const sourceType = wine?.source_type ?? "producer";
    const sourceName = wine?.source_name ?? null;
    const producerId = wine?.producer_id ?? null;
    return {
      lineId: String(row.id),
      wineId: String(row.item_id),
      quantity: qty,
      originalAmountOre: Math.round(unit * qty),
      state:
        (row.sold_out_choice_state as SoldOutLineSnapshot["state"]) || "ok",
      packingSourceId: packingSourceIdForWine({
        sourceType,
        sourceName,
        producerId,
      }),
      sourceType,
      sourceName,
      producerId,
    };
  });

  const allowed = resolveSoldOutAllowedChoices(
    snapshots,
    consumed.reservationItemId,
  );

  const choice: SoldOutChoice | null =
    choiceRaw === "remove"
      ? "remove"
      : choiceRaw === "replace"
        ? "replace"
        : choiceRaw === "cancel" || choiceRaw === "cancel_order"
          ? "cancel_order"
          : null;

  if (choice) {
    let replacementAmountOre: number | null = null;
    if (choice === "replace" && replacementWineId) {
      const { data: wine } = await sb
        .from("wines")
        .select("base_price_cents")
        .eq("id", replacementWineId)
        .maybeSingle();
      const line = snapshots.find(
        (l) => l.lineId === consumed.reservationItemId,
      );
      const qty = line?.quantity ?? 0;
      replacementAmountOre = Math.round(
        (Number(wine?.base_price_cents) || 0) * qty,
      );
    }

    const applied = await persistSoldOutCustomerChoice({
      reservationId: consumed.reservationId,
      reservationItemId: consumed.reservationItemId,
      choice,
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

    const savedBody =
      choice === "remove"
        ? lang === "sv"
          ? "TODO(Juliette/Margaux): Vinet tas bort och debiteras inte."
          : "TODO(Juliette/Margaux): The wine is removed and will not be charged."
        : choice === "cancel_order"
          ? lang === "sv"
            ? "TODO(Juliette/Margaux): Ordern är avbokad utan kostnad."
            : "TODO(Juliette/Margaux): The order is cancelled at no cost."
          : lang === "sv"
            ? "TODO(Juliette/Margaux): Ersättningsvinet är sparat."
            : "TODO(Juliette/Margaux): Your replacement wine is saved.";

    return (
      <Shell
        title={
          lang === "sv"
            ? "TODO(Juliette/Margaux): Val sparat"
            : "TODO(Juliette/Margaux): Choice saved"
        }
        body={savedBody}
      />
    );
  }

  const tokenQ = encodeURIComponent(token);
  const removeHref = `/pallet-lock-choice?token=${tokenQ}&choice=remove&lang=${lang}`;
  const cancelHref = `/pallet-lock-choice?token=${tokenQ}&choice=cancel&lang=${lang}`;

  return (
    <Shell
      title={
        lang === "sv"
          ? "TODO(Juliette/Margaux): Vinet är slut"
          : "TODO(Juliette/Margaux): Wine unavailable"
      }
      body={
        allowed.canRemove
          ? lang === "sv"
            ? "TODO(Juliette/Margaux): Välj ersättning från samma källa eller ta bort (debiteras inte). Standard om du inte svarar: ta bort."
            : "TODO(Juliette/Margaux): Choose a same-source replacement or remove (not charged). Default if no reply: remove."
          : lang === "sv"
            ? "TODO(Juliette/Margaux): Att ta bort bryter lådregeln (6 flaskor per producent/grossist). Välj ersättning från samma källa eller avboka hela ordern utan kostnad. Standard om du inte svarar: avboka."
            : "TODO(Juliette/Margaux): Removal would break the 6-per-source packing rule. Choose a same-source replacement or cancel the whole order at no cost. Default if no reply: cancel."
      }
    >
      <div className="mt-6 flex flex-col gap-3">
        {allowed.canRemove ? (
          <Link
            href={removeHref}
            className="underline underline-offset-4 text-[#0A0A0A]"
          >
            {lang === "sv"
              ? "TODO(Juliette/Margaux): Ta bort vinet"
              : "TODO(Juliette/Margaux): Remove the wine"}
          </Link>
        ) : (
          <Link
            href={cancelHref}
            className="underline underline-offset-4 text-[#0A0A0A]"
          >
            {lang === "sv"
              ? "TODO(Juliette/Margaux): Avboka hela ordern"
              : "TODO(Juliette/Margaux): Cancel the whole order"}
          </Link>
        )}
        <p className="text-sm text-muted-foreground">
          {lang === "sv"
            ? "TODO(Juliette/Margaux): Ersättningsval kommer via support/admin tills vinlista är inkopplad — skicka replacement_wine_id i URL (samma producent/grossist)."
            : "TODO(Juliette/Margaux): Replacement picker wires via replacement_wine_id query until catalog UI lands (same producer/wholesaler)."}
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
