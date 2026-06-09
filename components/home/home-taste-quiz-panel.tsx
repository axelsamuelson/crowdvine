"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { ChevronUp } from "lucide-react";
import { TasteQuiz } from "@/components/taste-quiz/taste-quiz";
import type { TasteQuizWine } from "@/lib/taste-quiz/get-quiz-wines";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/lib/i18n/locale";

type TasteQuizPanelContextValue = {
  isOpen: boolean;
  openTasteQuiz: () => void;
  closeTasteQuiz: () => void;
};

const TasteQuizPanelContext = createContext<TasteQuizPanelContextValue | null>(
  null,
);

export function useTasteQuizPanel() {
  const context = useContext(TasteQuizPanelContext);
  if (!context) {
    throw new Error("useTasteQuizPanel must be used within HomeTasteQuizProvider");
  }
  return context;
}

export function useOptionalTasteQuizPanel() {
  return useContext(TasteQuizPanelContext);
}

export function HomeTasteQuizProvider({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const closeTasteQuiz = useCallback(() => {
    setIsOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    if (window.location.hash) {
      history.replaceState(null, "", "/");
    }
  }, []);

  const openTasteQuiz = useCallback(() => {
    if (!enabled) return;
    setIsOpen(true);
    requestAnimationFrame(() => {
      document.getElementById("taste-quiz")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled || pathname !== "/") {
      prevPathRef.current = pathname;
      return;
    }

    if (window.location.hash === "#taste-quiz") {
      setIsOpen(true);
      history.replaceState(null, "", "/");
      requestAnimationFrame(() => {
        document.getElementById("taste-quiz")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }

    if (prevPathRef.current !== null && prevPathRef.current !== "/") {
      setIsOpen(false);
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      if (window.location.hash) {
        history.replaceState(null, "", "/");
      }
    }

    const onPopState = () => closeTasteQuiz();
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) closeTasteQuiz();
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("pageshow", onPageShow);

    prevPathRef.current = pathname;

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [pathname, enabled, closeTasteQuiz]);

  const value: TasteQuizPanelContextValue = enabled
    ? { isOpen, openTasteQuiz, closeTasteQuiz }
    : {
        isOpen: false,
        openTasteQuiz: () => {},
        closeTasteQuiz: () => {},
      };

  return (
    <TasteQuizPanelContext.Provider value={value}>
      {children}
    </TasteQuizPanelContext.Provider>
  );
}

export function HomeTasteQuizCollapsible({
  wines,
}: {
  wines: TasteQuizWine[];
  locale: AppLocale;
}) {
  const { t } = useTranslations();
  const { isOpen, closeTasteQuiz } = useTasteQuizPanel();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!isOpen) setStarted(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const closeButton = (
    <button
      type="button"
      onClick={closeTasteQuiz}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-sm",
        "border border-stone-200 bg-white px-5 text-sm font-medium text-stone-600",
        "transition-colors hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900",
      )}
      aria-label={t("home.collapseTasteQuiz")}
    >
      <ChevronUp className="size-4" aria-hidden />
      {t("home.collapseTasteQuiz")}
    </button>
  );

  return (
    <section
      id="taste-quiz"
      className="scroll-mt-top-spacing w-full border-b border-stone-200 bg-stone-50"
    >
      <div
        className={cn(
          "mx-auto px-4 py-12 md:px-sides md:py-16",
          started ? "max-w-4xl" : "max-w-lg",
        )}
      >
        {!started ? (
          <div className="space-y-8">
            <div className="space-y-3 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-stone-900 md:text-3xl">
                {t("tasteQuiz.intro.title")}
              </h2>
              <p className="text-base leading-relaxed text-stone-600">
                {t("tasteQuiz.intro.description")}
              </p>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setStarted(true)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-sm bg-stone-900 px-8 text-sm font-medium text-white transition-colors hover:bg-stone-800"
              >
                {t("tasteQuiz.intro.start")}
              </button>
            </div>
          </div>
        ) : (
          <TasteQuiz wines={wines} embedded />
        )}

        <div className="mt-10 flex justify-center border-t border-stone-200/80 pt-8">
          {closeButton}
        </div>
      </div>
    </section>
  );
}
