"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Copy, Pencil, Plus, Power } from "lucide-react";

type DiscountType = "percent" | "sek";
type AppliesTo = "order" | "item";
type Purpose = "normal" | "testkop";

type DiscountCodeRow = {
  id: string;
  code: string;
  description: string | null;
  type: DiscountType;
  value: number;
  applies_to: AppliesTo;
  purpose: Purpose;
  max_uses: number | null;
  max_uses_per_user: number | null;
  user_id: string | null;
  user_email: string | null;
  valid_from: string;
  valid_until: string | null;
  active: boolean;
  use_count: number;
  created_at: string;
};

type UseRow = {
  id: string;
  user_id: string;
  user_email: string | null;
  reservation_id: string;
  discount_amount_sek: number;
  created_at: string;
};

type FormState = {
  code: string;
  description: string;
  type: DiscountType;
  value: string;
  applies_to: AppliesTo;
  purpose: Purpose;
  max_uses: string;
  max_uses_per_user: string;
  user_email: string;
  valid_from: string;
  valid_until: string;
};

function todayInputValue() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function emptyForm(): FormState {
  return {
    code: "",
    description: "",
    type: "percent",
    value: "",
    applies_to: "order",
    purpose: "normal",
    max_uses: "",
    max_uses_per_user: "",
    user_email: "",
    valid_from: todayInputValue(),
    valid_until: "",
  };
}

function statusOf(row: DiscountCodeRow): "Aktiv" | "Inaktiv" | "Utgången" {
  if (!row.active) return "Inaktiv";
  if (row.valid_until && new Date(row.valid_until).getTime() < Date.now()) {
    return "Utgången";
  }
  return "Aktiv";
}

function statusBadgeClass(status: ReturnType<typeof statusOf>) {
  if (status === "Aktiv") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  }
  if (status === "Utgången") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }
  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("sv-SE");
  } catch {
    return "—";
  }
}

