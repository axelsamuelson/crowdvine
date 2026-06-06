import { sendEmail } from "@/lib/email";

interface LabelEmailParams {
  producerEmail: string;
  producerName: string;
  palletId: string;
  labels: {
    reservationId: string;
    recipientName: string;
    bottles: number;
    labelUrl: string;
  }[];
}

export function buildLabelsEmailHtml(params: LabelEmailParams): string {
  const rows = params.labels
    .map(
      (l) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">
          ${l.recipientName}
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee">
          ${l.bottles} flaskor
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee">
          <a href="${l.labelUrl}" 
             style="color:#000;font-weight:bold">
            Ladda ned fraktsedel
          </a>
        </td>
      </tr>`,
    )
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2>Fraktsedlar redo — Pall ${params.palletId.slice(0, 8)}</h2>
      <p>Hej ${params.producerName},</p>
      <p>
        Alla betalningar är bekräftade. Nedan finns fraktsedlar 
        för varje order. Skriv ut och sätt på respektive vinbox 
        innan upphämtning.
      </p>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;text-align:left">Kund</th>
            <th style="padding:8px;text-align:left">Antal</th>
            <th style="padding:8px;text-align:left">Fraktsedel</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:24px;color:#666;font-size:12px">
        PACT — pactwines.com
      </p>
    </div>`;
}

export async function sendLabelsEmail(
  params: LabelEmailParams,
): Promise<void> {
  const html = buildLabelsEmailHtml(params);
  await sendEmail({
    to: params.producerEmail,
    subject: `Fraktsedlar redo — ${params.labels.length} ordrar`,
    html,
  });
}
