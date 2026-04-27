import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStripeCustomerId } from "@/lib/stripe/customer";
import { stripe, STRIPE_CONFIG } from "@/lib/stripe";

/**
 * GET /api/user/payment-methods
 *
 * Returns user's payment methods from Stripe
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!STRIPE_CONFIG.isConfigured || !stripe) {
      console.log("⚠️ Stripe not configured, returning empty payment methods");
      return NextResponse.json({
        paymentMethods: [],
      });
    }

    let customerId: string;
    try {
      const id = await getStripeCustomerId(user.id);
      if (!id) {
        return NextResponse.json(
          { error: "No payment method on file" },
          { status: 404 },
        );
      }
      customerId = id;
    } catch {
      return NextResponse.json(
        { error: "Failed to load billing profile" },
        { status: 500 },
      );
    }

    const customer = await stripe.customers.retrieve(customerId);
    if (
      typeof customer === "string" ||
      ("deleted" in customer && customer.deleted)
    ) {
      return NextResponse.json(
        { error: "No payment method on file" },
        { status: 404 },
      );
    }

    const defaultPmId =
      typeof customer.invoice_settings?.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings?.default_payment_method?.id ?? null;

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    const sorted = [...paymentMethods.data].sort((a, b) => {
      const aIsDef = defaultPmId === a.id;
      const bIsDef = defaultPmId === b.id;
      if (aIsDef !== bIsDef) return aIsDef ? -1 : 1;
      return (b.created ?? 0) - (a.created ?? 0);
    });

    const seen = new Set<string>();
    const unique = sorted.filter((pm) => {
      const fp = pm.card?.fingerprint;
      if (!fp) return true;
      if (seen.has(fp)) return false;
      seen.add(fp);
      return true;
    });

    const formattedMethods = unique.map((pm) => ({
      id: pm.id,
      type: "card" as const,
      last4: pm.card?.last4,
      brand: pm.card?.brand,
      is_default: defaultPmId === pm.id,
      expiry_month: pm.card?.exp_month,
      expiry_year: pm.card?.exp_year,
    }));

    return NextResponse.json({
      paymentMethods: formattedMethods,
    });
  } catch (error) {
    console.error("❌ Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 },
    );
  }
}
