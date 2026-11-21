"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Pencil, Warehouse, Wine } from "lucide-react";
import { toast } from "sonner";
import type { KallorSourceRow } from "@/lib/admin/kallor-sources";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_FORM_FIELDS_CLASS,
  ADMIN_HELP_TEXT_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_OUTLINE_BUTTON_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from "@/lib/admin-form-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DASHBOARD_CARD =
  "rounded-xl border border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]";

type EditForm = {
  name: string;
  contact_email: string;
  address_street: string;
  address_postcode: string;
  address_city: string;
  address_country: string;
  contact_locale: string;
};

function emptyForm(row: KallorSourceRow): EditForm {
  return {
    name: row.name,
    contact_email: row.contactEmail ?? "",
    address_street: row.addressStreet ?? "",
    address_postcode: row.addressPostcode ?? "",
    address_city: row.addressCity ?? "",
    address_country: row.addressCountry ?? "",
    contact_locale: row.contactLocale || "fr",
  };
}

function MissingWarnings({ row }: { row: KallorSourceRow }) {
  if (!row.emailMissing && !row.addressMissing) return null;
  return (
    <div className="mt-1.5 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs dark:border-amber-800/50 dark:bg-amber-900/20">
      {row.emailMissing ? (
        <p className="flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          E-post saknas
        </p>
      ) : null}
      {row.addressMissing ? (
        <p className="flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Adress saknas
        </p>
      ) : null}
      {!row.recordExists && row.kind === "wholesaler" ? (
        <p className="text-amber-800 dark:text-amber-300/90">
          Ingen sparad grossistrad ännu — fyll i och spara.
        </p>
      ) : null}
    </div>
  );
}

function SourceKindLabel({ kind }: { kind: KallorSourceRow["kind"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-zinc-300">
      {kind === "producer" ? (
        <Wine className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Warehouse className="h-3.5 w-3.5 shrink-0" />
      )}
      {kind === "producer" ? "Producent" : "Grossist"}
    </span>
  );
}

function FieldOrDash({
  value,
  missing,
}: {
  value: string | null | undefined;
  missing?: boolean;
}) {
  const v = String(value ?? "").trim();
  if (!v || missing) {
    return (
      <span className="text-amber-800 dark:text-amber-300">—</span>
    );
  }
  return <>{v}</>;
}

function MobileFieldRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-gray-100 pt-2 dark:border-zinc-800/50">
      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-500">
        {label}
      </span>
      <div className="break-words text-sm text-gray-900 dark:text-zinc-100">
        {children}
      </div>
    </div>
  );
}

