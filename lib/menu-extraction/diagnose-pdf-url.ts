/**
 * Test whether a PDF URL is directly reachable (no browser session).
 * Used by admin diagnose-pdf API only.
 */

export interface DiagnosePdfResult {
  directFetchStatus: number | null;
  directFetchWorks: boolean;
  contentType: string | null;
  requiresSession: boolean | null;
  notes: string;
}

export async function diagnosePdfUrl(pdfUrl: string): Promise<DiagnosePdfResult> {
  let directFetchStatus: number | null = null;
  let contentType: string | null = null;
  try {
    const res = await fetch(pdfUrl, { redirect: "follow" });
    directFetchStatus = res.status;
    contentType = res.headers.get("content-type");
    const ok = res.ok;
    const requiresSession =
      directFetchStatus === 403 || directFetchStatus === 401
        ? true
        : ok
          ? false
          : null;
    return {
      directFetchStatus,
      directFetchWorks: ok,
      contentType,
      requiresSession,
      notes: ok
        ? "Direct fetch succeeded; session may not be required."
        : directFetchStatus === 403 || directFetchStatus === 401
          ? "Direct fetch blocked (403/401); likely requires browser session (Chromium)."
          : `Direct fetch returned ${directFetchStatus}.`,
    };
  } catch (e) {
    return {
      directFetchStatus: null,
      directFetchWorks: false,
      contentType: null,
      requiresSession: null,
      notes: `Direct fetch failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
