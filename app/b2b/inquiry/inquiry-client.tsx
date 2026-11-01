"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { useProductImages } from "@/components/products/variant-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InquiryAccountOffer } from "@/components/b2b/inquiry-account-offer";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import {
  b2bInquiryCopy,
  b2bInquiryFieldMessage,
  b2bInquiryValidationSummary,
} from "@/lib/b2b/inquiry-copy";
import type { B2bInquiryPrefill } from "@/lib/b2b/inquiry-prefill";
import {
  tomorrowDateIso,
  validateB2bInquiryFields,
  type B2bInquiryFieldErrors,
  type B2bInquiryFieldKey,
} from "@/lib/b2b/inquiry-validation";
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
import type { CartItem } from "@/lib/shopify/types";
import { priceExclVat } from "@/lib/shopify/utils";
import { emitOnce } from "@/lib/analytics/emit-once";
import { cn } from "@/lib/utils";

type FormState = {
  companyName: string;
  organizationNumber: string;
  contactName: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  postalCode: string;
  city: string;
  desiredDeliveryDate: string;
  message: string;
  website: string;
};

type SubmittedLine = {
  title: string;
  quantity: number;
  excl: number;
  imageUrl: string | null;
};

type SubmittedSummary = {
  email: string;
  emailSent: boolean;
  lines: SubmittedLine[];
  bottles: number;
  exclSum: number;
};

/** Same image source as the cart (`useProductImages` / featured fallback). */
function cartLineImageUrl(line: CartItem): string | null {
  const product = line.merchandise.product;
  if (!product) return null;
  if (product.featuredImage?.url) return product.featuredImage.url;
  const images = Array.isArray(product.images) ? product.images : [];
  return images[0]?.url ?? null;
}

function InquiryBottleThumb({
  url,
  alt,
}: {
  url: string | null | undefined;
  alt: string;
}) {
  if (!url) return null;
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-sm bg-muted">
      <Image
        src={url}
        alt={alt}
        width={40}
        height={40}
        className="size-full object-cover"
      />
    </div>
  );
}

function InquiryCartBottleThumb({
  line,
  alt,
}: {
  line: CartItem;
  alt: string;
}) {
  const imgs = useProductImages(
    line.merchandise.product,
    line.merchandise.selectedOptions,
  );
  return <InquiryBottleThumb url={imgs[0]?.url} alt={alt} />;
}

const emptyForm: FormState = {
  companyName: "",
  organizationNumber: "",
  contactName: "",
  email: "",
  phone: "",
  deliveryAddress: "",
  postalCode: "",
  city: "",
  desiredDeliveryDate: "",
  message: "",
  website: "",
};

