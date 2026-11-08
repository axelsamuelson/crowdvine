/**
 * TEMPORARY — preview binding diagnostic (PR205 / product-fix 2319e3f9 unchanged).
 *
 * GET /api/debug/checkout-binding-diag
 * Flag: CHECKOUT_BINDING_DIAG_ENABLED=true
 *
 * CLEANUP: remove this route + lib/debug/checkout-binding-diag.ts + tests after
 * proof/review; disable flag first. No prod deploy of this helper.
 */
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getCurrentUser } from "@/lib/auth";
import {
  runCheckoutBindingDiag,
  type StripeDiagReads,
} from "@/lib/debug/checkout-binding-diag";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
} as const;

async function stripeAccountAndBalanceReads(
  secretKey: string,
): Promise<StripeDiagReads> {
  // Ephemeral client from validated test secret only — never the global singleton.
  const stripe = new Stripe(secretKey, {
    apiVersion: "2025-07-30.basil",
    typescript: true,
  });

  let account: Stripe.Account;
  try {
    // Documented GET /v1/account (no Stripe-Account header / no override).
    account = await stripe.accounts.retrieve();
  } catch (err: unknown) {
    // Do not log full Stripe exception objects / request headers / bodies.
    const statusCode =
      err &&
      typeof err === "object" &&
      "statusCode" in err &&
      typeof (err as { statusCode?: unknown }).statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : undefined;
    const wrapped = Object.assign(new Error("stripe_account_phase"), {
      statusCode,
      diagPhase: "account" as const,
    });
    throw wrapped;
  }

  let balance: Stripe.Balance;
  try {
    // Documented GET /v1/balance — livemode only; never return amounts.
    balance = await stripe.balance.retrieve();
  } catch (err: unknown) {
    const statusCode =
      err &&
      typeof err === "object" &&
      "statusCode" in err &&
      typeof (err as { statusCode?: unknown }).statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : undefined;
    const wrapped = Object.assign(new Error("stripe_balance_phase"), {
      statusCode,
      diagPhase: "balance" as const,
    });
    throw wrapped;
  }

  return {
    accountId: account.id,
    accountLivemode: Boolean(account.livemode),
    balanceLivemode: Boolean(balance.livemode),
  };
}

export async function GET() {
  const result = await runCheckoutBindingDiag({
    env: process.env,
    getUser: async () => {
      const user = await getCurrentUser();
      if (!user) return null;
      return { id: user.id, role: user.role };
    },
    stripeReads: stripeAccountAndBalanceReads,
  });

  return NextResponse.json(result.body, {
    status: result.status,
    headers: NO_STORE,
  });
}
