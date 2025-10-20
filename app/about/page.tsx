import { Footer } from "@/components/layout/footer";

export default function AboutPage() {
  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Hero Section */}
        <section className="p-sides pt-top-spacing pb-24 md:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-foreground">
                About
              </h1>
              <p className="text-xl md:text-2xl text-foreground font-light leading-relaxed">
                A smarter way to buy wine — together.
              </p>

              <div className="flex justify-center pt-4">
                <div className="h-px bg-border w-16"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Story - Cards */}
        <section className="p-sides pb-24 md:pb-32">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1 */}
            <div className="bg-background border border-border rounded-2xl p-8 md:p-10 space-y-4 hover:border-foreground/20 transition-all">
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                We believe the way wine is bought and sold is long overdue for
                change. Too many hands between producer and drinker. Too much
                money lost in storage, shipping and markups.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-background border border-border rounded-2xl p-8 md:p-10 space-y-4 hover:border-foreground/20 transition-all">
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Our model is simple — and transparent. Private consumers reserve
                wines directly from independent natural winemakers. When enough
                bottles are reserved to fill a pallet, the wines are shipped
                together.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-background border border-border rounded-2xl p-8 md:p-10 space-y-4 hover:border-foreground/20 transition-all">
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                No warehouses. No distributors. No unnecessary transport. Just
                real connection between the people who make wine and the people
                who love it.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-foreground text-background rounded-2xl p-8 md:p-10 space-y-4">
              <p className="text-sm md:text-base leading-relaxed font-light">
                We call it crowdsourcing wine — a smarter, cleaner, and more
                human way to enjoy what&apos;s in your glass.
              </p>
            </div>
          </div>
        </section>

        {/* Philosophy & Impact - Side by Side */}
        <section className="p-sides pb-24 md:pb-32">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Philosophy */}
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-light text-foreground">
                Our philosophy
              </h2>
              <div className="space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed">
                <p>
                  We work exclusively with natural winemakers who farm
                  organically and produce without additives.
                </p>
                <p>
                  Every bottle reflects a person, a place, and a philosophy —
                  not a production line.
                </p>
                <p>
                  Transparency is at the heart of everything we do: from pricing
                  to logistics to the winemakers we feature.
                </p>
              </div>
            </div>

            {/* Why It Matters */}
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-light text-foreground">
                Why it matters
              </h2>
              <div className="space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed">
                <p>
                  By pooling orders, we lower costs for everyone — producers
                  earn more, and consumers pay less.
                </p>
                <p>
                  By removing warehouses and unnecessary shipping, we reduce
                  waste and carbon footprint.
                </p>
                <p>
                  By connecting people directly, we make wine more personal,
                  more sustainable, and more honest.
                </p>
                <p className="text-foreground font-medium pt-2">
                  This isn&apos;t just a new platform. It&apos;s a new
                  relationship with wine.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works - Grid */}
        <section className="p-sides pb-24 md:pb-32">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-light text-foreground mb-12 text-center">
              How It Works
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Step 1 */}
              <div className="bg-background border border-border rounded-2xl p-8 hover:border-foreground/20 transition-all">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-medium flex-shrink-0">
                    1
                  </div>
                  <h3 className="text-lg font-medium text-foreground pt-1">
                    Discover & Reserve
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Explore curated natural wines from independent producers.
                  Reserve the bottles you want — your order joins a shared
                  pallet with others.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-background border border-border rounded-2xl p-8 hover:border-foreground/20 transition-all">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-medium flex-shrink-0">
                    2
                  </div>
                  <h3 className="text-lg font-medium text-foreground pt-1">
                    Collective Shipping
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Once the pallet fills (600-700 bottles), wines are collected
                  directly from winemakers. No warehouses, no detours.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-background border border-border rounded-2xl p-8 hover:border-foreground/20 transition-all">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-medium flex-shrink-0">
                    3
                  </div>
                  <h3 className="text-lg font-medium text-foreground pt-1">
                    Transparent Logistics
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Track your pallet from reservation to delivery. Every step is
                  visible — efficient logistics, fair prices.
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-background border border-border rounded-2xl p-8 hover:border-foreground/20 transition-all">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-medium flex-shrink-0">
                    4
                  </div>
                  <h3 className="text-lg font-medium text-foreground pt-1">
                    Receive & Enjoy
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your wines arrive direct from the winemaker, untouched and
                  traceable. Pure wine, transparent process, fair price.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The Difference - Highlight Box */}
        <section className="p-sides pb-24 md:pb-32">
          <div className="max-w-5xl mx-auto">
            <div className="bg-foreground text-background rounded-3xl p-10 md:p-16">
              <h2 className="text-2xl md:text-3xl font-light mb-8 text-center">
                The Difference
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-10">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-background/60 mt-2 flex-shrink-0"></div>
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium">No warehouses.</span> Wines
                    stay with the winemaker until shipped.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-background/60 mt-2 flex-shrink-0"></div>
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium">No middlemen.</span> Every
                    bottle comes straight from the source.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-background/60 mt-2 flex-shrink-0"></div>
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium">No waste.</span> Collective
                    shipping means lower emissions.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-background/60 mt-2 flex-shrink-0"></div>
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium">Fair pricing.</span> More
                    value to producers, better prices for you.
                  </p>
                </div>
              </div>

              <div className="text-center pt-6 border-t border-background/10">
                <p className="text-lg md:text-xl font-light mb-2">
                  Crowdsource your wine.
                </p>
                <p className="text-sm text-background/70">
                  Buy direct, drink better, and know exactly where your money
                  goes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="p-sides pb-24 md:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-light text-foreground">
                Ready to join?
              </h2>
              <p className="text-base md:text-lg text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto">
                Request access to start your wine journey, or ask an existing
                member for an invitation.
              </p>
              <div className="pt-2">
                <a
                  href="/access-request"
                  className="inline-block px-10 py-4 bg-foreground text-background rounded-full font-medium hover:bg-foreground/90 transition-all text-sm"
                >
                  Request Access
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