export function KallorSourcesTable({ sources }: { sources: KallorSourceRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<KallorSourceRow | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const missingCount = useMemo(
    () =>
      sources.filter((s) => s.emailMissing || s.addressMissing).length,
    [sources],
  );

  const openEdit = (row: KallorSourceRow) => {
    if (row.kind !== "wholesaler") return;
    setEditing(row);
    setForm(emptyForm(row));
  };

  const closeEdit = () => {
    setEditing(null);
    setForm(null);
  };

  const save = async () => {
    if (!editing || !form || editing.kind !== "wholesaler") return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/wholesaler-sources/${encodeURIComponent(editing.sourceKey)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            contact_email: form.contact_email,
            address_street: form.address_street,
            address_postcode: form.address_postcode,
            address_city: form.address_city,
            address_country: form.address_country,
            contact_locale: form.contact_locale,
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "Kunde inte spara");
        return;
      }
      toast.success("Grossist sparad");
      closeEdit();
      router.refresh();
    } catch {
      toast.error("Kunde inte spara");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {missingCount > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-200">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {missingCount} källa{missingCount === 1 ? "" : "or"} saknar e-post
            eller adress
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300/90">
            Källmejl skickas aldrig medan SOURCE_EMAILS_ENABLED är AV. Fyll i
            kontaktuppgifter innan strömbrytaren slås på.
          </p>
        </div>
      ) : null}

      <div className={`${DASHBOARD_CARD} overflow-hidden`}>
        <div className="border-b border-gray-200 p-6 dark:border-[#1F1F23]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Alla källor med aktiva viner
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
            {sources.length} källa{sources.length === 1 ? "" : "or"} ·
            producenter och grossister
          </p>
        </div>

        {sources.length === 0 ? (
          <p className="p-6 text-sm text-gray-600 dark:text-zinc-400">
            Inga källor med aktiva viner just nu.
          </p>
        ) : (
          <>
            {/* Mobile: stacked cards (same pattern as admin wines list) */}
            <ul className="divide-y divide-gray-100 dark:divide-zinc-800/50 md:hidden">
              {sources.map((row) => (
                <li key={row.sourceKey} className="space-y-3 p-4">
                  <div className="min-w-0">
                    <div className="font-medium leading-snug text-gray-900 dark:text-zinc-100">
                      {row.name}
                    </div>
                    <p className="mt-0.5 break-all font-mono text-[11px] text-gray-500 dark:text-zinc-500">
                      {row.sourceKey}
                    </p>
                    <div className="mt-1.5">
                      <SourceKindLabel kind={row.kind} />
                    </div>
                    <MissingWarnings row={row} />
                  </div>

                  <div className="space-y-2">
                    <MobileFieldRow label="E-post">
                      <FieldOrDash
                        value={row.contactEmail}
                        missing={row.emailMissing}
                      />
                    </MobileFieldRow>
                    <MobileFieldRow label="Adress">
                      <FieldOrDash
                        value={row.addressDisplay}
                        missing={row.addressMissing}
                      />
                    </MobileFieldRow>
                    <MobileFieldRow label="Språk">
                      <span className="uppercase">{row.contactLocale}</span>
                    </MobileFieldRow>
                    <MobileFieldRow label="Viner">
                      {row.liveWineCount}
                    </MobileFieldRow>
                  </div>

                  {row.kind === "wholesaler" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={`h-10 w-full ${ADMIN_OUTLINE_BUTTON_CLASS}`}
                      onClick={() => openEdit(row)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Redigera
                    </Button>
                  ) : row.producerId ? (
                    <Link
                      href={`/admin/producers/${row.producerId}`}
                      className="block"
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={`h-10 w-full ${ADMIN_OUTLINE_BUTTON_CLASS}`}
                      >
                        Producent
                      </Button>
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>

            {/* Desktop table from md up */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:bg-zinc-900/70">
                    <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                      Källa
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                      Typ
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                      E-post
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                      Adress
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                      Språk
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                      Viner
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium text-gray-600 dark:text-zinc-400">
                      Åtgärd
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((row) => (
                    <TableRow
                      key={row.sourceKey}
                      className="border-b border-gray-100 hover:bg-gray-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/50"
                    >
                      <TableCell className="align-top">
                        <div className="font-medium text-gray-900 dark:text-zinc-100">
                          {row.name}
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-gray-500 dark:text-zinc-500">
                          {row.sourceKey}
                        </p>
                        <MissingWarnings row={row} />
                      </TableCell>
                      <TableCell className="align-top">
                        <SourceKindLabel kind={row.kind} />
                      </TableCell>
                      <TableCell className="align-top text-sm text-gray-700 dark:text-zinc-300">
                        <FieldOrDash
                          value={row.contactEmail}
                          missing={row.emailMissing}
                        />
                      </TableCell>
                      <TableCell className="align-top text-sm text-gray-700 dark:text-zinc-300">
                        <FieldOrDash
                          value={row.addressDisplay}
                          missing={row.addressMissing}
                        />
                      </TableCell>
                      <TableCell className="align-top text-sm uppercase text-gray-700 dark:text-zinc-300">
                        {row.contactLocale}
                      </TableCell>
                      <TableCell className="align-top text-sm text-gray-700 dark:text-zinc-300">
                        {row.liveWineCount}
                      </TableCell>
                      <TableCell className="align-top text-right">
                        {row.kind === "wholesaler" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={ADMIN_OUTLINE_BUTTON_CLASS}
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Redigera
                          </Button>
                        ) : row.producerId ? (
                          <Link href={`/admin/producers/${row.producerId}`}>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={ADMIN_OUTLINE_BUTTON_CLASS}
                            >
                              Producent
                            </Button>
                          </Link>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <DialogContent className="max-w-lg border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-zinc-50">
              Redigera grossist
            </DialogTitle>
            <DialogDescription className={ADMIN_HELP_TEXT_CLASS}>
              Packningsnyckel:{" "}
              <span className="font-mono">{editing?.sourceKey}</span>
            </DialogDescription>
          </DialogHeader>
          {form ? (
            <div className={`${ADMIN_FORM_FIELDS_CLASS} space-y-3`}>
              <div className="space-y-1.5">
                <Label className={ADMIN_LABEL_CLASS} htmlFor="ws-name">
                  Namn
                </Label>
                <Input
                  id="ws-name"
                  className={ADMIN_FIELD_CLASS}
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className={ADMIN_LABEL_CLASS} htmlFor="ws-email">
                  Kontaktmejl
                </Label>
                <Input
                  id="ws-email"
                  type="email"
                  className={ADMIN_FIELD_CLASS}
                  value={form.contact_email}
                  onChange={(e) =>
                    setForm({ ...form, contact_email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className={ADMIN_LABEL_CLASS} htmlFor="ws-street">
                  Gata
                </Label>
                <Input
                  id="ws-street"
                  className={ADMIN_FIELD_CLASS}
                  value={form.address_street}
                  onChange={(e) =>
                    setForm({ ...form, address_street: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className={ADMIN_LABEL_CLASS} htmlFor="ws-postcode">
                    Postnummer
                  </Label>
                  <Input
                    id="ws-postcode"
                    className={ADMIN_FIELD_CLASS}
                    value={form.address_postcode}
                    onChange={(e) =>
                      setForm({ ...form, address_postcode: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={ADMIN_LABEL_CLASS} htmlFor="ws-city">
                    Ort
                  </Label>
                  <Input
                    id="ws-city"
                    className={ADMIN_FIELD_CLASS}
                    value={form.address_city}
                    onChange={(e) =>
                      setForm({ ...form, address_city: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className={ADMIN_LABEL_CLASS} htmlFor="ws-country">
                    Land
                  </Label>
                  <Input
                    id="ws-country"
                    className={ADMIN_FIELD_CLASS}
                    value={form.address_country}
                    onChange={(e) =>
                      setForm({ ...form, address_country: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={ADMIN_LABEL_CLASS} htmlFor="ws-locale">
                    Språk
                  </Label>
                  <Input
                    id="ws-locale"
                    className={ADMIN_FIELD_CLASS}
                    value={form.contact_locale}
                    onChange={(e) =>
                      setForm({ ...form, contact_locale: e.target.value })
                    }
                    placeholder="fr"
                  />
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className={ADMIN_OUTLINE_BUTTON_CLASS}
              onClick={closeEdit}
              disabled={saving}
            >
              Avbryt
            </Button>
            <Button
              type="button"
              className={`${ADMIN_PRIMARY_BUTTON_CLASS} bg-gray-900 text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200`}
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? "Sparar…" : "Spara"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
