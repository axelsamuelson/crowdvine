"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import type { ProducerValidation } from "@/lib/checkout-validation";

const serializeCart = (cart: any) =>
  JSON.stringify(
    (cart?.lines || []).map((line: any) => ({
      merchandiseId: line?.merchandise?.id,
      quantity: line?.quantity,
    })),
  );

export function CompleteOrderRail({ showMobile = false }: { showMobile?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { cart } = useCart();
  const [validations, setValidations] = useState<ProducerValidation[]>([]);
  const [isHidden, setIsHidden] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const isShopRoute = pathname === "/shop" || pathname.startsWith("/shop/");
  const cartSignature = useMemo(() => (cart ? serializeCart(cart) : ""), [cart]);
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!isShopRoute) {
      setValidations([]);
      setIsValidating(false);
      return;
    }

    if (!cart || cart.lines.length === 0) {
      setValidations([]);
      setIsValidating(false);
      return;
    }

    const attempt = ++attemptRef.current;
    const controller = new AbortController();

    const runValidate = async () => {
      setIsValidating(true);
      try {
        const res = await fetch("/api/cart/validate", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json();
        const vals = (data?.producerValidations || []) as ProducerValidation[];
        if (attemptRef.current === attempt) {
          setValidations(vals.filter((v) => !v.isValid));
        }
      } catch {
        if (attemptRef.current === attempt) setValidations([]);
      } finally {
        if (attemptRef.current === attempt) setIsValidating(false);
      }
    };

    // Debounce a bit so the server-side cart has time to catch up after add/remove.
    const t1 = setTimeout(runValidate, 500);

    // Safety retry: if server was behind, try once more shortly after.
    const t2 = setTimeout(() => {
      if (attemptRef.current !== attempt) return;
      runValidate();
    }, 1400);

    return () => {
      controller.abort();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isShopRoute, cartSignature]);

  const visible = useMemo(() => validations.slice(0, 2), [validations]);
  if (!isShopRoute || validations.length === 0) return null;

  const primary = validations[0];
  const primaryCurrent = primary?.quantity || 0;
  const primaryRequired = (primary?.quantity || 0) + (primary?.needed || 0);
  const primaryProgress =
    primaryRequired > 0
      ? Math.min((primaryCurrent / primaryRequired) * 100, 100)
      : 0;

  const goToProducer = () => {
    const handle = primary?.producerHandle;
    if (!handle) return;
    router.push(`/shop/${handle}`);
  };

  // Inline header variant: should sit inside the top nav bar, left of HOME
  if (isHidden) {
    return (
      <button
        type="button"
        onClick={() => setIsHidden(false)}
        className="hidden md:inline-flex items-center gap-2 h-7 px-3 rounded-sm border border-gray-200 bg-white/95 backdrop-blur-md shadow-xs hover:bg-white transition-colors"
        title="Show order progress"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-900">
          Complete order
        </span>
        <span className="text-[11px] text-gray-500 tabular-nums">
          {validations.length}
        </span>
      </button>
    );
  }

  return (
    <>
      {/* Desktop: compact rail inside the top nav pill, left of HOME */}
      <div className="hidden md:flex items-center h-7 min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={goToProducer}
            className="flex items-center gap-2 min-w-0 flex-1 rounded-sm border border-gray-200 bg-white/95 backdrop-blur-md shadow-xs px-2.5 py-0.5 text-left hover:bg-white transition-colors"
            aria-label={`Filter by producer ${primary?.producerName || primary?.producerHandle}`}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-900 whitespace-nowrap">
              Complete order
            </span>
            <span className="text-[11px] text-gray-400 whitespace-nowrap">•</span>
            <span className="text-[11px] text-gray-900 tabular-nums whitespace-nowrap">
              {primaryCurrent}/{primaryRequired}
            </span>
            <span className="text-[11px] text-gray-900 truncate min-w-0">
              {primary?.producerName || primary?.producerHandle}
            </span>
            {validations.length > 1 && (
              <span className="text-[11px] text-gray-500 whitespace-nowrap">
                +{validations.length - 1} more
              </span>
            )}

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <div className="w-28 h-1 bg-gray-100 overflow-hidden rounded-full">
                <div
                  className="h-full bg-black transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${primaryProgress}%` }}
                />
              </div>

              {isValidating && (
                <div
                  className="w-3 h-3 border border-gray-400/40 border-t-gray-700 rounded-full animate-spin"
                  aria-label="Validating cart"
                />
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsHidden(true)}
            className="h-7 w-7 inline-flex items-center justify-center rounded-sm text-gray-500 hover:text-gray-700 hover:bg-background/10 transition-colors"
            aria-label="Hide order progress"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile: full-width sticky bar under the logo (header is fixed, so this is effectively sticky) */}
      {showMobile && (
        <div className="md:hidden w-full">
          <div
            role="button"
            tabIndex={0}
            onClick={goToProducer}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goToProducer();
              }
            }}
            className="w-full bg-white/95 backdrop-blur-md border border-gray-200 rounded-sm px-2 py-1.5 shadow-sm text-left hover:bg-white transition-colors cursor-pointer select-none"
            aria-label={`Filter by producer ${primary?.producerName || primary?.producerHandle}`}
          >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-900">
                Complete order
              </div>
                <div className="text-[11px] text-gray-700 truncate tabular-nums">
                  {primaryCurrent}/{primaryRequired} • {primary?.producerName || primary?.producerHandle}
                {validations.length > 1 ? ` (+${validations.length - 1} more)` : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsHidden(true)}
              className="h-7 w-7 inline-flex items-center justify-center rounded-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Hide order progress"
              onMouseDown={(e) => e.stopPropagation()}
              onClickCapture={(e) => e.stopPropagation()}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2 w-full h-1 bg-gray-100 overflow-hidden rounded-full">
            <div
              className="h-full bg-black transition-all duration-500 ease-out rounded-full"
              style={{ width: `${primaryProgress}%` }}
            />
          </div>

          {/* keep mobile compact: no extra line */}
          </div>
        </div>
      )}
    </>
  );
}


