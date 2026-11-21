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

/** Dev-only screenshot harness: localStorage __welcome_gate_sim={userId,member,seen}. */
function readWelcomeGateSim(): {
  userId: string;
  member: boolean;
  seen: boolean;
} | null {
  if (typeof window === "undefined") return null;
  if (process.env.NODE_ENV === "production") return null;
  try {
    const raw = window.localStorage.getItem("__welcome_gate_sim");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      userId?: string;
      member?: boolean;
      seen?: boolean;
    };
    if (!parsed.userId) return null;
    return {
      userId: parsed.userId,
      member: parsed.member !== false,
      seen: Boolean(parsed.seen),
    };
  } catch {
    return null;
  }
}

/**
 * Mounts WelcomeModal only for authenticated members (never anonymous).
 * Gate: feature flag + session user + membership + allowlisted path + unseen + cart closed.
 */
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
  const flagOn = welcomeModalEnabled ?? isWelcomeModalEnabled();
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
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
    // Manual open (API compat) — flag + logged-in member only (never anonymous).
    if (!flagOn || !userId || !isMember) return;
    setIsOpen(true);
  }, [flagOn, userId, isMember]);

  // Resolve session user id (never for anonymous).
  useEffect(() => {
    if (!flagOn) {
      setUserId(null);
      setIsMember(false);
      return;
    }

    const sim = readWelcomeGateSim();
    if (sim) {
      setUserId(sim.userId);
      setIsMember(sim.member);
      if (sim.seen) {
        writeWelcomeSeenLocal(sim.userId);
      } else {
        try {
          window.localStorage.removeItem(`pact_welcome_seen:${sim.userId}`);
        } catch {
          // ignore
        }
      }
      return;
    }

    if (!hasSupabaseAuthCookieHint()) {
      setUserId(null);
      setIsMember(false);
      return;
    }

    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    const resolveMember = async (uid: string | null) => {
      if (!uid) {
        setIsMember(false);
        return;
      }
      try {
        const res = await fetch("/api/user/membership", {
          credentials: "same-origin",
        });
        if (cancelled) return;
        // 200 with membership → member; 401/404 → not a member for this modal.
        setIsMember(res.ok);
      } catch {
        if (!cancelled) setIsMember(false);
      }
    };

    try {
      const supabase = createClient();
      void supabase.auth.getUser().then(({ data }) => {
        if (cancelled) return;
        const id = data.user?.id ?? null;
        setUserId(id);
        void resolveMember(id);
      });
      subscription = supabase.auth.onAuthStateChange((_event, session) => {
        const id = session?.user?.id ?? null;
        setUserId(id);
        void resolveMember(id);
      }).data.subscription;
    } catch {
      setUserId(null);
      setIsMember(false);
    }

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [flagOn]);

  // Cart drawer open → never cover it.
  useEffect(() => {
    const onCart = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setCartOpen(Boolean(detail?.open));
    };
    window.addEventListener("cart-drawer-state", onCart);
    return () => window.removeEventListener("cart-drawer-state", onCart);
  }, []);

  // Close if cart opens while welcome is up.
  useEffect(() => {
    if (cartOpen && isOpen) setIsOpen(false);
  }, [cartOpen, isOpen]);

  // Auto-mount once on allowed paths when unseen (members only).
  useEffect(() => {
    if (!flagOn) return;
    if (!userId || !isMember) {
      setIsOpen(false);
      return;
    }
    if (cartOpen) return;
    if (!isWelcomeModalAllowedPath(pathname)) {
      return;
    }
    if (openedOnce.current || isOpen || checking.current) return;

    if (readWelcomeSeenLocal(userId)) {
      openedOnce.current = true;
      return;
    }

    checking.current = true;

    const run = async () => {
      try {
        // Dev gate sim: skip remote (no session cookies) and open when unseen.
        if (readWelcomeGateSim()) {
          openedOnce.current = true;
          setIsOpen(true);
          return;
        }

        const result = await fetchWelcomeSeen();
        if (result.unauthorized) {
          setUserId(null);
          setIsMember(false);
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
      checking.current = false;
    };
  }, [flagOn, userId, isMember, pathname, isOpen, cartOpen]);

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

  // Never render the modal tree for anonymous visitors.
  const mayRenderModal = flagOn && Boolean(userId) && isMember;

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {mayRenderModal ? (
        <WelcomeModal
          isOpen={isOpen && !cartOpen}
          onClose={handleClose}
          directBoxCheckoutEnabled={directBoxCheckoutEnabled}
        />
      ) : null}
    </OnboardingContext.Provider>
  );
}
