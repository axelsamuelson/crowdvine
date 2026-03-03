import type { InvoiceData } from "@/types/invoice";

const STORAGE_KEY = "crowdvine-invoice-drafts";

export interface InvoiceDraftMeta {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
}

interface StoredDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  data: InvoiceData;
}

function readDrafts(): StoredDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: StoredDraft[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // ignore
  }
}

/** List all saved drafts (metadata only). */
export function getInvoiceDrafts(): InvoiceDraftMeta[] {
  return readDrafts().map(({ id, createdAt, updatedAt, name }) => ({
    id,
    createdAt,
    updatedAt,
    name,
  }));
}

/** Get full invoice data for a draft by id. */
export function getInvoiceDraft(id: string): InvoiceData | null {
  const draft = readDrafts().find((d) => d.id === id);
  return draft?.data ?? null;
}

/** Save invoice as draft. Returns draft id. If existingId is given, updates that draft. */
export function saveInvoiceDraft(data: InvoiceData, existingId?: string): string {
  const drafts = readDrafts();
  const now = new Date().toISOString();
  const name = data.invoiceNumber
    ? `${data.invoiceNumber} – ${formatDraftDate(now)}`
    : `Utkast ${formatDraftDate(now)}`;

  if (existingId) {
    const idx = drafts.findIndex((d) => d.id === existingId);
    if (idx >= 0) {
      drafts[idx] = {
        ...drafts[idx],
        updatedAt: now,
        name,
        data,
      };
      writeDrafts(drafts);
      return existingId;
    }
  }

  const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  drafts.push({
    id,
    createdAt: now,
    updatedAt: now,
    name,
    data,
  });
  writeDrafts(drafts);
  return id;
}

/** Remove a draft by id. */
export function deleteInvoiceDraft(id: string): void {
  const drafts = readDrafts().filter((d) => d.id !== id);
  writeDrafts(drafts);
}

function formatDraftDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
