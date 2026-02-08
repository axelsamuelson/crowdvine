"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { MemberPrice } from "@/components/ui/member-price";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { StockBadge } from "@/components/product/stock-badge";
import Prose from "@/components/prose";
import { SimpleProductImage } from "@/components/invite-shop/simple-product-image";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/shopify/types";

export default function InviteProductPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const handle = params.handle as string;
  const inviteBasePath = `/b/${code}`;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const showExclVat = useB2BPriceMode();

  useEffect(() => {
    let cancelled = false;

    async function validateAndLoad() {
      if (!code || !handle) return;

      try {
        const [inviteRes, productRes] = await Promise.all([
          fetch("/api/invitations/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          }),
          fetch(`/api/crowdvine/products/${handle}`),
        ]);

        const inviteData = await inviteRes.json();
        if (!inviteData.success) {
          router.push("/access-request");
          return;
        }
        const allowedTypes = inviteData.invitation?.allowed_types ?? [];
        if (!allowedTypes.includes("business") || inviteData.invitation?.used_at) {
          router.push("/access-request");
          return;
        }

        if (!productRes.ok) {
          if (productRes.status === 404) {
            if (!cancelled) setError("Product not found");
          } else {
            if (!cancelled) setError("Failed to load product");
          }
          return;
        }

        const p = (await productRes.json()) as Product;
        if (!cancelled) setProduct(p);
      } catch {
        if (!cancelled) setError("Failed to load product");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    validateAndLoad();
    return () => {
      cancelled = true;
    };
  }, [code, handle, router]);

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (error || !product) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto px-sides py-12">
          <p className="text-muted-foreground mb-4">{error || "Product not found"}</p>
          <Button asChild variant="outline">
            <Link href={inviteBasePath}>
              Back to invite
            </Link>
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-sides py-8 md:py-12">
        <Link
          href={inviteBasePath}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="size-4" />
          Back to invite
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div className="aspect-square bg-muted rounded-lg overflow-hidden">
            <SimpleProductImage product={product} className="w-full h-full" />
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl font-semibold text-foreground">
                {product.title}
              </h1>
              <StockBadge availableForSale={product.availableForSale} />
            </div>
            {product.producerName && (
              <p className="text-muted-foreground mb-4">{product.producerName}</p>
            )}

            <div className="flex items-baseline gap-3 mb-6">
              <MemberPrice
                amount={product.priceRange.minVariantPrice.amount}
                currencyCode={product.priceRange.minVariantPrice.currencyCode}
                className="text-xl font-semibold"
                showBadge={showExclVat}
                priceExclVatOverride={
                  product.priceBreakdown?.b2bPriceExclVat ??
                  (product as any).b2bPriceExclVat
                }
              />
            </div>

            {(product.descriptionHtml || product.description) && (
              <div className="text-muted-foreground text-sm mb-8">
                <Prose
                  html={
                    product.descriptionHtml ||
                    `<p>${product.description}</p>`
                  }
                />
              </div>
            )}

            <div className="mt-auto pt-8 border-t border-border">
              <p className="text-muted-foreground text-sm mb-4">
                Sign up to add to cart and place orders
              </p>
              <Button asChild>
                <Link href={`/b/${code}`}>
                  Create account
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
