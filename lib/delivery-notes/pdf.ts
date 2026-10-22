import { jsPDF } from "jspdf";
import type { DeliveryNote } from "@/lib/delivery-notes/notes";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

function textOf(record: Record<string, unknown> | null, key: string): string {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function contactName(record: Record<string, unknown>): string {
  const contact = record.primary_contact;
  if (!contact || typeof contact !== "object" || Array.isArray(contact)) return "";
  const name = "name" in contact && typeof contact.name === "string" ? contact.name.trim() : "";
  return name;
}

function formatIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatQty(quantity: number): string {
  if (Number.isInteger(quantity)) return String(quantity);
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 3 }).format(quantity);
}

export function deliveryNoteFilename(note: Pick<DeliveryNote, "note_number">): string {
  return `leveranssedel-${note.note_number}.pdf`;
}

export type DeliveryNoteEmailAttachment = {
  id: string;
  note_number: string;
  invoice_id: string | null;
  invoice_number: string | null;
  filename: string;
  mime_type: "application/pdf";
  to_email: string;
  to_name: string;
  to_contact_name: string;
  delivery_date: string;
  pdf_base64: string;
  instruction: string;
};

export function deliveryNoteEmailAttachment(
  note: DeliveryNote,
  pdf: Uint8Array,
): DeliveryNoteEmailAttachment {
  return {
    id: note.id,
    note_number: note.note_number,
    invoice_id: note.invoice_id,
    invoice_number: note.invoice_number,
    filename: deliveryNoteFilename(note),
    mime_type: "application/pdf",
    to_email: textOf(note.recipient_snapshot, "email"),
    to_name: textOf(note.recipient_snapshot, "company_name"),
    to_contact_name: contactName(note.recipient_snapshot),
    delivery_date: note.delivery_date,
    pdf_base64: Buffer.from(pdf).toString("base64"),
    instruction:
      "Bifoga pdf_base64 som PDF i mejlutkastet till to_email. Skicka inte mejlet. Sedeln följer med leveransen och visar antal, inte priser.",
  };
}

/** A4 delivery note. Quantities only, so it can travel with the goods. */
export function renderDeliveryNotePdf(note: DeliveryNote): Uint8Array {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const bill = note.recipient_snapshot;
  const sender = note.sender_snapshot;
  const ship = note.ship_to;
  let y = MARGIN;

  const newPage = () => {
    pdf.addPage();
    y = MARGIN;
  };
  const ensure = (height: number) => {
    if (y + height > PAGE_H - MARGIN) newPage();
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Leveranssedel", MARGIN, y);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);
  pdf.text(`Nummer: ${note.note_number}`, MARGIN, y);
  pdf.text(`Leveransdatum: ${formatIsoDate(note.delivery_date)}`, PAGE_W - MARGIN, y, { align: "right" });
  y += 6;
  if (note.invoice_number) {
    pdf.text(`Avser faktura ${note.invoice_number}`, MARGIN, y);
    y += 6;
  }
  y += 2;
  pdf.setDrawColor(210);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  const columnW = CONTENT_W / 2 - 4;
  const block = (x: number, startY: number, title: string, lines: string[]): number => {
    let cursor = startY;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 90);
    pdf.text(title, x, cursor);
    cursor += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(30, 30, 30);
    for (const line of lines) {
      const wrapped = pdf.splitTextToSize(line, columnW);
      const rows = Array.isArray(wrapped) ? wrapped : [wrapped];
      pdf.text(rows, x, cursor);
      cursor += rows.length * 4.6;
    }
    return cursor;
  };

  const fromLines = [
    textOf(sender, "company_name"),
    textOf(sender, "org_number") ? `Org.nr: ${textOf(sender, "org_number")}` : "",
    textOf(sender, "from_name"),
    textOf(sender, "from_email"),
    textOf(sender, "from_address"),
    [textOf(sender, "from_postal_code"), textOf(sender, "from_city")].filter(Boolean).join(" "),
    textOf(sender, "from_country"),
  ].filter((line) => line.trim());

  const contact = contactName(bill);
  const toLines = [
    textOf(bill, "company_name"),
    textOf(bill, "org_number") ? `Org.nr: ${textOf(bill, "org_number")}` : "",
    textOf(bill, "address"),
    [textOf(bill, "postal_code"), textOf(bill, "city")].filter(Boolean).join(" "),
    textOf(bill, "email"),
    contact ? `Kontakt: ${contact}` : "",
  ].filter((line) => line.trim());

  const leftBottom = block(MARGIN, y, "FRÅN", fromLines);
  const rightBottom = block(MARGIN + CONTENT_W / 2 + 4, y, "LEVERERAS TILL", toLines);
  y = Math.max(leftBottom, rightBottom) + 4;

  const shipLines = ship
    ? [
        textOf(ship, "name"),
        textOf(ship, "address"),
        [textOf(ship, "postal_code"), textOf(ship, "city")].filter(Boolean).join(" "),
        textOf(ship, "country"),
        textOf(ship, "contact") ? `Kontakt: ${textOf(ship, "contact")}` : "",
      ].filter((line) => line.trim())
    : [];
  if (shipLines.length > 0) {
    ensure(8 + shipLines.length * 5);
    y = block(MARGIN, y, "LEVERANSADRESS", shipLines) + 4;
  }

  const columns = [
    { label: "Beskrivning", width: 110 },
    { label: "Årgång", width: 32 },
    { label: "Antal", width: 36 },
  ];
  const drawHeader = () => {
    ensure(10);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(40, 40, 40);
    let x = MARGIN;
    pdf.text(columns[0].label, x, y);
    x += columns[0].width;
    pdf.text(columns[1].label, x, y);
    x += columns[1].width;
    pdf.text(columns[2].label, x + columns[2].width, y, { align: "right" });
    y += 2;
    pdf.setDrawColor(40);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;
  };
  drawHeader();

  let totalQty = 0;
  for (const line of note.lines) {
    totalQty += line.quantity;
    const wrapped = pdf.splitTextToSize(line.description, columns[0].width - 2);
    const rows = Array.isArray(wrapped) ? wrapped : [wrapped];
    const rowH = Math.max(rows.length * 4.6, 6);
    if (y + rowH > PAGE_H - MARGIN) {
      newPage();
      drawHeader();
    }
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(20, 20, 20);
    pdf.text(rows, MARGIN, y);
    pdf.text(line.vintage ?? "", MARGIN + columns[0].width, y);
    pdf.text(formatQty(line.quantity), PAGE_W - MARGIN, y, { align: "right" });
    y += rowH + 1.5;
  }

  y += 2;
  pdf.setDrawColor(180);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 7;
  ensure(8);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Antal totalt", PAGE_W - MARGIN - 55, y);
  pdf.text(formatQty(totalQty), PAGE_W - MARGIN, y, { align: "right" });
  y += 8;

  if (note.notes?.trim()) {
    ensure(12);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 90);
    pdf.text("ANTECKNINGAR", MARGIN, y);
    y += 5;
    const noteLines = pdf.splitTextToSize(note.notes, CONTENT_W);
    const rows = Array.isArray(noteLines) ? noteLines : [noteLines];
    ensure(rows.length * 4.6);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(30, 30, 30);
    pdf.text(rows, MARGIN, y);
    y += rows.length * 4.6 + 4;
  }

  ensure(16);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  const footer = note.invoice_number
    ? `Leveranssedel för faktura ${note.invoice_number}. Priser står på fakturan.`
    : "Leveranssedel. Priser står på fakturan.";
  pdf.text(footer, PAGE_W / 2, y, { align: "center" });

  return new Uint8Array(pdf.output("arraybuffer"));
}
