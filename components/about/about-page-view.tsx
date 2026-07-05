import { Footer } from "@/components/layout/footer";
import type { AboutPageContent } from "@/lib/i18n/about-page-content";

export function AboutPageView({
  content,
  pageUrl,
  siteName,
}: {
  content: AboutPageContent;
  pageUrl: string;
  siteName: string;
}) {
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: content.title,
    description: content.description,
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: new URL(pageUrl).origin,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webPageJsonLd),
        }}
      />
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <section className="p-sides pt-top-spacing pb-24 md:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-foreground">
                {content.h1}
              </h1>
              <p className="text-xl md:text-2xl text-foreground font-light leading-relaxed">
                {content.heroSubtitle}
              </p>

              <div className="flex justify-center pt-4">
                <div className="h-px bg-border w-16"></div>
              </div>
            </div>
          </div>
        </section>

        <section className="p-sides pb-24 md:pb-32">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {content.cards.slice(0, 3).map((text, index) => (
              <div
                key={index}
                className="bg-background border border-border rounded-2xl p-8 md:p-10 space-y-4 hover:border-foreground/20 transition-all"
              >
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {text}
                </p>
              </div>
            ))}
            <div className="bg-foreground text-background rounded-2xl p-8 md:p-10 space-y-4">
              <p className="text-sm md:text-base leading-relaxed font-light">
                {content.cards[3]}
              </p>
            </div>
          </div>
        </section>

        <section className="p-sides pb-24 md:pb-32">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-light text-foreground">
                {content.philosophyTitle}
              </h2>
              <div className="space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed">
                {content.philosophyBody.map((paragraph) => (
                  <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-light text-foreground">
                {content.impactTitle}
              </h2>
              <div className="space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed">
                {content.impactBody.map((paragraph) => (
                  <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                ))}
                {content.impactClosing ? (
                  <p className="text-foreground font-medium pt-2">
                    {content.impactClosing}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="p-sides pb-24 md:pb-32">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-light text-foreground mb-12 text-center">
              {content.howItWorksTitle}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {content.steps.map((step, index) => (
                <div
                  key={step.title}
                  className="bg-background border border-border rounded-2xl p-8 hover:border-foreground/20 transition-all"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <h3 className="text-lg font-medium text-foreground pt-1">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="p-sides pb-24 md:pb-32">
          <div className="max-w-5xl mx-auto">
            <div className="bg-foreground text-background rounded-3xl p-10 md:p-16">
              <h2 className="text-2xl md:text-3xl font-light mb-8 text-center">
                {content.differenceTitle}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-10">
                {content.differenceItems.map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-background/60 mt-2 flex-shrink-0"></div>
                    <p className="text-sm leading-relaxed">
                      <span className="font-medium">{item.label}</span>
                      {item.detail ? ` ${item.detail}` : null}
                    </p>
                  </div>
                ))}
              </div>

              <div className="text-center pt-6 border-t border-background/10">
                <p className="text-lg md:text-xl font-light mb-2">
                  {content.differenceTagline}
                </p>
                <p className="text-sm text-background/70">
                  {content.differenceSubtagline}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="p-sides pb-24 md:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-light text-foreground">
                {content.ctaTitle}
              </h2>
              <p className="text-base md:text-lg text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto">
                {content.ctaBody}
              </p>
              <div className="pt-2">
                <a
                  href="/access-request"
                  className="inline-block px-10 py-4 bg-foreground text-background rounded-full font-medium hover:bg-foreground/90 transition-all text-sm"
                >
                  {content.ctaButton}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
