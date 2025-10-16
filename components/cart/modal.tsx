"use client";

import { ArrowRight, PlusCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useCart } from "./cart-context";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button";
import { Loader } from "../ui/loader";
import { CartItemCard } from "./cart-item";
import { formatPrice } from "@/lib/shopify/utils";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Cart } from "../../lib/shopify/types";
import { CartValidationDisplay } from "./cart-validation-display";
import type { ProducerValidation } from "@/lib/checkout-validation";

const CartContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <div className={cn("px-3 md:px-4", className)}>{children}</div>;
};

const CartItems = ({ closeCart, validations, isValidating }: { closeCart: () => void; validations: ProducerValidation[]; isValidating: boolean }) => {
  const { cart } = useCart();

  if (!cart) return <></>;

  return (
    <div className="flex flex-col justify-between h-full overflow-hidden">
      <CartContainer className="flex justify-between px-2 text-sm text-muted-foreground">
        <span>Products</span>
        <span>{cart.lines.length} items</span>
      </CartContainer>
      <div className="relative flex-1 min-h-0 py-4 overflow-x-hidden">
        <CartContainer className="overflow-y-auto flex flex-col gap-y-3 h-full scrollbar-hide">
          <AnimatePresence>
            {cart.lines.map((item, i) => (
              <motion.div
                key={item.merchandise.id}
                layout
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: i * 0.1, ease: "easeOut" }}
              >
                <CartItemCard item={item} onCloseCart={closeCart} />
              </motion.div>
            ))}
          </AnimatePresence>
        </CartContainer>
      </div>
      
      {/* Validation Display - hidden since we show validation in the button */}
      {/* <CartValidationDisplay 
        validations={validations} 
        isLoading={isValidating}
      /> */}
      
      <CartContainer>
        <div className="py-4 text-sm text-foreground/50 shrink-0">
          <div className="flex justify-between items-center pb-1 mb-3 border-b border-muted-foreground/20">
            <p>Taxes</p>
            <p className="text-right">Calculated at checkout</p>
          </div>
          <div className="flex justify-between items-center pt-1 pb-1 mb-3 border-b border-muted-foreground/20">
            <p>Shipping</p>
            <p className="text-right">Calculated at checkout</p>
          </div>
          <div className="flex justify-between items-center pt-1 pb-1 mb-1.5 text-lg font-semibold">
            <p>Total</p>
            <p className="text-base text-right text-foreground">
              {formatPrice(
                cart.cost.totalAmount.amount,
                cart.cost.totalAmount.currencyCode,
              )}
            </p>
          </div>
        </div>
        <CheckoutButton closeCart={closeCart} validations={validations} isValidating={isValidating} />
      </CartContainer>
    </div>
  );
};

const serializeCart = (cart: Cart) => {
  return JSON.stringify(
    cart.lines.map((line) => ({
      merchandiseId: line.merchandise.id,
      quantity: line.quantity,
    })),
  );
};

