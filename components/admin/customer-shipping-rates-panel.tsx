"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Admin: customer shipping REVENUE (what customers pay).
 * Distinct from carrier cost and inbound freight in Fraktalternativ.
 */
export function CustomerShippingRatesPanel() {
  const [entries, setEntries] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [flatSek, setFlatSek] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/customer-shipping-rates");
      const json = await res.json();
      if (!res.ok && json.error) setError(String(json.error));
      setEntries(json.entries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    const sek = Number(flatSek);
    if (!Number.isFinite(sek) || sek <= 0) {
      setError("Enter a positive SEK amount from the business decision — do not invent one.");
      return;
    }
    const res = await fetch("/api/admin/customer-shipping-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country_code: "SE",
        flat_fee_cents: Math.round(sek * 100),
        free_shipping: false,
        notes: "Admin-configured PACT customer shipping revenue",
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to save");
      return;
    }
    setFlatSek("");
    await load();
  };

  const deactivate = async (id: string) => {
    await fetch(`/api/admin/customer-shipping-rates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    await load();
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Customer shipping price
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400 max-w-2xl">
          What the customer pays at checkout (revenue). Separate from{" "}
          <strong>carrier cost</strong> (what PACT pays Instabee/Budbee) and{" "}
          <strong>inbound pallet freight</strong> (producer → Sweden). Leave empty
          until the business sets an authoritative SEK rate — do not invent 79/99/100.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {loading ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : null}

      {entries.length === 0 ? (
        <p className="text-sm text-amber-800 dark:text-amber-200/90 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 p-3">
          No active customer shipping rate. Checkout still uses the legacy
          pallet amortization fallback (may charge 0 when cost_cents and last-mile
          are 0). Configure a rate after the business decision.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {entries.map((e) => (
            <li
              key={String(e.id)}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 dark:border-zinc-800 px-3 py-2"
            >
              <span>
                {String(e.country_code || "SE")} ·{" "}
                {e.free_shipping
                  ? "Free shipping"
                  : `${(Number(e.flat_fee_cents) / 100).toFixed(0)} SEK`}{" "}
                · {e.active ? "active" : "inactive"}
              </span>
              {e.active ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void deactivate(String(e.id))}
                >
                  Deactivate
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2 max-w-md">
        <div className="space-y-1 flex-1 min-w-[140px]">
          <Label className="text-xs">Flat fee SEK (inkl. moms)</Label>
          <Input
            type="number"
            placeholder="e.g. after business decision"
            value={flatSek}
            onChange={(e) => setFlatSek(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={() => void add()}>
          Add rate
        </Button>
      </div>
    </div>
  );
}
