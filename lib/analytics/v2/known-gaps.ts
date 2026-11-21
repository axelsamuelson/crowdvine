/**
 * M4 etapp 1: static known-gaps list (D1–D9) for Datakvalitet.
 * Spec §3 / §10 — full DB table can replace this later.
 */

export type KnownGapStatus =
  | "open"
  | "fixing"
  | "done"
  | "wontfix"
  | "monitoring";

export type KnownGap = {
  id: string;
  code: string;
  title: string;
  status: KnownGapStatus;
  /** Linear/Cursor task id when known; null if none. */
  task_id: string | null;
  /** CamelCase alias for API consumers. */
  taskId: string | null;
  /** Optional ISO date when the gap started. */
  from: string | null;
  /** Optional ISO date when resolved. */
  to: string | null;
  /** Short explanation shown on Datakvalitet. */
  description: string;
};

function gap(
  partial: Omit<KnownGap, "taskId" | "description"> & {
    description?: string;
  },
): KnownGap {
  return {
    ...partial,
    taskId: partial.task_id,
    description: partial.description ?? partial.title,
  };
}

export const KNOWN_GAPS: KnownGap[] = [
  gap({
    id: "D1",
    code: "D1",
    title:
      "Chrome iOS-förhandsladdning: Google → /wine utan query blåser upp sessioner",
    status: "fixing",
    task_id: null,
    from: "2026-11-02",
    to: null,
    description:
      "Provisorisk regel i facts (förhandsladdning). E4 stoppar nya; E5 flaggar historik (ingen DELETE).",
  }),
  gap({
    id: "D1b",
    code: "D1b",
    title: "Geo-botmisstänkta CN/SG/HK",
    status: "fixing",
    task_id: null,
    from: null,
    to: null,
    description:
      "Heuristik: land CN/SG/HK + direkt + <1 s + ≤2 events + ej engagerad. Hela länder stängs inte av.",
  }),
  gap({
    id: "D2",
    code: "D2",
    title:
      "is_returning_visitor opålitlig (ensureVisitorIdentity anropas två gånger)",
    status: "fixing",
    task_id: null,
    from: null,
    to: null,
  }),
  gap({
    id: "D3",
    code: "D3",
    title: "ip_address lagras aldrig — ingen kontroll av datacenter-IP",
    status: "open",
    task_id: "1a13eb6f",
    from: null,
    to: null,
  }),
  gap({
    id: "D4",
    code: "D4",
    title:
      "UTM first-touch: vyn läser fel fält; utm_content och utm_term sparas inte",
    status: "open",
    task_id: "3601f8cc",
    from: null,
    to: null,
  }),
  gap({
    id: "D5",
    code: "D5",
    title:
      "Köp saknar session_id; reservation_completed skickas inte",
    status: "open",
    task_id: "8f773fc6",
    from: null,
    to: null,
  }),
  gap({
    id: "D6",
    code: "D6",
    title: "site och host är NULL före 2026-11-10 — härleds från page_url",
    status: "done",
    task_id: null,
    from: null,
    to: "2026-11-10",
  }),
  gap({
    id: "D7",
    code: "D7",
    title: "Inga ingest-skydd: anon-nyckeln kan skriva i user_events",
    status: "open",
    task_id: "4c0db1af",
    from: null,
    to: null,
  }),
  gap({
    id: "D8",
    code: "D8",
    title: "Reservkoden i trafik-API:t saknar två filter",
    status: "open",
    task_id: null,
    from: null,
    to: null,
  }),
  gap({
    id: "D9",
    code: "D9",
    title: "Ingen vakt när ett event tystnar (t.ex. add_to_cart)",
    status: "open",
    task_id: null,
    from: null,
    to: null,
  }),
];

/** Alias expected by data-quality API. */
export const ANALYTICS_KNOWN_GAPS = KNOWN_GAPS;

export function getKnownGap(code: string): KnownGap | undefined {
  return KNOWN_GAPS.find((g) => g.code === code || g.id === code);
}
