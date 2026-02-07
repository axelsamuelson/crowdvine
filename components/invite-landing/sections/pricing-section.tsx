"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

const benefits = [
  {
    name: "Consumer",
    description: "For wine lovers",
    features: [
      "Access to wines from our producers",
      "Producer stories and profiles",
      "Events and tastings",
      "Member-only offers",
    ],
  },
  {
    name: "Producer",
    description: "For wineries and growers",
    features: [
      "Your own producer page",
      "Direct connection to consumers",
      "Showcase your wines and story",
      "Invite-only community",
    ],
    popular: true,
  },
];

export function PricingSection() {
  return (
    <section className="bg-secondary px-6 py-24">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl font-serif text-foreground">
            What you get
          </h2>
          <p className="text-muted-foreground mt-4 max-w-md mx-auto">
            Join as a consumer or producer—choose above and continue.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {benefits.map((plan, i) => (
            <motion.div
              key={i}
              className={`relative bg-background rounded-xl p-8 ticket-edge ${
                plan.popular ? "ring-2 ring-primary" : ""
              }`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              data-clickable
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Popular
                </span>
              )}

              <div className="text-center pb-6 border-b border-dashed border-border">
                <h3 className="font-serif text-xl text-foreground">
                  {plan.name}
                </h3>
                <p className="text-muted-foreground text-sm mt-2">
                  {plan.description}
                </p>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3 text-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
