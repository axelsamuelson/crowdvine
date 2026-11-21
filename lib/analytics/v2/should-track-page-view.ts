/**
 * Re-export E4 helpers for call sites that import from v2/.
 * Canonical implementation: @/lib/analytics/should-track-page-view
 */

export {
  shouldTrackPageViewNow,
  waitForTrackableDocument,
  type DocumentTrackingState,
  type WaitForTrackableDocumentOptions,
} from "@/lib/analytics/should-track-page-view";

import {
  shouldTrackPageViewNow,
  waitForTrackableDocument,
  type DocumentTrackingState,
} from "@/lib/analytics/should-track-page-view";

/** Alias matching an older draft API. */
export type DocumentLike = DocumentTrackingState;

export function isDocumentTrackableNow(doc: DocumentLike): boolean {
  return shouldTrackPageViewNow(doc);
}

/**
 * Fire `track` when the document becomes trackable. Returns a cancel fn.
 */
export function whenPageViewAllowed(
  doc: DocumentLike,
  track: () => void,
): () => void {
  let cancelled = false;
  void waitForTrackableDocument({ doc }).then((ok) => {
    if (!cancelled && ok) track();
  });
  return () => {
    cancelled = true;
  };
}
