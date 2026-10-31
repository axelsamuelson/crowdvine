"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import { b2bInquiryCopy } from "@/lib/b2b/inquiry-copy";
import { b2bInquiryLoginHref } from "@/lib/b2b/inquiry-login";
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

export function B2bInquiryClient({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const { context } = useTranslations();
  const paths = useLocalizedPaths();
  const router = useRouter();
  const { cart, updateItem } = useCart();
  const locale = context.locale === "en" ? "en" : "sv";
  const copy = b2bInquiryCopy(locale);
  const loginHref = b2bInquiryLoginHref();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

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

  const setField =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
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
      case "unauthorized":
        return copy.loginCta;
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

    if (hasProducerLines) {
      setError(copy.producerLinesBlocked);
      return;
    }
    if (warehouseLines.length === 0) {
      setError(copy.emptyCart);
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
          lines: warehouseLines.map((line) => {
            const lineTotal = parseFloat(line.cost.totalAmount.amount || "0");
            const unitIncl =
              line.quantity > 0 ? lineTotal / line.quantity : lineTotal;
            const unitExcl = priceExclVat(unitIncl);
            return {
              wineId: line.merchandise.id,
              wineTitle:
                line.merchandise.product?.title || line.merchandise.title,
              quantity: line.quantity,
              unitPriceCents: Math.round(unitExcl * 100),
            };
          }),
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
      <div className="mx-auto max-w-lg px-4 py-12 space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">
          {copy.successTitle}
        </h1>
        <p className="text-muted-foreground">{copy.successBody}</p>
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
        <Button type="button" onClick={() => router.push(paths.shop)}>
          {copy.backToShop}
        </Button>
      </div>
    );
  }

  if (!cart || warehouseLines.length === 0) {
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
              className="flex justify-between gap-4 px-3 py-2 text-sm"
            >
              <span>
                {line.merchandise.product?.title || line.merchandise.title} ×{" "}
                {line.quantity}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatCartLinePrice(excl, context)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">{copy.exclVatHint}</p>
      <div className="flex justify-between gap-4 text-sm font-medium">
        <span>
          {copy.totalExclVatLabel}: {cartTotals.bottles} {copy.totalBottlesLabel}
        </span>
        <span className="tabular-nums">
          {formatCartLinePrice(cartTotals.exclSum, context)}
        </span>
      </div>
    </section>
  );

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-8 font-sans">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {copy.pageTitle}
          </h1>
          <p className="text-muted-foreground">{copy.loginRequiredIntro}</p>
        </div>
        {cartSummary}
        <Button asChild className="w-full h-12 font-sans">
          <Link href={loginHref}>{copy.loginCta}</Link>
        </Button>
        <Button asChild variant="outline" className="w-full font-sans">
          <Link href={paths.shop}>{copy.backToShop}</Link>
        </Button>
      </div>
    );
  }

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
              required
              value={form.companyName}
              onChange={setField("companyName")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="organizationNumber">
              {copy.organizationNumberLabel}
            </Label>
            <Input
              id="organizationNumber"
              required
              value={form.organizationNumber}
              onChange={setField("organizationNumber")}
              placeholder="556677-8899"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactName">{copy.contactNameLabel}</Label>
            <Input
              id="contactName"
              required
              value={form.contactName}
              onChange={setField("contactName")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{copy.emailLabel}</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={setField("email")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{copy.phoneLabel}</Label>
            <Input
              id="phone"
              type="tel"
              required
              value={form.phone}
              onChange={setField("phone")}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="deliveryAddress">{copy.deliveryAddressLabel}</Label>
            <Input
              id="deliveryAddress"
              required
              value={form.deliveryAddress}
              onChange={setField("deliveryAddress")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postalCode">{copy.postalCodeLabel}</Label>
            <Input
              id="postalCode"
              required
              value={form.postalCode}
              onChange={setField("postalCode")}
              placeholder="11846"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desiredDeliveryDate">
              {copy.desiredDeliveryDateLabel}
            </Label>
            <Input
              id="desiredDeliveryDate"
              type="date"
              required
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

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="w-full h-12">
          {submitting ? copy.submitting : copy.submit}
        </Button>
      </form>
    </div>
  );
}