const FIELD_ORDER: B2bInquiryFieldKey[] = [
  "companyName",
  "organizationNumber",
  "contactName",
  "email",
  "phone",
  "deliveryAddress",
  "postalCode",
  "city",
  "desiredDeliveryDate",
];

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
    city: prefill.city,
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
  const minDeliveryDate = useMemo(() => tomorrowDateIso(), []);
  const summaryRef = useRef<HTMLParagraphElement | null>(null);

  const [form, setForm] = useState<FormState>(() => formFromPrefill(prefill));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<B2bInquiryFieldErrors>({});
  const [done, setDone] = useState(false);
  const [offerAccount, setOfferAccount] = useState(false);
  const [accountLinked, setAccountLinked] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedSummary | null>(null);

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
      if (key in fieldErrors) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[key as B2bInquiryFieldKey];
          return next;
        });
      }
    };

  const mapApiError = (code: string | undefined): string => {
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

  const focusFirstError = (errors: B2bInquiryFieldErrors) => {
    const first = FIELD_ORDER.find((k) => errors[k]);
    if (!first) return;
    requestAnimationFrame(() => {
      summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      const el = document.getElementById(first);
      if (el && "focus" in el) {
        (el as HTMLElement).focus({ preventScroll: true });
      }
    });
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

    const clientParsed = validateB2bInquiryFields(
      { ...form, lines: linesPayload },
      { minDeliveryDate },
    );
    if (!clientParsed.ok) {
      if (clientParsed.error === "honeypot") {
        setDone(true);
        return;
      }
      setFieldErrors(clientParsed.fieldErrors);
      focusFirstError(clientParsed.fieldErrors);
      return;
    }
    setFieldErrors({});

    const summaryLines = warehouseLines.map((line) => {
      const lineTotal = parseFloat(line.cost.totalAmount.amount || "0");
      return {
        title: line.merchandise.product?.title || line.merchandise.title,
        quantity: line.quantity,
        excl: priceExclVat(lineTotal),
        imageUrl: cartLineImageUrl(line),
      };
    });

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
        setError(mapApiError(data?.code || data?.error));
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

      setSubmitted({
        email: form.email,
        // Customer confirmation email is always attempted on successful persist.
        emailSent: true,
        lines: summaryLines,
        bottles: cartTotals.bottles,
        exclSum: cartTotals.exclSum,
      });
      await clearCartLines();
      setDone(true);
    } catch {
      setError(copy.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  const bottlesLabel = (n: number) => {
    if (locale === "sv") return n === 1 ? "1 flaska" : `${n} flaskor`;
    return n === 1 ? "1 bottle" : `${n} bottles`;
  };

  const fieldMessage = (key: B2bInquiryFieldKey) => {
    const code = fieldErrors[key];
    if (!code) return null;
    return b2bInquiryFieldMessage(locale, key, code);
  };

  const errorCount = Object.keys(fieldErrors).filter(
    (k) => k !== "lines",
  ).length;

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 space-y-5 font-sans">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {copy.successTitle}
        </h1>
        <p className="text-muted-foreground">{copy.successBody}</p>
        {accountLinked ? (
          <p className="text-sm text-foreground">{copy.createAccountDone}</p>
        ) : null}

        {submitted ? (
          <section className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {copy.cartSummary}
            </h2>
            <ul className="divide-y border rounded-md bg-card/40">
              {submitted.lines.map((line) => (
                <li
                  key={`${line.title}-${line.quantity}`}
                  className="flex justify-between gap-4 px-3 py-2.5 text-sm items-start"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <InquiryBottleThumb url={line.imageUrl} alt={line.title} />
                    <div className="min-w-0 flex-1">
                      <div className="leading-snug break-words">{line.title}</div>
                      <div className="mt-0.5 text-[13px] text-muted-foreground">
                        {bottlesLabel(line.quantity)}
                      </div>
                    </div>
                  </div>
                  <span className="tabular-nums whitespace-nowrap pl-4 shrink-0">
                    {formatCartLinePrice(line.excl, "SEK", locale)}
                  </span>
                </li>
              ))}
              <li className="flex justify-between gap-4 px-3 py-2.5 text-sm font-medium">
                <div className="min-w-0 flex-1">
                  <div>{copy.totalExclVatLabel}</div>
                  <div className="mt-0.5 text-[13px] font-normal text-muted-foreground">
                    {bottlesLabel(submitted.bottles)}
                  </div>
                </div>
                <span className="tabular-nums whitespace-nowrap pl-4 shrink-0">
                  {formatCartLinePrice(submitted.exclSum, "SEK", locale)}{" "}
                  <span className="font-normal text-muted-foreground text-xs">
                    {locale === "sv" ? "exkl. moms" : "excl. VAT"}
                  </span>
                </span>
              </li>
            </ul>
            {submitted.emailSent ? (
              <p className="text-sm text-muted-foreground">
                {copy.emailCopySent} {submitted.email}
              </p>
            ) : null}
          </section>
        ) : null}

        {offerAccount && !accountLinked && !isAuthenticated ? (
          <InquiryAccountOffer
            emailHint={submitted?.email ?? ""}
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
      <div className="mx-auto max-w-lg px-4 py-12 space-y-4 font-sans">
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

  const cartSummary = (
    <section className="space-y-3 font-sans">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {copy.cartSummary}
      </h2>
      <ul className="divide-y border rounded-md">
        {warehouseLines.map((line) => {
          const lineTotal = parseFloat(line.cost.totalAmount.amount || "0");
          const excl = priceExclVat(lineTotal);
          const title =
            line.merchandise.product?.title || line.merchandise.title;
          return (
            <li
              key={line.id}
              className="flex justify-between gap-4 px-3 py-2.5 text-sm items-start"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <InquiryCartBottleThumb line={line} alt={title} />
                <div className="min-w-0 flex-1">
                  <div className="leading-snug break-words">{title}</div>
                  <div className="mt-0.5 text-[13px] text-muted-foreground leading-snug">
                    {bottlesLabel(line.quantity)}
                  </div>
                </div>
              </div>
              <span className="tabular-nums whitespace-nowrap pl-4 shrink-0">
                {formatCartLinePrice(excl, "SEK", locale)}
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
            {formatCartLinePrice(cartTotals.exclSum, "SEK", locale)}{" "}
            <span className="font-normal text-muted-foreground text-xs">
              {locale === "sv" ? "exkl. moms" : "excl. VAT"}
            </span>
          </span>
        </li>
      </ul>
    </section>
  );

  const renderFieldError = (key: B2bInquiryFieldKey) => {
    const msg = fieldMessage(key);
    if (!msg) return null;
    return (
      <p id={`${key}-error`} className="text-sm text-destructive" role="alert">
        {msg}
      </p>
    );
  };

  const describedBy = (key: B2bInquiryFieldKey) =>
    fieldErrors[key] ? `${key}-error` : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8 font-sans">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {copy.pageTitle}
        </h1>
        <p className="text-muted-foreground">{copy.pageIntro}</p>
      </div>

      {cartSummary}

      <form
        onSubmit={onSubmit}
        className="space-y-4 relative"
        noValidate
        lang={locale === "sv" ? "sv" : undefined}
      >
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
              aria-invalid={Boolean(fieldErrors.companyName)}
              aria-describedby={describedBy("companyName")}
              className={cn(fieldErrors.companyName && "border-destructive")}
            />
            {renderFieldError("companyName")}
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
              inputMode="numeric"
              aria-invalid={Boolean(fieldErrors.organizationNumber)}
              aria-describedby={describedBy("organizationNumber")}
              className={cn(
                fieldErrors.organizationNumber && "border-destructive",
              )}
            />
            {renderFieldError("organizationNumber")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactName">{copy.contactNameLabel}</Label>
            <Input
              id="contactName"
              value={form.contactName}
              onChange={setField("contactName")}
              autoComplete="name"
              aria-invalid={Boolean(fieldErrors.contactName)}
              aria-describedby={describedBy("contactName")}
              className={cn(fieldErrors.contactName && "border-destructive")}
            />
            {renderFieldError("contactName")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{copy.emailLabel}</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={setField("email")}
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={describedBy("email")}
              className={cn(fieldErrors.email && "border-destructive")}
            />
            {renderFieldError("email")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{copy.phoneLabel}</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={setField("phone")}
              autoComplete="tel"
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={describedBy("phone")}
              className={cn(fieldErrors.phone && "border-destructive")}
            />
            {renderFieldError("phone")}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="deliveryAddress">{copy.deliveryAddressLabel}</Label>
            <Input
              id="deliveryAddress"
              value={form.deliveryAddress}
              onChange={setField("deliveryAddress")}
              autoComplete="street-address"
              aria-invalid={Boolean(fieldErrors.deliveryAddress)}
              aria-describedby={describedBy("deliveryAddress")}
              className={cn(
                fieldErrors.deliveryAddress && "border-destructive",
              )}
            />
            {renderFieldError("deliveryAddress")}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <div className="space-y-1.5">
              <Label htmlFor="postalCode">{copy.postalCodeLabel}</Label>
              <Input
                id="postalCode"
                value={form.postalCode}
                onChange={setField("postalCode")}
                placeholder="11846"
                autoComplete="postal-code"
                inputMode="numeric"
                aria-invalid={Boolean(fieldErrors.postalCode)}
                aria-describedby={describedBy("postalCode")}
                className={cn(fieldErrors.postalCode && "border-destructive")}
              />
              {renderFieldError("postalCode")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">{copy.cityLabel}</Label>
              <Input
                id="city"
                value={form.city}
                onChange={setField("city")}
                autoComplete="address-level2"
                aria-invalid={Boolean(fieldErrors.city)}
                aria-describedby={describedBy("city")}
                className={cn(fieldErrors.city && "border-destructive")}
              />
              {renderFieldError("city")}
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="desiredDeliveryDate">
              {copy.desiredDeliveryDateLabel}
            </Label>
            <Input
              id="desiredDeliveryDate"
              type="date"
              lang="sv"
              min={minDeliveryDate}
              value={form.desiredDeliveryDate}
              onChange={setField("desiredDeliveryDate")}
              aria-invalid={Boolean(fieldErrors.desiredDeliveryDate)}
              aria-describedby={describedBy("desiredDeliveryDate")}
              className={cn(
                fieldErrors.desiredDeliveryDate && "border-destructive",
              )}
            />
            {renderFieldError("desiredDeliveryDate")}
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

        {errorCount > 0 ? (
          <p
            ref={summaryRef}
            className="text-sm text-destructive"
            role="alert"
            id="inquiry-validation-summary"
          >
            {b2bInquiryValidationSummary(locale, errorCount)}
          </p>
        ) : null}

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
