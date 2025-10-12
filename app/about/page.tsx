import { Footer } from "@/components/layout/footer";
import { Wine, Users, Globe, Award } from "lucide-react";

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
                  About PACT
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
                  Producers And Consumers Together
                </p>
              </div>
              
              <div className="h-px bg-border/50 w-24"></div>
              
              <div className="space-y-6 text-base md:text-lg text-muted-foreground leading-relaxed font-light">
                <p>
                  PACT is a wine community that connects passionate consumers directly 
                  with exceptional producers, creating a more transparent and rewarding 
                  wine experience.
                </p>
                <p>
                  By removing traditional intermediaries, we enable wine lovers to access 
                  premium bottles at fair prices while ensuring producers receive the 
                  value they deserve for their craft.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="p-sides pb-20 md:pb-32">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-light text-foreground mb-12">
              Our Values
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Value 1 */}
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                  <Wine className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">
                  Quality First
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We partner exclusively with producers who prioritize quality, 
                  sustainability, and authenticity in their winemaking process.
                </p>
              </div>

              {/* Value 2 */}
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                  <Users className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">
                  Community Driven
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our membership system rewards engagement and creates a 
                  community of wine enthusiasts who share knowledge and passion.
                </p>
              </div>

              {/* Value 3 */}
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">
                  Direct Access
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  No middlemen, no markups. Direct relationships between 
                  producers and consumers ensure fair pricing and transparency.
                </p>
              </div>

              {/* Value 4 */}
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                  <Award className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">
                  Curated Selection
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every wine in our collection is carefully selected and vetted 
                  to ensure exceptional quality and value for our members.
                </p>
              </div>
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
                <div className="space-y-2 flex-1">
                  <h3 className="text-lg font-medium text-foreground">
                    Join the Community
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Request access or use an invitation code from an existing member. 
                    Start as a Basic member with access to our curated wine selection.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="text-lg font-medium text-foreground">
                    Reserve Your Wines
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Browse wines from our partner producers. Orders are packed in 6-bottle 
                    cases and delivered directly from the producer to your door.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="text-lg font-medium text-foreground">
                    Earn Impact Points
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Engage with the community by inviting friends, making reservations, 
                    and participating. Earn Impact Points to unlock higher membership levels.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium">
                    4
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="text-lg font-medium text-foreground">
                    Unlock Rewards
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Progress through membership levels (Basic → Bronze → Silver → Gold) 
                    to access exclusive perks, early drops, and enhanced benefits.
                  </p>
                </div>
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

