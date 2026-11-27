"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/lib/hooks/use-translations";
import { countryLabel, countryPolicy } from "@/lib/market/country-registry";
import {
  WAITLIST_OPEN_EVENT,
  type WaitlistOpenDetail,
} from "@/lib/market/ship-to-client";

export function WaitlistHost() {
  const { context } = useTranslations();
  const locale = context.locale === "en" ? "en" : "sv";
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<WaitlistOpenDetail | null>(null);
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function onOpen(event: Event) {
      const next = (event as CustomEvent<WaitlistOpenDetail>).detail;
      if (!next?.countryCode) return;
      setDetail(next);
      setMessage(null);
      setNewsletter(false);
      setOpen(true);
      void fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "shown",
          countryCode: next.countryCode,
          locale,
          lines: [{ wine_id: next.wineId, quantity: next.quantity }],
        }),
      });
    }
    window.addEventListener(WAITLIST_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(WAITLIST_OPEN_EVENT, onOpen);
  }, [locale]);

  const place = countryLabel(detail?.countryCode, locale);
  const headline =
    locale === "sv"
      ? `Vi levererar inte till ${place} än.`
      : `We don't deliver to ${place} yet.`;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!detail) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          countryCode: detail.countryCode,
          dateOfBirth: dob,
          locale,
          newsletterOptIn: newsletter,
          lines: [{ wine_id: detail.wineId, quantity: detail.quantity }],
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (json.ok) {
        setMessage(
          locale === "sv"
            ? "Du står på väntelistan. Vi har skickat ett mejl."
            : "You're on the waitlist. We sent a confirmation email.",
        );
      } else {
        setMessage(json.message ?? headline);
      }
    } finally {
      setPending(false);
    }
  }

  const age = countryPolicy(detail?.countryCode).ageMinimum;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{headline}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(event) => void submit(event)}>
          <label className="block text-sm">
            {locale === "sv" ? "E-post" : "Email"}
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block text-sm">
            {locale === "sv" ? "Födelsedatum" : "Date of birth"}
            <Input
              type="date"
              required
              value={dob}
              onChange={(event) => setDob(event.target.value)}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            {locale === "sv"
              ? `Åldersgräns ${age} år.`
              : `Age limit ${age}.`}
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={newsletter}
              onChange={(event) => setNewsletter(event.target.checked)}
            />
            <span>
              {locale === "sv"
                ? "Skicka nyhetsbrev. Krysset är inte förifyllt."
                : "Send the newsletter. This box starts unchecked."}
            </span>
          </label>
          {message ? <p className="text-sm">{message}</p> : null}
          <Button type="submit" disabled={pending}>
            {locale === "sv" ? "Ställ mig på väntelistan" : "Join the waitlist"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
