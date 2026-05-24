import { stripe } from "@/lib/stripe";
import {
  cardDetailsFromStripePaymentMethod,
  type StoredPaymentMethodDetails,
} from "@/lib/stripe/payment-method-display";

export async function resolvePaymentMethodDetailsFromId(
  paymentMethodId: string | null | undefined,
): Promise<StoredPaymentMethodDetails> {
  if (!paymentMethodId?.trim() || !stripe) {
    return {
      payment_method_type: null,
      payment_method_brand: null,
      payment_method_last4: null,
    };
  }

  try {
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId.trim());
    return cardDetailsFromStripePaymentMethod(pm);
  } catch (error) {
    console.warn(
      "[stripe] Failed to retrieve payment method:",
      paymentMethodId,
      error,
    );
    return {
      payment_method_type: null,
      payment_method_brand: null,
      payment_method_last4: null,
    };
  }
}
