import { Footer } from "@/components/layout/footer";

export default function AboutPage() {
  return (
    <>
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="p-sides pt-top-spacing pb-20 md:pb-32">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-foreground">
                  About
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
                  A smarter way to buy wine — together.
                </p>
              </div>
              
              <div className="h-px bg-border/50 w-24"></div>
              
              <div className="space-y-6 text-base md:text-lg text-muted-foreground leading-relaxed font-light">
                <p>
                  We believe the way wine is bought and sold is long overdue for change.
                  Too many hands between producer and drinker. Too much money lost in storage, shipping and markups.
                  We built this platform to change that.
                </p>
                <p>
                  Our model is simple — and transparent.
                  Private consumers reserve wines directly from independent natural winemakers.
                  When enough bottles are reserved to fill a pallet, the wines are shipped together — efficiently, sustainably, and at a fair price.
                </p>
                <p>
                  No warehouses. No distributors. No unnecessary transport.
                  Just real connection between the people who make wine and the people who love it.
                </p>
                <p>
                  We call it crowdsourcing wine — a smarter, cleaner, and more human way to enjoy what&apos;s in your glass.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Philosophy Section */}
        <section className="p-sides pb-20 md:pb-32">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-light text-foreground mb-8">
              Our philosophy
            </h2>
            
            <div className="space-y-6 text-base md:text-lg text-muted-foreground leading-relaxed font-light">
              <p>
                We work exclusively with natural winemakers who farm organically and produce without additives.
                Every bottle reflects a person, a place, and a philosophy — not a production line.
                Transparency is at the heart of everything we do: from pricing to logistics to the winemakers we feature.
              </p>
            </div>
          </div>
        </section>

        {/* Why It Matters Section */}
        <section className="p-sides pb-20 md:pb-32">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-light text-foreground mb-8">
              Why it matters
            </h2>
            
            <div className="space-y-6 text-base md:text-lg text-muted-foreground leading-relaxed font-light">
              <p>
                By pooling orders, we lower costs for everyone — producers earn more, and consumers pay less.
                By removing warehouses and unnecessary shipping, we reduce waste and carbon footprint.
                By connecting people directly, we make wine more personal, more sustainable, and more honest.
              </p>
              <p>
                This isn&apos;t just a new platform.
                It&apos;s a new relationship with wine.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="p-sides pb-20 md:pb-32">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-light text-foreground mb-12">
              How It Works
            </h2>
            
            <div className="space-y-12">
              {/* Step 1 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                </div>
                <div className="space-y-3 flex-1">
                  <h3 className="text-lg font-medium text-foreground">
                    Discover & Reserve
                  </h3>
                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      Explore a curated selection of natural wines from independent producers — transparent pricing, full details, and no middlemen.
                    </p>
                    <p>
                      When you find something you love, reserve the number of bottles you want.
                      Your reservation is added to a shared pallet with others who order the same producer or region.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                </div>
                <div className="space-y-3 flex-1">
                  <h3 className="text-lg font-medium text-foreground">
                    Collective Shipping
                  </h3>
                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      Once a pallet reaches full capacity — around 600–700 bottles — the wines are collected directly from the winemakers.
                      No warehouses, no repacking, no unnecessary detours.
                    </p>
                    <p>
                      Producers deliver their wines to a local hub, just like they would to a nearby restaurant or shop.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                </div>
                <div className="space-y-3 flex-1">
                  <h3 className="text-lg font-medium text-foreground">
                    Transparent Logistics
                  </h3>
                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      Every step is visible — from reservation to pallet completion and transport.
                      You can track pallet progress and see exactly where your wine is and when it will arrive.
                    </p>
                    <p>
                      Because we ship collectively and skip storage, logistics stay efficient and prices stay fair.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium">
                    4
                  </div>
                </div>
                <div className="space-y-3 flex-1">
                  <h3 className="text-lg font-medium text-foreground">
                    Receive & Enjoy
                  </h3>
                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      When the pallet lands, your wines are unpacked and delivered straight to you (or your local pickup point, depending on country).
                    </p>
                    <p>
                      You receive the same bottles you reserved — direct from the winemaker, untouched and traceable.
                      Pure wine, transparent process, fair price.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Difference Section */}
        <section className="p-sides pb-20 md:pb-32">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-light text-foreground mb-8">
              The Difference
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed">
                <p>
                  <span className="font-medium text-foreground">No warehouses.</span> Wines stay with the winemaker until shipped.
                </p>
                <p>
                  <span className="font-medium text-foreground">No middlemen.</span> Every bottle comes straight from the source.
                </p>
                <p>
                  <span className="font-medium text-foreground">No waste.</span> Collective shipping means lower emissions and smarter logistics.
                </p>
                <p>
                  <span className="font-medium text-foreground">Fair pricing.</span> More value to producers, better prices for consumers.
                </p>
              </div>
              
              <div className="pt-4 space-y-2">
                <p className="text-base md:text-lg font-light text-foreground">
                  Crowdsource your wine.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Buy direct, drink better, and know exactly where your money goes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Membership Section */}
        <section className="p-sides pb-20 md:pb-32">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-light text-foreground mb-12">
              Membership Levels
            </h2>
            
            <div className="space-y-6">
              {[
                {
                  level: "Basic",
                  color: "bg-gray-100 text-gray-900",
                  description: "Entry level access to all wines and basic community features."
                },
                {
                  level: "Bronze",
                  color: "bg-orange-100 text-orange-900",
                  description: "Enhanced invite quota and queue priority for popular drops."
                },
                {
                  level: "Silver",
                  color: "bg-gray-300 text-gray-900",
                  description: "Early access to new releases and reduced service fees."
                },
                {
                  level: "Gold",
                  color: "bg-yellow-100 text-yellow-900",
                  description: "Maximum invite quota, priority access, and exclusive perks."
                }
              ].map((tier) => (
                <div 
                  key={tier.level}
                  className="flex items-center gap-6 p-6 bg-background border border-border rounded-xl hover:border-foreground/20 transition-all"
                >
                  <div className={`px-4 py-2 rounded-full ${tier.color} text-sm font-medium min-w-[100px] text-center`}>
                    {tier.level}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tier.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="p-sides pb-20 md:pb-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-foreground text-background rounded-2xl p-12 md:p-16">
              <h2 className="text-2xl md:text-3xl font-light mb-4">
                Ready to Join?
              </h2>
              <p className="text-sm md:text-base text-background/70 mb-8 max-w-2xl mx-auto">
                Request access to start your wine journey with PACT, or ask an 
                existing member for an invitation code.
              </p>
              <a
                href="/access-request"
                className="inline-block px-8 py-3 bg-background text-foreground rounded-full font-medium hover:bg-background/90 transition-colors"
              >
                Request Access
              </a>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </>
  );
}

