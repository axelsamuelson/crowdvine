"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InquiryAccountOffer } from "@/components/b2b/inquiry-account-offer";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import { b2bInquiryCopy } from "@/lib/b2b/inquiry-copy";
import type { B2bInquiryPrefill } from "@/lib/b2b/inquiry-prefill";
import { validateB2bInquiryForm } from "@/lib/b2b/inquiry-validation";
import {
  clearB2bInquiryClaimToken,
  readB2bInquiryClaimToken,
  storeB2bInquiryClaimToken,
} from "@/lib/b2b/inquiry-claim-client";
import {
  trackB2bInquiryStarted,
  trackB2bInquirySubmitted,
} from "@/lib/analytics/b2b-track-client";
import { formatCartLinePrice } from "@/lib/shopping-context/format";
import { priceExclVat } from "@/lib/shopify/utils";
import { emitOnce } from "@/lib/analytics/emit-once";

type FormState = {
  companyName: string;
  organizationNumber: string;
  contactName: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  postalCode: string;
  desiredDeliveryDate: string;
  message: string;
  website: string;
};

const emptyForm: FormState = {
  companyName: "",
  organizationNumber: "",
  contactName: "",
  email: "",
  phone: "",
  deliveryAddress: "",
  postalCode: "",
  desiredDeliveryDate: "",
  message: "",
  website: "",
};

function formFromPrefill(prefill: B2bInquiryPrefill | null): FormState {
  if (!prefill) return emptyForm;
  return {
    ...emptyForm,
    companyName: prefill.companyName,
    organizationNumber: prefill.organizationNumber,
    contactName: prefill.contactName,
    email: prefill.email,
    phone: prefill.phone,
    deliveryAddress: prefill.deliveryAddress,
    postalCode: prefill.postalCode,
  };
}

