/**
 * Preview/audit DBs may use a stub `user_events` (e.g. only
 * id/user_id/event_name/event_metadata/created_at) while the app posts the
 * production shape (event_type, session_id, …). Once a 400/column error is
 * seen, stop all further inserts for this tab — including concurrent keepalive.
 */

const STORAGE_KEY = "pact_ue_schema_lag";

let memoryFlag = false;

export function isUserEventsSchemaLag(): boolean {
  if (memoryFlag) return true;
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage?.getItem(STORAGE_KEY) === "1") {
      memoryFlag = true;
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function markUserEventsSchemaLag(): void {
  memoryFlag = true;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage?.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore
  }
}

/** True when PostgREST / Postgres error looks like a schema/column mismatch. */
export function isUserEventsSchemaError(message: string | null | undefined): boolean {
  const m = String(message ?? "");
  return /visitor_id|country_code|event_type|event_category|session_id|page_url|user_agent|referrer|event_name|\bhost\b|\bsite\b|schema cache|Could not find|PGRST|column/i.test(
    m,
  );
}
