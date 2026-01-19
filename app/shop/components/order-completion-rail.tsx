"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Collection } from "@/lib/shopify/types";
import type { ProducerValidation } from "@/lib/checkout-validation";
import { useCart } from "@/components/cart/cart-context";

const serializeCart = (cart: any) => {
  return JSON.stringify(
    (cart?.lines || []).map((line: any) => ({
      merchandiseId: line?.merchandise?.id,
      quantity: line?.quantity,
    })),
  );
};

export function OrderCompletionRail({
  collections,
}: {
  collections: Pick<Collection, "handle" | "title">[];
}) {
  const { cart } = useCart();
  const [validations, setValidations] = useState<ProducerValidation[]>([]);
  const [isHidden, setIsHidden] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const serializedCart = useRef(cart ? serializeCart(cart) : undefined);

  useEffect(() => {
    if (!cart || cart.lines.length === 0) {
      setValidations([]);
      return;
    }

    const nextSerialized = serializeCart(cart);
    // Avoid refetch loops
    if (serializedCart.current === nextSerialized) return;
    serializedCart.current = nextSerialized;

    const run = async () => {
      setIsValidating(true);
      try {
        const res = await fetch("/api/cart/validate");
        const data = await res.json();
        const vals = (data?.producerValidations || []) as ProducerValidation[];
        setValidations(vals.filter((v) => !v.isValid));
      } catch {
        setValidations([]);
      } finally {
        setIsValidating(false);
      }
    };

    // tiny debounce so rapid add-to-cart doesn't spam
    const t = setTimeout(run, 150);
    return () => clearTimeout(t);
  }, [cart]);

  const visibleValidations = useMemo(() => validations.slice(0, 2), [validations]);

  if (validations.length === 0) return null;

  return (
    <>
      {!isHidden && (
        <div className="sticky top-0 z-30 pt-top-spacing pr-sides">
          <div className="bg-white border border-gray-200 shadow-sm rounded-sm px-3 py-2">
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold text-gray-900 uppercase tracking-wide whitespace-nowrap">
                Complete order
              </div>
              <div className="h-4 w-px bg-gray-200" />

              <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {visibleValidations.map((validation) => {
                  const collection = collections.find(
                    (c) => c.handle === validation.producerHandle,
                  );
                  const current = validation?.quantity || 0;
                  const required =
                    (validation?.quantity || 0) + (validation?.needed || 0);
                  const progress =
                    required > 0 ? Math.min((current / required) * 100, 100) : 0;

                  return (
                    <div key={validation.producerHandle} className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-700 truncate">
                          {collection?.title || validation.producerHandle}
                        </span>
                        <span className="text-[11px] text-gray-500 tabular-nums shrink-0">
                          {current}/{required}
                        </span>
                      </div>
                      <div className="mt-1 relative h-1 bg-gray-100 overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-black transition-all duration-500 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {validations.length > 2 && (
                  <div className="text-[11px] text-gray-500">
                    +{validations.length - 2} more producers
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isValidating && (
                  <div
                    className="w-3 h-3 border border-gray-400/40 border-t-gray-700 rounded-full animate-spin"
                    aria-label="Validating cart"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setIsHidden(true)}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="Hide order progress"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isHidden && (
        <div className="sticky top-0 z-30 pt-top-spacing pr-sides">
          <button
            type="button"
            onClick={() => setIsHidden(false)}
            className="bg-white border border-gray-200 shadow-sm rounded-sm px-3 py-2 inline-flex items-center gap-2"
            title="Show order progress"
          >
            <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
              Complete order
            </span>
            <span className="text-[11px] text-gray-500 tabular-nums">
              {validations.length}
            </span>
          </button>
        </div>
      )}
    </>
  );
}