export default function CartModal() {
  const { cart, isPending } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [validations, setValidations] = useState<ProducerValidation[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const serializedCart = useRef(cart ? serializeCart(cart) : undefined);

  useBodyScrollLock(isOpen);

  // Validate cart whenever it changes (with debounce)
  useEffect(() => {
    if (!cart || cart.lines.length === 0) {
      setValidations([]);
      return;
    }

    // Debounce validation to avoid too many API calls
    const timeoutId = setTimeout(async () => {
      setIsValidating(true);
      try {
        console.log("🔍 [Cart Modal] Validating cart with", cart.lines.length, "items");
        
        // Call API endpoint instead of running validation client-side
        const response = await fetch("/api/cart/validate");
        const result = await response.json();
        
        console.log("✅ [Cart Modal] Validation result:", result);
        setValidations(result.producerValidations || []);
      } catch (error) {
        console.error("❌ [Cart Modal] Validation error:", error);
        setValidations([]);
      } finally {
        setIsValidating(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [cart]);

  useEffect(() => {
    if (!cart) return;

    const newSerializedCart = serializeCart(cart);

    // Initialize on first load
    if (serializedCart.current === undefined) {
      serializedCart.current = newSerializedCart;
      return;
    }

    // Only open cart if items were actually added/changed
    // Don't open if cart became empty (items removed or cart cleared)
    if (serializedCart.current !== newSerializedCart) {
      serializedCart.current = newSerializedCart;
      
      // Only open if cart has items (don't open on empty cart)
      if (cart.lines.length > 0) {
        setIsOpen(true);
      }
    }
  }, [cart]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  // Check if there are validation errors
  const hasValidationErrors = validations.some((v) => !v.isValid);

  const renderCartContent = () => {
    if (!cart || cart.lines.length === 0) {
      return (
        <CartContainer className="flex w-full">
          <Link
            href="/shop"
            className="p-2 w-full rounded-lg border border-dashed bg-background border-border"
            onClick={closeCart}
          >
            <div className="flex flex-row gap-6">
              <div className="flex overflow-hidden relative justify-center items-center rounded-sm border border-dashed size-20 shrink-0 border-border">
                <PlusCircleIcon className="size-6 text-muted-foreground" />
              </div>
              <div className="flex flex-col flex-1 gap-2 justify-center 2xl:gap-3">
                <span className="text-lg font-semibold 2xl:text-xl">
                  Cart is empty
                </span>
                <p className="text-sm text-muted-foreground hover:underline">
                  Start shopping to get started
                </p>
              </div>
            </div>
          </Link>
        </CartContainer>
      );
    }

    return <CartItems closeCart={closeCart} validations={validations} isValidating={isValidating} />;
  };

  // Don't render cart button if no cart data
  if (!cart) {
    return null;
  }

  return (
    <>
      <Button
        aria-label="Open cart"
        onClick={openCart}
        className={`font-semibold cursor-pointer inline-flex items-center justify-center whitespace-nowrap text-base transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border border-transparent text-white shadow-xs h-7 rounded-sm gap-1.5 py-1 px-2 [&_svg:not([class*='size-'])]:size-4 has-[>svg]:pr-1.5 uppercase ${
          hasValidationErrors 
            ? "bg-amber-600 hover:bg-amber-700" 
            : "bg-black hover:bg-black/90"
        }`}
        size={"sm"}
        disabled={isPending}
      >
        {isPending ? (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 border border-current/40 border-t-current rounded-full animate-spin"></div>
            <span className="max-md:hidden">cart</span>
          </div>
        ) : (
          <>
            <span className="max-md:hidden">cart</span> ({cart.totalQuantity})
          </>
        )}
      </Button>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 z-50 bg-foreground/30"
              onClick={closeCart}
              aria-hidden="true"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed top-0 bottom-0 right-0 flex w-full md:w-[500px] p-modal-sides z-50"
            >
              <div className="flex flex-col py-3 w-full rounded bg-muted md:py-4">
                <CartContainer className="flex justify-between items-baseline mb-10">
                  <p className="text-2xl font-semibold">Cart</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Close cart"
                    onClick={closeCart}
                  >
                    Close
                  </Button>
                </CartContainer>

                {renderCartContent()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function CheckoutButton({ closeCart, validations = [], isValidating = false }: { closeCart: () => void; validations?: ProducerValidation[]; isValidating?: boolean }) {
  const { pending } = useFormStatus();
  const { cart, isPending } = useCart();
  const router = useRouter();

  const checkoutUrl = cart?.checkoutUrl;
  
  // Check if there are validation errors
  const hasValidationErrors = validations.some((v) => !v.isValid);
  const invalidValidations = validations.filter((v) => !v.isValid);
  
  // Get the first invalid producer/group to redirect to
  const firstInvalidValidation = invalidValidations[0];
  const redirectUrl = firstInvalidValidation?.groupId 
    ? `/shop/group/${firstInvalidValidation.groupId}`
    : firstInvalidValidation?.producerHandle 
    ? `/shop/${firstInvalidValidation.producerHandle}`
    : '/shop';

  const isLoading = pending || isValidating;
  const isDisabled = !checkoutUrl || isPending;

  return (
    <Button
      type="submit"
      disabled={isDisabled && !hasValidationErrors}
      className={`font-semibold cursor-pointer whitespace-nowrap text-base transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border border-transparent shadow-xs h-12 rounded-md px-3 has-[>svg]:pr-3 [&_svg:not([class*='size-'])]:size-6 flex relative gap-3 justify-between items-center w-full ${
        hasValidationErrors 
          ? "bg-amber-600 hover:bg-amber-700 text-white" 
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      }`}
      onClick={() => {
        if (hasValidationErrors) {
          // Redirect to producer/group page to add more bottles
          closeCart();
          router.push(redirectUrl);
        } else if (checkoutUrl) {
          // Normal checkout flow
          closeCart();
          router.push(checkoutUrl);
        }
      }}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={isLoading ? "loading" : "content"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex justify-center items-center w-full"
        >
          {isLoading ? (
            <Loader size="default" />
          ) : (
            <div className="flex justify-between items-center w-full">
              <span>
                {isValidating 
                  ? "Validating..."
                  : hasValidationErrors 
                    ? `${invalidValidations.length} producer${invalidValidations.length > 1 ? 's' : ''} need${invalidValidations.length === 1 ? 's' : ''} more bottles`
                    : "Proceed to Checkout"
                }
              </span>
              <ArrowRight className="size-6" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Button>
  );
}
