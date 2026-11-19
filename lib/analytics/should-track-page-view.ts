/**
 * E4: only fire page_view when the document is visible and not prerendering.
 * Used by PageViewTracker; unit-tested with a document-like stub.
 */

export type DocumentTrackingState = {
  visibilityState?: string;
  prerendering?: boolean;
  addEventListener?: (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) => void;
  removeEventListener?: (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ) => void;
};

export type WaitForTrackableDocumentOptions = {
  /** Injected document (defaults to global document when available). */
  doc?: DocumentTrackingState | null;
  /** Max wait; resolves false on timeout. Default 30s. */
  timeoutMs?: number;
};

function getDoc(
  override?: DocumentTrackingState | null,
): DocumentTrackingState | null {
  if (override !== undefined) return override;
  if (typeof document === "undefined") return null;
  return document as unknown as DocumentTrackingState;
}

/** True when we may emit page_view immediately. */
export function shouldTrackPageViewNow(
  doc?: DocumentTrackingState | null,
): boolean {
  const d = getDoc(doc);
  if (!d) return false;
  if (d.prerendering === true) return false;
  if (d.visibilityState != null && d.visibilityState !== "visible") {
    return false;
  }
  return true;
}

/**
 * Resolves when the document is visible and not prerendering.
 * - If already trackable → resolves true immediately.
 * - If document.prerendering → waits once for `prerenderingchange`.
 * - If visibilityState !== 'visible' → waits for `visibilitychange`.
 */
export function waitForTrackableDocument(
  opts: WaitForTrackableDocumentOptions = {},
): Promise<boolean> {
  const d = getDoc(opts.doc);
  if (!d) return Promise.resolve(false);
  if (shouldTrackPageViewNow(d)) return Promise.resolve(true);

  const timeoutMs = opts.timeoutMs ?? 30_000;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(ok);
    };

    const onPrerenderingChange = () => {
      if (d.prerendering === true) return;
      if (shouldTrackPageViewNow(d)) finish(true);
      else if (d.visibilityState !== "visible") {
        // Still hidden — keep waiting for visibility.
      }
    };

    const onVisibilityChange = () => {
      if (shouldTrackPageViewNow(d)) finish(true);
    };

    const cleanup = () => {
      d.removeEventListener?.("prerenderingchange", onPrerenderingChange);
      d.removeEventListener?.("visibilitychange", onVisibilityChange);
      clearTimeout(timer);
    };

    if (d.prerendering === true) {
      d.addEventListener?.("prerenderingchange", onPrerenderingChange);
    }
    if (d.visibilityState != null && d.visibilityState !== "visible") {
      d.addEventListener?.("visibilitychange", onVisibilityChange);
    }

    const timer = setTimeout(() => finish(false), timeoutMs);
  });
}
