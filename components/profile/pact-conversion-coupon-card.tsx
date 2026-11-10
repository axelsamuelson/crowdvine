"use client";

import { useEffect, useState } from "react";
import { isPactPointsConversionCoupon } from "@/lib/membership/pact-points-conversion";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useDisplayMoney } from "@/lib/hooks/use-display-money";

export type UserCoupon = {
  id: string;
  code: string;
  value_sek: number;
  valid_until: string | null;
  description: string | null;
};

export function ProfilePactConversionCouponCard() {
  const { t, context: shopping } = useTranslations();
  const { formatSek } = useDisplayMoney();
  const intlLocale = shopping.intlLocale;
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/coupons");
        if (res.status === 401) {
          if (!cancelled) {
            setCoupons([]);
            setLoaded(true);
          }
          return;
        }
        if (!res.ok) {
          if (!cancelled) setLoaded(true);
          return;
        }
        const data = (await res.json()) as { coupons?: UserCoupon[] };
        if (!cancelled) {
          setCoupons(Array.isArray(data.coupons) ? data.coupons : []);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || coupons.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="profile-pact-coupons">
      {coupons.map((c) => {
        const amountPlain =
          shopping.locale === "en"
            ? `${Math.round(c.value_sek)} SEK`
            : `${Math.round(c.value_sek)} kr`;
        const validLabel = c.valid_until
          ? new Date(c.valid_until).toLocaleDateString(intlLocale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : null;
        const isConversion = isPactPointsConversionCoupon(c.description);
        const titleParts = [
          t("profile.couponTitle"),
          t("profile.couponAmount", { amount: amountPlain }),
        ];
        if (validLabel) {
          titleParts.push(t("profile.couponValidUntil", { date: validLabel }));
        }
        const titleLine = titleParts.join(" · ");
        return (
          <div
            key={c.id}
            className="rounded-xl border border-border bg-card px-4 py-3 space-y-1"
            data-testid="profile-pact-coupon-card"
            data-conversion={isConversion ? "true" : "false"}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {titleLine}
            </p>
            {isConversion ? (
              <p className="text-sm text-foreground pt-1">
                {t("profile.pactPointsReplacedByCoupon", {
                  belopp: formatSek(c.value_sek),
                  date: validLabel ?? "",
                })}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
