"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  InviteStoryHeader,
  inviteStory,
  inviteStoryPills,
} from "@/components/invite-landing/invite-story-ui";

const DISPLAY_CAPACITY = 180;
const GRID_COLS = 24;
const YOUR_ORDER_BOTTLES = 12;
const PLACEHOLDER_FILLED = 143;

type PalletRow = {
  id: string;
  capacity_bottles?: number;
  total_bottles_on_pallet?: number;
  status?: string;
};

type LivePalletDisplay = {
  filled: number;
  capacity: number;
  fromApi: boolean;
};

const STEPS = [
  {
    num: "01",
    pill: "Bläddra",
    pillClass: inviteStoryPills.secondary,
    title: "Viner från producenten",
    description: "Direkt från Languedoc.",
  },
  {
    num: "02",
    pill: "Reservera",
    pillClass: inviteStoryPills.muted,
    title: "Reservera, betala senare",
    description: "Debiteras när pallen avgår.",
  },
  {
    num: "03",
    pill: "Samla",
    pillClass: inviteStoryPills.accent,
    title: "Pallen fylls och skickas",
    description: "En sändning när tillräckligt många är med.",
  },
  {
    num: "04",
    pill: "Leverans",
    pillClass: inviteStoryPills.primary,
    title: "Hem till dig",
    description: "Du får besked när den är på väg.",
  },
] as const;

function pickLivePallet(rows: PalletRow[]): LivePalletDisplay {
  if (!rows.length) {
    return {
      filled: PLACEHOLDER_FILLED,
      capacity: DISPLAY_CAPACITY,
      fromApi: false,
    };
  }

  const active = rows.filter((p) => {
    const s = (p.status ?? "").toLowerCase();
    return s !== "shipped" && s !== "delivered";
  });
  const pool = active.length > 0 ? active : rows;
  const best = [...pool].sort(
    (a, b) =>
      (b.total_bottles_on_pallet ?? 0) - (a.total_bottles_on_pallet ?? 0),
  )[0];

  const rawFilled = Math.max(0, best?.total_bottles_on_pallet ?? 0);
  const filled = Math.min(DISPLAY_CAPACITY, rawFilled);

  return {
    filled: filled > 0 ? filled : PLACEHOLDER_FILLED,
    capacity: DISPLAY_CAPACITY,
    fromApi: rawFilled > 0,
  };
}

function buildCellKinds(filled: number, capacity: number) {
  const totalCells = GRID_COLS * 8;
  const cap = Math.min(capacity, totalCells);
  const clampedFilled = Math.min(filled, cap);
  const yours = Math.min(YOUR_ORDER_BOTTLES, clampedFilled);
  const reserved = Math.max(0, clampedFilled - yours);

  const kinds: Array<"reserved" | "yours" | "open"> = [];
  for (let i = 0; i < totalCells; i++) {
    if (i >= cap) {
      kinds.push("open");
    } else if (i < reserved) {
      kinds.push("reserved");
    } else if (i < clampedFilled) {
      kinds.push("yours");
    } else {
      kinds.push("open");
    }
  }
  return kinds;
}

const CELL_CLASS: Record<"reserved" | "yours" | "open", string> = {
  reserved: "invite-pallet-reserved",
  yours: "invite-pallet-yours",
  open: "invite-pallet-open",
};

export function HowPactWorksSection() {
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState<LivePalletDisplay>({
    filled: PLACEHOLDER_FILLED,
    capacity: DISPLAY_CAPACITY,
    fromApi: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/pallet-data", { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as PalletRow[];
        if (!cancelled && Array.isArray(data)) {
          setLive(pickLivePallet(data));
        }
      } catch {
        if (!cancelled) {
          setLive({
            filled: PLACEHOLDER_FILLED,
            capacity: DISPLAY_CAPACITY,
            fromApi: false,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cellKinds = useMemo(
    () => buildCellKinds(live.filled, live.capacity),
    [live.filled, live.capacity],
  );

  const percent =
    live.capacity > 0
      ? Math.round((live.filled / live.capacity) * 100)
      : 0;

  return (
    <div>
      <InviteStoryHeader
        eyebrow="The model"
        title={
          <>
            Beställt <em className="italic">tillsammans</em>, skickat{" "}
            <em className="italic">tillsammans</em>
          </>
        }
        subtitle="En gemensam pall—delad frakt, en leverans från producenten."
      />

      <ol className={cn(inviteStory.stepList, "mb-14")}>
        {STEPS.map((step, i) => (
          <motion.li
            key={step.num}
            className={inviteStory.stepItem}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.45 }}
          >
            <div className={inviteStory.stepRow}>
              <span className={inviteStory.stepNum}>{step.num}</span>
              <div className="min-w-0 flex-1">
                <span
                  className={cn(inviteStory.stepPill, step.pillClass)}
                >
                  {step.pill}
                </span>
                <h3 className={inviteStory.stepTitle}>{step.title}</h3>
                <p className={inviteStory.stepBody}>{step.description}</p>
              </div>
            </div>
          </motion.li>
        ))}
      </ol>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className={inviteStory.card}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Pall just nu
          </span>
          {loading ? (
            <Skeleton className="h-6 w-32" />
          ) : (
            <span className={inviteStory.mutedNumber}>
              {live.filled}{" "}
              <span className="text-muted-foreground font-sans text-sm font-normal">
                / {live.capacity} flaskor
              </span>
            </span>
          )}
        </div>

        {loading ? (
          <Skeleton className="w-full h-[clamp(160px,28vw,224px)] rounded-lg" />
        ) : (
          <div
            className="grid gap-[3px] w-full"
            style={{
              gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
            }}
            role="img"
            aria-label={`Pallet ${percent} percent full, ${live.filled} of ${live.capacity} bottles`}
          >
            {cellKinds.map((kind, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-[2px] w-full h-[clamp(20px,4.5vw,28px)]",
                  CELL_CLASS[kind],
                )}
              />
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[2px] invite-pallet-reserved shrink-0" />
              reserverad
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[2px] invite-pallet-yours shrink-0" />
              din
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[2px] invite-pallet-open shrink-0" />
              ledig
            </span>
          </div>
          {!loading && (
            <span className="tabular-nums">{percent}% full</span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
