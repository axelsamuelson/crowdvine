/**
 * Only ONE open shared pallet at a time for a given accepting scope.
 * New orders must go into that open pallet (no parallel open pallets).
 */

export type OpenPalletCandidate = {
  id: string;
  status: string;
  createdAt: string | Date;
};

const OPEN_LIKE = new Set(["open", "consolidating", "complete"]);

export function isAcceptingSharedPalletStatus(
  status: string | null | undefined,
): boolean {
  return OPEN_LIKE.has(String(status ?? "").trim().toLowerCase());
}

/**
 * Given accepting-status pallets for a route, pick the single open pallet
 * (oldest first). Extra open pallets are violations to close/block.
 */
export function selectSingleOpenSharedPallet(
  candidates: OpenPalletCandidate[],
): {
  openPalletId: string | null;
  extras: string[];
  ok: boolean;
} {
  const accepting = candidates
    .filter((c) => isAcceptingSharedPalletStatus(c.status))
    .slice()
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  if (accepting.length === 0) {
    return { openPalletId: null, extras: [], ok: true };
  }

  const [first, ...rest] = accepting;
  return {
    openPalletId: first!.id,
    extras: rest.map((r) => r.id),
    ok: rest.length === 0,
  };
}

/**
 * Assignment helper: always prefer the existing single open pallet id.
 */
export function resolveOrderPalletAssignment(input: {
  existingOpenPalletId: string | null;
  createNewIfMissing: boolean;
}): { palletId: string | null; shouldCreate: boolean } {
  if (input.existingOpenPalletId) {
    return { palletId: input.existingOpenPalletId, shouldCreate: false };
  }
  if (input.createNewIfMissing) {
    return { palletId: null, shouldCreate: true };
  }
  return { palletId: null, shouldCreate: false };
}
