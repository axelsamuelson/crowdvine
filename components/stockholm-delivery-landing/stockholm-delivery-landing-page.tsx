import Image from "next/image";
import Link from "next/link";

import { EngagementTrackers } from "@/components/analytics/engagement-trackers";
import type { AppLocale } from "@/lib/i18n/locale";
import { DIRTY_WINE_CONFIG } from "@/lib/site-config";
import { getSiteConfig } from "@/lib/site-config-server";
import {
  STOCKHOLM_DELIVERY_HERO_IMAGE,
  stockholmDeliveryLandingCopy,
} from "@/lib/stockholm-delivery-landing/config";
import { buildStockholmDeliveryJsonLd } from "@/lib/stockholm-delivery-landing/metadata";

export async function StockholmDeliveryLandingPage({
  locale,
}: {
  locale: AppLocale;
}) {
  const config = await getSiteConfig();
  const isDirty = config.baseUrl === DIRTY_WINE_CONFIG.baseUrl;
  const copy = stockholmDeliveryLandingCopy(locale, isDirty);
  const jsonLd = buildStockholmDeliveryJsonLd(locale, config, isDirty);

  return (
    <div className="bg-stone-100 text-stone-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.webpage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.faq) }}
      />
      <EngagementTrackers />

      {/* Hero — one composition: brand, headline, support, CTAs, full-bleed image */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <Image
          src={STOCKHOLM_DELIVERY_HERO_IMAGE}
          alt=""
          fill
          priority
          fetchPriority="high"
          quality={85}
          className="stockholm-hero-ken object-cover object-center"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-stone-950/60 via-stone-950/40 to-stone-950/80"
          aria-hidden
        />
        <div className="relative z-10 flex min-h-[100svh] flex-col justify-end px-6 pb-14 pt-28 sm:px-10 md:px-14 md:pb-20 lg:px-20">
          <p className="stockholm-fade-up text-sm font-semibold uppercase tracking-[0.28em] text-stone-100/90 sm:text-base">
            {copy.brand}
          </p>
          <h1
            className="stockholm-fade-up mt-4 max-w-4xl text-balance font-semibold uppercase tracking-[-0.02em] text-stone-50 text-[clamp(2.2rem,6.5vw,4.75rem)] leading-[1.05]"
            style={{ animationDelay: "120ms" }}
          >
            {copy.h1}
          </h1>
          <p
            className="stockholm-fade-up mt-5 max-w-xl text-base leading-relaxed text-stone-200/90 sm:text-lg"
            style={{ animationDelay: "220ms" }}
          >
            {copy.heroSupport}
          </p>
          <div
            className="stockholm-fade-up mt-8 flex flex-wrap items-center gap-x-8 gap-y-4"
            style={{ animationDelay: "320ms" }}
          >
            <Link
              href={copy.primaryHref}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-sm bg-stone-50 px-6 text-sm font-medium text-stone-950 transition-colors duration-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-50"
            >
              {copy.primaryCta}
            </Link>
            <a
              href="#sa-funkar-det"
              className="cursor-pointer text-sm font-medium tracking-wide text-stone-100/90 underline underline-offset-4 transition-opacity duration-200 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-50"
            >
              {copy.secondaryCta}
            </a>
          </div>
        </div>
      </section>

      {/* How it works — one job */}
      <section
        id="sa-funkar-det"
        className="scroll-mt-24 border-t border-stone-300/70 px-6 py-20 sm:px-10 md:px-14 md:py-28 lg:px-20"
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">
            {copy.howHeading}
          </h2>
          <ol className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
            {copy.steps.map((step, index) => (
              <li key={step.title} className="min-w-0">
                <p className="font-mono text-xs tracking-[0.2em] text-stone-500">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-stone-950 md:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-600 md:text-base">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why — one job, with visual anchor */}
      <section className="relative overflow-hidden bg-stone-950 text-stone-50">
        <div
          className="absolute inset-y-0 right-0 hidden w-1/2 md:block"
          aria-hidden
        >
          <Image
            src="/images/home-hero.png"
            alt=""
            fill
            className="object-cover object-center opacity-50"
            sizes="50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/85 to-stone-950/20" />
        </div>
        <div className="relative mx-auto grid max-w-5xl gap-10 px-6 py-20 sm:px-10 md:grid-cols-2 md:px-14 md:py-28 lg:px-20">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {copy.whyHeading}
            </h2>
            <div className="mt-8 space-y-5 text-sm leading-relaxed text-stone-300 md:text-base">
              {copy.whyBody.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — prose, not cards */}
      <section className="border-t border-stone-300/70 px-6 py-20 sm:px-10 md:px-14 md:py-28 lg:px-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">
            {locale === "sv" ? "Vanliga frågor" : "Common questions"}
          </h2>
          <dl className="mt-12 divide-y divide-stone-300/80">
            {copy.faq.map((item) => (
              <div key={item.question} className="py-7">
                <dt className="text-lg font-semibold tracking-tight text-stone-950 md:text-xl">
                  {item.question}
                </dt>
                <dd className="mt-3 text-sm leading-relaxed text-stone-600 md:text-base">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-stone-300/70 bg-gradient-to-b from-stone-200 to-stone-100 px-6 py-20 sm:px-10 md:px-14 md:py-24 lg:px-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-stone-950 md:text-5xl">
            {copy.closeHeading}
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-stone-600 md:text-base">
            {copy.closeSupport}
          </p>
          <Link
            href={copy.primaryHref}
            className="mt-10 inline-flex h-11 cursor-pointer items-center justify-center rounded-sm bg-stone-950 px-7 text-sm font-medium text-stone-50 transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-950"
          >
            {copy.closeCta}
          </Link>
        </div>
      </section>

      <style>{`
        @keyframes stockholm-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes stockholm-hero-ken {
          from { transform: scale(1); }
          to { transform: scale(1.06); }
        }
        .stockholm-fade-up {
          animation: stockholm-fade-up 0.9s ease-out both;
        }
        .stockholm-hero-ken {
          animation: stockholm-hero-ken 28s ease-in-out infinite alternate;
        }
        @media (prefers-reduced-motion: reduce) {
          .stockholm-fade-up,
          .stockholm-hero-ken {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
