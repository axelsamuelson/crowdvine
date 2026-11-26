/** Hover intent before a PDP prefetch. Faster than this is treated as a scroll. */
export const HOVER_PREFETCH_DELAY_MS = 150;

type TimerId = number;

let chain: Promise<void> = Promise.resolve();

/** Test isolation — the queue is process-wide so one hover cannot stampede. */
export function resetHoverPrefetchQueueForTests(): void {
  chain = Promise.resolve();
}

/**
 * Prefetch `href` only after the pointer has rested for `delayMs`.
 * At most one prefetch runs at a time. Cancelling (pointer left) drops the
 * pending timer and skips a prefetch that has not started.
 */
export function scheduleHoverPrefetch(options: {
  href: string;
  prefetch: (href: string) => void | Promise<unknown>;
  delayMs?: number;
  schedule?: (fn: () => void, ms: number) => TimerId;
  cancelSchedule?: (id: TimerId) => void;
}): { cancel: () => void } {
  const href = options.href;
  if (!href) return { cancel: () => {} };

  let cancelled = false;
  const delay = options.delayMs ?? HOVER_PREFETCH_DELAY_MS;
  const schedule =
    options.schedule ??
    ((fn, ms) => setTimeout(fn, ms) as unknown as TimerId);
  const cancelSchedule =
    options.cancelSchedule ?? ((id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>));

  const timer = schedule(() => {
    if (cancelled) return;
    chain = chain.then(async () => {
      if (cancelled) return;
      try {
        await options.prefetch(href);
      } catch {
        // Prefetch is opportunistic.
      }
    });
  }, delay);

  return {
    cancel: () => {
      cancelled = true;
      cancelSchedule(timer);
    },
  };
}