function toDateInput(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function RabattkoderAdminPage() {
  const [codes, setCodes] = useState<DiscountCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountCodeRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [usesOpen, setUsesOpen] = useState(false);
  const [usesLoading, setUsesLoading] = useState(false);
  const [uses, setUses] = useState<UseRow[]>([]);
  const [usesFor, setUsesFor] = useState<DiscountCodeRow | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/discount-codes");
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || !contentType.includes("application/json")) {
        throw new Error("fetch failed");
      }
      const data = await res.json();
      setCodes(Array.isArray(data.codes) ? data.codes : []);
    } catch {
      toast.error("Kunde inte hämta rabattkoder");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (row: DiscountCodeRow) => {
    setEditing(row);
    setForm({
      code: row.code,
      description: row.description ?? "",
      type: row.type,
      value: String(row.value),
      applies_to: row.applies_to,
      purpose: row.purpose === "testkop" ? "testkop" : "normal",
      max_uses: row.max_uses != null ? String(row.max_uses) : "",
      max_uses_per_user:
        row.max_uses_per_user != null ? String(row.max_uses_per_user) : "",
      user_email: row.user_email ?? "",
      valid_from: toDateInput(row.valid_from) || todayInputValue(),
      valid_until: toDateInput(row.valid_until),
    });
    setFormOpen(true);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Kod kopierad");
    } catch {
      toast.error("Kunde inte kopiera");
    }
  };

  const deactivate = async (row: DiscountCodeRow) => {
    try {
      const res = await fetch(`/api/admin/discount-codes/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });
      if (!res.ok) throw new Error("fail");
      toast.success("Koden inaktiverad");
      void load();
    } catch {
      toast.error("Kunde inte inaktivera");
    }
  };

  const openUses = async (row: DiscountCodeRow) => {
    setUsesFor(row);
    setUsesOpen(true);
    setUsesLoading(true);
    try {
      const res = await fetch(`/api/admin/discount-codes/${row.id}`);
      if (!res.ok) throw new Error("fail");
      const data = await res.json();
      setUses(Array.isArray(data.uses) ? data.uses : []);
    } catch {
      toast.error("Kunde inte hämta användning");
      setUses([]);
    } finally {
      setUsesLoading(false);
    }
  };

  const save = async () => {
    const valueNum = Number(form.value);
    if (!form.code.trim()) {
      toast.error("Kod krävs");
      return;
    }
    if (!Number.isFinite(valueNum) || valueNum <= 0) {
      toast.error("Värde måste vara större än 0");
      return;
    }
    if (form.type === "percent" && valueNum > 100) {
      toast.error("Procent får max vara 100");
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      type: form.type,
      value: valueNum,
      applies_to: form.applies_to,
      purpose: form.purpose,
      max_uses: form.max_uses.trim() ? Number(form.max_uses) : null,
      max_uses_per_user: form.max_uses_per_user.trim()
        ? Number(form.max_uses_per_user)
        : null,
      user_email: form.user_email.trim() || null,
      clear_user: editing ? !form.user_email.trim() : undefined,
      valid_from: form.valid_from
        ? new Date(`${form.valid_from}T00:00:00`).toISOString()
        : new Date().toISOString(),
      valid_until: form.valid_until
        ? new Date(`${form.valid_until}T23:59:59`).toISOString()
        : null,
    };

    setSaving(true);
    try {
      const res = await fetch(
        editing
          ? `/api/admin/discount-codes/${editing.id}`
          : "/api/admin/discount-codes",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Misslyckades",
        );
      }
      toast.success(editing ? "Rabattkod uppdaterad" : "Rabattkod skapad");
      setFormOpen(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Misslyckades");
    } finally {
      setSaving(false);
    }
  };

  const sorted = useMemo(() => codes, [codes]);

  const primaryBtn =
    "rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";
  const outlineBtn =
    "rounded-lg text-xs font-medium border-gray-200 text-gray-900 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800";
  const ghostIconBtn =
    "rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50";
  const fieldClass =
    "h-9 text-sm rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-0 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500";
  const labelClass = "text-xs font-medium text-gray-800 dark:text-zinc-200";

  return (
    <div className="space-y-6 text-gray-900 dark:text-zinc-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Rabattkoder
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
            Skapa och hantera kampanjkoder för checkout
          </p>
        </div>
        <Button type="button" onClick={openCreate} className={`gap-2 ${primaryBtn}`}>
          <Plus className="h-4 w-4" />
          Ny kod
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <table className="w-full min-w-[960px] text-left text-sm text-gray-900 dark:text-zinc-100">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Kod</th>
              <th className="px-4 py-3 font-medium">Syfte</th>
              <th className="px-4 py-3 font-medium">Typ</th>
              <th className="px-4 py-3 font-medium">Värde</th>
              <th className="px-4 py-3 font-medium">Gäller</th>
              <th className="px-4 py-3 font-medium">Giltig från</th>
              <th className="px-4 py-3 font-medium">Giltig t.o.m.</th>
              <th className="px-4 py-3 font-medium">Max anv.</th>
              <th className="px-4 py-3 font-medium">Anv.</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-8 text-center text-gray-500 dark:text-zinc-400"
                >
                  Laddar…
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-8 text-center text-gray-500 dark:text-zinc-400"
                >
                  Inga rabattkoder ännu
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const status = statusOf(row);
                return (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900 dark:text-zinc-100">
                      {row.code}
                    </td>
                    <td className="px-4 py-3">
                      {row.purpose === "testkop" ? (
                        <span className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          Testköp
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-zinc-400">
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-zinc-300">
                      {row.type === "percent" ? "Procent" : "SEK"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-zinc-300">
                      {row.type === "percent" ? `${row.value} %` : `${row.value} kr`}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-zinc-300">
                      {row.applies_to === "order" ? "Hela ordern" : "Per artikel"}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-zinc-300">
                      {formatDate(row.valid_from)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-zinc-300">
                      {formatDate(row.valid_until)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-zinc-300">
                      {row.max_uses ?? "∞"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="tabular-nums text-gray-900 underline-offset-2 hover:underline dark:text-zinc-100"
                        onClick={() => void openUses(row)}
                      >
                        {row.use_count}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusBadgeClass(status)}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={ghostIconBtn}
                          onClick={() => openEdit(row)}
                          title="Redigera"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Redigera</span>
                        </Button>
                        {row.active ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={ghostIconBtn}
                            onClick={() => void deactivate(row)}
                            title="Inaktivera"
                          >
                            <Power className="h-3.5 w-3.5" />
                            <span className="sr-only">Inaktivera</span>
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={ghostIconBtn}
                          onClick={() => void copyCode(row.code)}
                          title="Kopiera kod"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span className="sr-only">Kopiera kod</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-gray-200 bg-white text-gray-900 sm:max-w-lg dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {editing ? "Redigera rabattkod" : "Ny rabattkod"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dc-code" className={labelClass}>
                Kod
              </Label>
              <Input
                id="dc-code"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="TESTKÖP50"
                className={`${fieldClass} font-mono uppercase`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dc-desc" className={labelClass}>
                Beskrivning
              </Label>
              <Input
                id="dc-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Intern anteckning (valfritt)"
                className={fieldClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className={labelClass}>Typ</Label>
                <div className="flex gap-3 text-sm text-gray-800 dark:text-zinc-200">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={form.type === "percent"}
                      onChange={() =>
                        setForm((f) => ({ ...f, type: "percent" }))
                      }
                    />
                    Procent
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={form.type === "sek"}
                      onChange={() => setForm((f) => ({ ...f, type: "sek" }))}
                    />
                    SEK
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dc-value" className={labelClass}>
                  Värde
                </Label>
                <div className="relative">
                  <Input
                    id="dc-value"
                    type="number"
                    min={0}
                    step="any"
                    value={form.value}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, value: e.target.value }))
                    }
                    className={`${fieldClass} pr-10`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-zinc-400">
                    {form.type === "percent" ? "%" : "kr"}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className={labelClass}>Syfte</Label>
              <div className="flex gap-4 text-sm text-gray-800 dark:text-zinc-200">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.purpose === "normal"}
                    onChange={() =>
                      setForm((f) => ({ ...f, purpose: "normal" }))
                    }
                  />
                  Normal
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.purpose === "testkop"}
                    onChange={() =>
                      setForm((f) => ({ ...f, purpose: "testkop" }))
                    }
                  />
                  Testköp
                </label>
              </div>
              {form.purpose === "testkop" ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Vid användning flaggas ordern som testköp och användaren
                  exkluderas automatiskt från vanlig analytics/metrics.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label className={labelClass}>Gäller</Label>
              <div className="flex gap-4 text-sm text-gray-800 dark:text-zinc-200">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.applies_to === "order"}
                    onChange={() =>
                      setForm((f) => ({ ...f, applies_to: "order" }))
                    }
                  />
                  Hela ordern
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.applies_to === "item"}
                    onChange={() =>
                      setForm((f) => ({ ...f, applies_to: "item" }))
                    }
                  />
                  Per artikel
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dc-max" className={labelClass}>
                  Max antal användningar totalt
                </Label>
                <Input
                  id="dc-max"
                  type="number"
                  min={1}
                  value={form.max_uses}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, max_uses: e.target.value }))
                  }
                  placeholder="Obegränsat"
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dc-max-user" className={labelClass}>
                  Max per användare
                </Label>
                <Input
                  id="dc-max-user"
                  type="number"
                  min={1}
                  value={form.max_uses_per_user}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      max_uses_per_user: e.target.value,
                    }))
                  }
                  placeholder="Obegränsat"
                  className={fieldClass}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dc-email" className={labelClass}>
                Knuten till specifik användare
              </Label>
              <Input
                id="dc-email"
                type="email"
                value={form.user_email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, user_email: e.target.value }))
                }
                placeholder="e-post (tomt = alla användare)"
                className={fieldClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dc-from" className={labelClass}>
                  Giltig från
                </Label>
                <Input
                  id="dc-from"
                  type="date"
                  value={form.valid_from}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, valid_from: e.target.value }))
                  }
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dc-until" className={labelClass}>
                  Giltig t.o.m.
                </Label>
                <Input
                  id="dc-until"
                  type="date"
                  value={form.valid_until}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, valid_until: e.target.value }))
                  }
                  className={fieldClass}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className={outlineBtn}
              onClick={() => setFormOpen(false)}
            >
              Avbryt
            </Button>
            <Button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className={primaryBtn}
            >
              {saving ? "Sparar…" : editing ? "Spara" : "Skapa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={usesOpen} onOpenChange={setUsesOpen}>
        <SheetContent className="w-full overflow-y-auto border-gray-200 bg-white text-gray-900 sm:max-w-md dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50">
          <SheetHeader>
            <SheetTitle className="text-gray-900 dark:text-white">
              Användningar{usesFor ? ` — ${usesFor.code}` : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            {usesLoading ? (
              <p className="text-sm text-gray-500 dark:text-zinc-400">Laddar…</p>
            ) : uses.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Ingen användning ännu
              </p>
            ) : (
              <table className="w-full text-left text-sm text-gray-900 dark:text-zinc-100">
                <thead className="text-xs text-gray-500 dark:text-zinc-400">
                  <tr>
                    <th className="pb-2 font-medium">E-post</th>
                    <th className="pb-2 font-medium">Reservation</th>
                    <th className="pb-2 font-medium">Rabatt</th>
                    <th className="pb-2 font-medium">Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {uses.map((u) => (
                    <tr key={u.id} className="border-t border-gray-100 dark:border-zinc-800">
                      <td className="py-2 pr-2 break-all">
                        {u.user_email ?? u.user_id.slice(0, 8)}
                      </td>
                      <td className="py-2 pr-2 font-mono text-xs">
                        {u.reservation_id.slice(0, 8)}…
                      </td>
                      <td className="py-2 pr-2 tabular-nums">
                        {Math.round(Number(u.discount_amount_sek))} kr
                      </td>
                      <td className="py-2 tabular-nums text-xs">
                        {formatDate(u.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
