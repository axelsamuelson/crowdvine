import { cookies } from "next/headers";
import { WINE_ENRICHMENT_LINE_FRAME_CLASS } from "@/lib/product/wine-enrichment-ui";
import { translate } from "@/lib/i18n/messages";
import {
  DEFAULT_APP_LOCALE,
  LOCALE_COOKIE,
  parseLocaleCookie,
} from "@/lib/i18n/locale";

interface WineStyleScaleProps {
  value: number; // 1–5
}

export async function WineStyleScale({ value }: WineStyleScaleProps) {
  const cookieStore = await cookies();
  const locale =
    parseLocaleCookie(cookieStore.get(LOCALE_COOKIE)?.value) ??
    DEFAULT_APP_LOCALE;
  const t = (key: string) => translate(locale, `product.pdp.${key}`);
  const clampedValue = Math.min(5, Math.max(1, value));
  const percent = ((clampedValue - 1) / 4) * 100;

  return (
    <div
      className={`px-4 py-3 md:px-5 ${WINE_ENRICHMENT_LINE_FRAME_CLASS}`}
      role="img"
      aria-label={`${t("styleScale")}: ${t("styleScaleLow")} – ${t("styleScaleHigh")}, värde ${clampedValue} av 5`}
    >
      {/* Etiketter */}
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground/70">
          {t("styleScaleLow")}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground/70">
          {t("styleScaleHigh")}
        </span>
      </div>

      {/* Track */}
      <div className="relative flex items-center">
        <div className="h-px w-full bg-foreground/15" />
        <div
          className="absolute h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-foreground"
          style={{ left: `${percent}%` }}
        />
      </div>
    </div>
  );
}
