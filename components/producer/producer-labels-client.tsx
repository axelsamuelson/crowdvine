"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Label {
  id: string;
  bottles: number;
  instabee_label_url: string;
  instabee_tracking_url: string | null;
  instabee_label_created_at: string;
  user_addresses: {
    full_name: string;
    address_city: string;
    address_postcode: string;
  } | null;
}

export default function ProducerLabelsClient() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/producer/labels")
      .then((r) => r.json())
      .then((d: { labels?: Label[] }) => setLabels(d.labels ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="p-6 text-zinc-400">Laddar fraktsedlar...</p>;
  }

  if (labels.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Fraktsedlar</h1>
        <p className="text-zinc-400">
          Inga fraktsedlar är genererade ännu.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Fraktsedlar</h1>
      <div className="space-y-3">
        {labels.map((label) => (
          <div
            key={label.id}
            className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-700 p-4"
          >
            <div>
              <p className="font-medium">
                {label.user_addresses?.full_name ?? "Kund"}
              </p>
              <p className="text-sm text-zinc-400">
                {label.user_addresses?.address_postcode}{" "}
                {label.user_addresses?.address_city} — {label.bottles} flaskor
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {new Date(label.instabee_label_created_at).toLocaleDateString(
                  "sv-SE",
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {label.instabee_tracking_url ? (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={label.instabee_tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Spåra
                  </a>
                </Button>
              ) : null}
              <Button size="sm" asChild>
                <a
                  href={label.instabee_label_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  Ladda ned
                </a>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
