"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FooterLogoSvg } from "@/components/layout/footer-logo-svg";
import InfiniteGallery from "@/components/access-request/infinite-gallery";
import { galleryImages } from "@/components/access-request/gallery-images";

export function AccessRequestClient() {
  // Smart access check: check authentication and access status
  useEffect(() => {
    const checkExistingAccess = async () => {
      try {
        // Check if user is authenticated and has access
        const response = await fetch("/api/me/access");
        const data = await response.json();

        if (data.access) {
          // User is authenticated and has access, redirect to destination
          const urlParams = new URLSearchParams(window.location.search);
          const next =
            urlParams.get("next") || urlParams.get("redirectedFrom") || "/";
          window.location.href = next;
          return;
        }
      } catch (error) {
        // Ignore errors, show access request form normally
        console.log("Access check failed, showing access request form");
      }
    };

    checkExistingAccess();
  }, []);

  return (
    <main className="min-h-screen">
      <InfiniteGallery
        images={galleryImages}
        speed={1.2}
        zSpacing={3}
        visibleCount={12}
        falloff={{ near: 0.8, far: 14 }}
        className="h-[100dvh] w-full rounded-lg overflow-hidden"
      />

      {/* Only CTA overlay */}
      <div className="h-[100dvh] inset-0 pointer-events-none fixed flex items-center justify-center px-3 mix-blend-exclusion text-white">
        <div className="pointer-events-auto w-full max-w-md flex flex-col items-center justify-center gap-6 text-center">
          <div className="flex justify-center">
            <FooterLogoSvg className="h-16 sm:h-20 lg:h-24 w-auto text-white" />
          </div>
          <Button
            onClick={() => {
              const urlParams = new URLSearchParams(window.location.search);
              const next =
                urlParams.get("next") || urlParams.get("redirectedFrom") || "/";
              window.location.href = `/log-in?next=${encodeURIComponent(next)}`;
            }}
            className="w-full bg-white/20 hover:bg-white/30 border-white/30 text-white font-semibold backdrop-blur-sm shadow-lg transition-all duration-300 ease-out"
            size="lg"
          >
            Members only
          </Button>
        </div>
      </div>

      {/* Bottom instructions (template style) */}
      <div className="text-center fixed bottom-10 left-0 right-0 font-mono uppercase text-[11px] font-semibold text-white/90 mix-blend-exclusion">
        <p>Wine, but not like this.</p>
        <p className="opacity-60">Membership by invitation.</p>
      </div>
    </main>
  );
}
