"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  parseZoneStatusPayload,
  type ZoneStatusPayload,
} from "@/lib/pallet/zone-status";

type FetchPhase = "loading" | "ready" | "error";

type PalletZoneStatusContextValue = {
  data: ZoneStatusPayload | null;
  phase: FetchPhase;
  isInitialFetch: boolean;
  isUnavailable: boolean;
  showBar: boolean;
  allowEarlyBird: boolean;
  allowEta: boolean;
};

const PalletZoneStatusContext = createContext<PalletZoneStatusContextValue | null>(
  null,
);

export function PalletZoneStatusProvider({
  productHandle,
  children,
}: {
  productHandle: string;
  children: ReactNode;
}) {
  const [data, setData] = useState<ZoneStatusPayload | null>(null);
  const [phase, setPhase] = useState<FetchPhase>("loading");

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    function isAbortLike(e: unknown): boolean {
      if (cancelled) return true;
      if (e instanceof DOMException && e.name === "AbortError") return true;
      if (e instanceof Error && e.name === "AbortError") return true;
      return false;
    }

    async function load() {
      const handle = productHandle.trim();
      if (!handle) {
        if (!cancelled) {
          setPhase("error");
          setData(null);
        }
        return;
      }

      try {
        const res = await fetch(
          `/api/pallet/zone-status?productHandle=${encodeURIComponent(handle)}`,
          { method: "GET", cache: "no-store", signal: ac.signal },
        );
        const json: unknown = await res.json();
        const parsed = parseZoneStatusPayload(json);
        if (cancelled) return;

        if (!parsed) {
          setPhase((p) => (p === "loading" ? "error" : p));
          return;
        }
        setData(parsed);
        setPhase("ready");
      } catch (e) {
        if (isAbortLike(e)) return;
        if (!cancelled) {
          setPhase((p) => (p === "loading" ? "error" : p));
        }
      }
    }

    void load();
    const id = window.setInterval(() => {
      void load();
    }, 60_000);

    return () => {
      cancelled = true;
      ac.abort();
      window.clearInterval(id);
    };
  }, [productHandle]);

  const value = useMemo((): PalletZoneStatusContextValue => {
    const isUnavailable = data?.dropState === "unavailable";
    const showBar = data?.showProgressBar !== false;
    const allowEarlyBird =
      !isUnavailable &&
      data?.showEarlyBird !== false &&
      (data?.discountTier ?? 0) > 0;
    const allowEta =
      !isUnavailable &&
      data?.showEarlyBird !== false &&
      data?.discountTier === 0 &&
      data?.estimatedDays !== null;

    return {
      data,
      phase,
      isInitialFetch: phase === "loading" && !data,
      isUnavailable,
      showBar,
      allowEarlyBird,
      allowEta,
    };
  }, [data, phase]);

  return (
    <PalletZoneStatusContext.Provider value={value}>
      {children}
    </PalletZoneStatusContext.Provider>
  );
}

export function usePalletZoneStatus(): PalletZoneStatusContextValue {
  const ctx = useContext(PalletZoneStatusContext);
  if (!ctx) {
    throw new Error(
      "usePalletZoneStatus must be used within PalletZoneStatusProvider",
    );
  }
  return ctx;
}
