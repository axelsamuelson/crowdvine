"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FooterLogoSvg } from "@/components/layout/footer-logo-svg";
import InfiniteGallery from "@/components/access-request/infinite-gallery";
import { galleryImages } from "@/components/access-request/gallery-images";
import { shouldShowNoB2bAccessMessage } from "@/lib/access-request/no-b2b";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";
import { useTranslations } from "@/lib/hooks/use-translations";

const PACT_ORIGIN = "https://pactwines.com";

interface AccessRequestClientProps {
  reason?: string;
  /** SSR host-gated: only pass "no_b2b" when already on Dirty Wine. */
  showNoB2bFromServer?: boolean;
}

export function AccessRequestClient({
  reason,
  showNoB2bFromServer = false,
}: AccessRequestClientProps) {
  const { t } = useTranslations();
  const serverIsDirtywine = useB2BModeServerHint();
  const [showNoB2BMessage, setShowNoB2BMessage] = useState(
    showNoB2bFromServer,
  );

  // Reconcile with client host + ?b2b=1 (SSR hint cannot see query on localhost).
  useEffect(() => {
    const fromClient = shouldShowNoB2bAccessMessage({
      reason,
      host: window.location.hostname,
      searchParams: new URLSearchParams(window.location.search),
    });
    // Production dirtywine.se: SSR hint is enough if client host parse fails.
    setShowNoB2BMessage(
      fromClient || (reason === "no_b2b" && serverIsDirtywine),
    );
  }, [reason, serverIsDirtywine]);

  // Smart access check: skip when showing no_b2b (user has PACT access but hit dirtywine.se)
  useEffect(() => {
    if (showNoB2BMessage) return;

    const checkExistingAccess = async () => {
      try {
        const response = await fetch("/api/me/access");
        const data = await response.json();

        if (data.access) {
          const urlParams = new URLSearchParams(window.location.search);
          const next =
            urlParams.get("next") || urlParams.get("redirectedFrom") || "/";
          window.location.href = next;
          return;
        }
      } catch (error) {
        console.log("Access check failed, showing access request form");
      }
    };

    checkExistingAccess();
  }, [showNoB2BMessage]);

  return (
    <main className="relative min-h-screen font-sans">
      {/*
        Fixed stacking context: gallery under chrome. Light scrim behind
        logo/text/button (no mix-blend, no opaque black plates).
      */}
      <div className="fixed inset-0 isolate overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{ transform: "translateZ(0)" }}
          aria-hidden
        >
          <InfiniteGallery
            images={galleryImages}
            speed={1.2}
            zSpacing={3}
            visibleCount={12}
            falloff={{ near: 0.8, far: 14 }}
            className="h-full w-full"
          />
        </div>

        {/* CTA chrome above gallery */}
        <div
          className="pointer-events-none absolute inset-0 z-10 flex h-[100dvh] items-center justify-center px-3 text-foreground"
          style={{ transform: "translateZ(0)" }}
        >
          <div className="pointer-events-auto relative w-full max-w-md">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-4 -inset-y-6 rounded-2xl bg-background/80 backdrop-blur-md"
            />
            <div className="relative flex flex-col items-center justify-center gap-6 text-center">
              <div className="flex justify-center">
                <FooterLogoSvg className="h-16 w-auto text-foreground sm:h-20 lg:h-24" />
              </div>
              {showNoB2BMessage ? (
                <>
                  <p className="text-sm font-medium text-foreground">
                    {t("accessRequest.noB2bMessage")}
                  </p>
                  <Button
                    variant="iconButton"
                    onClick={() => {
                      window.location.href = PACT_ORIGIN;
                    }}
                    className="w-full font-semibold"
                    size="lg"
                  >
                    {t("accessRequest.goToPact")}
                  </Button>
                </>
              ) : (
                <Button
                  variant="iconButton"
                  onClick={() => {
                    const urlParams = new URLSearchParams(
                      window.location.search,
                    );
                    const next =
                      urlParams.get("next") ||
                      urlParams.get("redirectedFrom") ||
                      "/";
                    window.location.href = `/log-in?next=${encodeURIComponent(next)}`;
                  }}
                  className="w-full font-semibold"
                  size="lg"
                >
                  {t("accessRequest.membersOnly")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom motto — solid foreground; light scrim */}
        <div
          className="pointer-events-none absolute bottom-10 left-0 right-0 z-10 flex justify-center px-3"
          style={{ transform: "translateZ(0)" }}
        >
          <div className="relative px-4 py-2 text-center font-sans text-[11px] font-semibold uppercase tracking-[0.04em] text-foreground">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 rounded-lg bg-background/80 backdrop-blur-md"
            />
            <p>{t("accessRequest.tagline")}</p>
            <p>{t("accessRequest.invitationLine")}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