export function B2bInquiryClient({
  isAuthenticated,
  prefill,
}: {
  isAuthenticated: boolean;
  prefill: B2bInquiryPrefill | null;
}) {
  const { context } = useTranslations();
  const paths = useLocalizedPaths();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, updateItem } = useCart();
  const locale = context.locale === "en" ? "en" : "sv";
  const copy = b2bInquiryCopy(locale);

  const [form, setForm] = useState<FormState>(() => formFromPrefill(prefill));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [offerAccount, setOfferAccount] = useState(false);
  const [accountLinked, setAccountLinked] = useState(false);

  const warehouseLines = useMemo(
    () =>
      (cart?.lines ?? []).filter(
        (line) => !line.source || line.source === "warehouse",
      ),
    [cart?.lines],
  );
  const hasProducerLines = (cart?.lines ?? []).some(
    (line) => line.source === "producer",
  );

  const cartTotals = useMemo(() => {
    let bottles = 0;
    let exclSum = 0;
    for (const line of warehouseLines) {
      bottles += line.quantity;
      const lineTotal = parseFloat(line.cost.totalAmount.amount || "0");
      exclSum += priceExclVat(lineTotal);
    }
    return { bottles, exclSum };
  }, [warehouseLines]);

  useEffect(() => {
    emitOnce("b2b_inquiry_started", () => {
      trackB2bInquiryStarted({
        page: "/b2b/inquiry",
        source: "checkout_replacement",
        wine_count: warehouseLines.length,
        est_bottles: warehouseLines.reduce((s, l) => s + l.quantity, 0),
      });
    });
  }, [warehouseLines]);

  // After login/signup return (?claimed=1), link guest inquiry if token present.
  useEffect(() => {
    if (searchParams.get("claimed") !== "1") return;
    if (!isAuthenticated) return;
    const token = readB2bInquiryClaimToken();
    if (!token) return;
    void (async () => {
      const res = await fetch("/api/b2b/inquiry/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        clearB2bInquiryClaimToken();
        setAccountLinked(true);
        setDone(true);
        setOfferAccount(false);
      }
    })();
  }, [isAuthenticated, searchParams]);

  const setField =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setFieldError(null);
    };

  const mapError = (code: string | undefined): string => {
    switch (code) {
      case "required":
        return copy.validationRequired;
      case "email":
        return copy.validationEmail;
      case "postal_code":
        return copy.validationPostalCode;
      case "phone":
        return copy.validationPhone;
      case "org_number":
        return copy.validationOrgNumber;
      case "delivery_date":
        return copy.validationDeliveryDate;
      case "stock_unavailable":
        return copy.stockUnavailable;
      case "rate_limited":
        return copy.rateLimited;
      default:
        return copy.genericError;
    }
  };

  const clearCartLines = async () => {
    const lines = [...(cart?.lines ?? [])];
    for (const line of lines) {
      try {
        await updateItem(line.id, line.merchandise.id, 0, "delete");
      } catch {
        // non-fatal
      }
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    if (hasProducerLines) {
      setError(copy.producerLinesBlocked);
      return;
    }
    if (warehouseLines.length === 0) {
      setError(copy.emptyCart);
      return;
    }

    const linesPayload = warehouseLines.map((line) => {
      const lineTotal = parseFloat(line.cost.totalAmount.amount || "0");
      const unitIncl =
        line.quantity > 0 ? lineTotal / line.quantity : lineTotal;
      const unitExcl = priceExclVat(unitIncl);
      return {
        wineId: line.merchandise.id,
        wineTitle: line.merchandise.product?.title || line.merchandise.title,
        quantity: line.quantity,
        unitPriceCents: Math.round(unitExcl * 100),
      };
    });

    const clientParsed = validateB2bInquiryForm({
      ...form,
      lines: linesPayload,
    });
    if (!clientParsed.ok) {
      if (clientParsed.error === "honeypot") {
        setDone(true);
        return;
      }
      setFieldError(mapError(clientParsed.error));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/b2b/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          locale,
          lines: linesPayload,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(mapError(data?.code || data?.error));
        return;
      }

      trackB2bInquirySubmitted({
        page: "/b2b/inquiry",
        source: "checkout_replacement",
        wine_count: warehouseLines.length,
        est_bottles: warehouseLines.reduce((s, l) => s + l.quantity, 0),
      });

      if (typeof data.claimToken === "string" && data.claimToken) {
        storeB2bInquiryClaimToken(data.claimToken);
        setOfferAccount(true);
      }

      setSubmittedEmail(form.email);
      await clearCartLines();
      setDone(true);
    } catch {
      setError(copy.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 space-y-4 font-sans">
        <h1 className="text-2xl font-semibold text-foreground">
          {copy.successTitle}
        </h1>
        <p className="text-muted-foreground">{copy.successBody}</p>
        {accountLinked ? (
          <p className="text-sm text-foreground">{copy.createAccountDone}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {copy.privacyNote}{" "}
          <Link
            href="/integritetspolicy"
            className="underline underline-offset-2"
          >
            {copy.privacyLinkLabel}
          </Link>
          {copy.privacyNoteSuffix}
        </p>
        {offerAccount && !accountLinked && !isAuthenticated ? (
          <InquiryAccountOffer
            emailHint={submittedEmail}
            locale={locale}
            onSkip={() => router.push(paths.shop)}
            onLinked={() => {
              setAccountLinked(true);
              setOfferAccount(false);
            }}
          />
        ) : (
          <Button type="button" onClick={() => router.push(paths.shop)}>
            {copy.backToShop}
          </Button>
        )}
      </div>
    );
  }

  if (!cart || warehouseLines.length === 0) {
    // Still show success claim return without cart.
    if (searchParams.get("claimed") === "1" && accountLinked) {
      return (
        <div className="mx-auto max-w-lg px-4 py-12 space-y-4 font-sans">
          <h1 className="text-2xl font-semibold text-foreground">
            {copy.successTitle}
          </h1>
          <p className="text-sm text-foreground">{copy.createAccountDone}</p>
          <Button type="button" onClick={() => router.push(paths.shop)}>
            {copy.backToShop}
          </Button>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-lg px-4 py-12 space-y-4">
        <h1 className="text-2xl font-semibold">{copy.pageTitle}</h1>
        <p className="text-muted-foreground">{copy.emptyCart}</p>
        {hasProducerLines && (
          <p className="text-sm text-amber-800">{copy.producerLinesBlocked}</p>
        )}
        <Button asChild>
          <Link href={paths.shop}>{copy.backToShop}</Link>
        </Button>
      </div>
    );
  }

  const bottlesLabel = (n: number) => {
    if (locale === "sv") return n === 1 ? "1 flaska" : `${n} flaskor`;
    return n === 1 ? "1 bottle" : `${n} bottles`;
  };

  const cartSummary = (
    <section className="space-y-3 font-sans">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {copy.cartSummary}
      </h2>
      <ul className="divide-y border rounded-md">
        {warehouseLines.map((line) => {
          const lineTotal = parseFloat(line.cost.totalAmount.amount || "0");
          const excl = priceExclVat(lineTotal);
          return (
            <li
              key={line.id}
              className="flex justify-between gap-4 px-3 py-2.5 text-sm items-start"
            >
              <div className="min-w-0 flex-1">
                <div className="leading-snug break-words">
                  {line.merchandise.product?.title || line.merchandise.title}
                </div>
                <div className="mt-0.5 text-[13px] text-muted-foreground leading-snug">
                  {bottlesLabel(line.quantity)}
                </div>
              </div>
              <span className="tabular-nums whitespace-nowrap pl-4 shrink-0">
                {formatCartLinePrice(excl, context)}
              </span>
            </li>
          );
        })}
        <li className="flex justify-between gap-4 px-3 py-2.5 text-sm items-start font-medium">
          <div className="min-w-0 flex-1">
            <div className="leading-snug">{copy.totalExclVatLabel}</div>
            <div className="mt-0.5 text-[13px] font-normal text-muted-foreground leading-snug">
              {bottlesLabel(cartTotals.bottles)}
            </div>
          </div>
          <span className="tabular-nums whitespace-nowrap pl-4 shrink-0">
            {formatCartLinePrice(cartTotals.exclSum, context)}{" "}
            <span className="font-normal text-muted-foreground text-xs">
              {locale === "sv" ? "exkl. moms" : "excl. VAT"}
            </span>
          </span>
        </li>
      </ul>
    </section>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8 font-sans">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {copy.pageTitle}
        </h1>
        <p className="text-muted-foreground">{copy.pageIntro}</p>
      </div>

      {cartSummary}

      <form onSubmit={onSubmit} className="space-y-4 relative" noValidate>
        <div
          className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden"
          aria-hidden
        >
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={setField("website")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="companyName">{copy.companyLabel}</Label>
            <Input
              id="companyName"
              value={form.companyName}
              onChange={setField("companyName")}
              autoComplete="organization"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="organizationNumber">
              {copy.organizationNumberLabel}
            </Label>
            <Input
              id="organizationNumber"
              value={form.organizationNumber}
              onChange={setField("organizationNumber")}
              placeholder="556677-8899"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactName">{copy.contactNameLabel}</Label>
            <Input
              id="contactName"
              value={form.contactName}
              onChange={setField("contactName")}
              autoComplete="name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{copy.emailLabel}</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={setField("email")}
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{copy.phoneLabel}</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={setField("phone")}
              autoComplete="tel"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="deliveryAddress">{copy.deliveryAddressLabel}</Label>
            <Input
              id="deliveryAddress"
              value={form.deliveryAddress}
              onChange={setField("deliveryAddress")}
              autoComplete="street-address"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postalCode">{copy.postalCodeLabel}</Label>
            <Input
              id="postalCode"
              value={form.postalCode}
              onChange={setField("postalCode")}
              placeholder="11846"
              autoComplete="postal-code"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desiredDeliveryDate">
              {copy.desiredDeliveryDateLabel}
            </Label>
            <Input
              id="desiredDeliveryDate"
              type="date"
              value={form.desiredDeliveryDate}
              onChange={setField("desiredDeliveryDate")}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="message">{copy.messageLabel}</Label>
            <Textarea
              id="message"
              rows={4}
              placeholder={copy.messagePlaceholder}
              value={form.message}
              onChange={setField("message")}
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {copy.privacyNote}{" "}
          <Link
            href="/integritetspolicy"
            className="underline underline-offset-2"
          >
            {copy.privacyLinkLabel}
          </Link>
          {copy.privacyNoteSuffix}
        </p>

        {(fieldError || error) && (
          <p className="text-sm text-destructive" role="alert">
            {fieldError || error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="w-full h-12">
          {submitting ? copy.submitting : copy.submit}
        </Button>
      </form>
    </div>
  );
}
