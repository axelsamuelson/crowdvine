"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { isWelcomeModalEnabled } from "@/lib/onboarding/welcome-modal-flag";
import { isWelcomeModalAllowedPath } from "@/lib/onboarding/welcome-modal-routes";
import {
  fetchWelcomeSeen,
  markWelcomeSeenRemote,
  readWelcomeSeenLocal,
  writeWelcomeSeenLocal,
} from "@/lib/onboarding/welcome-modal-seen";

export interface OnboardingContextType {
  showWelcome: () => void;
  hideWelcome: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}

/** Same as {@link useOnboarding} but returns undefined outside {@link OnboardingProvider} (no throw). */
export function useOnboardingOptional():
  | OnboardingContextType
  | undefined {
  return useContext(OnboardingContext);
}

function hasSupabaseAuthCookieHint(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|;\s*)sb-[^=]+-auth-token/.test(document.cookie);
}

export function OnboardingProvider({
  children,
  directBoxCheckoutEnabled = false,
  welcomeModalEnabled,
}: {
  children: React.ReactNode;
  /** Server-resolved DIRECT_BOX_CHECKOUT_ENABLED (client env lacks non-NEXT_PUBLIC). */
  directBoxCheckoutEnabled?: boolean;
  /** Optional override (tests / server); defaults to isWelcomeModalEnabled(). */
  welcomeModalEnabled?: boolean;
}) {
  const pathname = usePathname();
  const flagOn =
    welcomeModalEnabled ?? isWelcomeModalEnabled();
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const openedOnce = useRef(false);
  const checking = useRef(false);

  const markSeen = useCallback(async (uid: string | null) => {
    if (uid) writeWelcomeSeenLocal(uid);
    await markWelcomeSeenRemote();
  }, []);

  const hideWelcome = useCallback(() => {
    setIsOpen(false);
    void markSeen(userId);
  }, [markSeen, userId]);

  const showWelcome = useCallback(() => {
    // Manual open (API compat) — still requires flag + authenticated user.
    if (!flagOn || !userId) return;
    setIsOpen(true);
  }, [flagOn, userId]);

  // Resolve session user id (never for anonymous).
  useEffect(() => {
    if (!flagOn) {
      setUserId(null);
      return;
    }
    if (!hasSupabaseAuthCookieHint()) {
      setUserId(null);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setUserId(data.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [flagOn]);

  // Auto-mount once on allowed paths when unseen.
  useEffect(() => {
    if (!flagOn) return;
    if (!userId) {
      setIsOpen(false);
      return;
    }
    if (!isWelcomeModalAllowedPath(pathname)) {
      return;
    }
    if (openedOnce.current || isOpen || checking.current) return;

    if (readWelcomeSeenLocal(userId)) {
      openedOnce.current = true;
      return;
    }

    const controller = new AbortController();
    checking.current = true;

    const run = async () => {
      try {
        const result = await fetchWelcomeSeen();
        if (controller.signal.aborted) return;

        if (result.unauthorized) {
          setUserId(null);
          return;
        }

        if (result.onboardingSeen) {
          writeWelcomeSeenLocal(userId);
          openedOnce.current = true;
          return;
        }

        openedOnce.current = true;
        setIsOpen(true);
      } finally {
        checking.current = false;
      }
    };

    const timeoutId = window.setTimeout(() => {
      void run();
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
      checking.current = false;
    };
  }, [flagOn, userId, pathname, isOpen]);

  const handleClose = useCallback(
    (opts?: { method?: string }) => {
      setIsOpen(false);
      void markSeen(userId);
      void opts;
    },
    [markSeen, userId],
  );

  const value = useMemo(
    () => ({ showWelcome, hideWelcome }),
    [showWelcome, hideWelcome],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {flagOn ? (
        <WelcomeModal
          isOpen={isOpen}
          onClose={handleClose}
          directBoxCheckoutEnabled={directBoxCheckoutEnabled}
        />
      ) : null}
    </OnboardingContext.Provider>
  );
}
