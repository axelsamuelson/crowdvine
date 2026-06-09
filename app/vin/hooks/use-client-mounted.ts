"use client";

import { useSyncExternalStore } from "react";

/** True only after the client has mounted — false during SSR and hydration. */
export function useClientMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
