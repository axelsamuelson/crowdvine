"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "@/lib/hooks/use-translations";

interface WhySixBottlesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  icon: string;
}

export function WhySixBottlesModal({
  isOpen,
  onClose,
}: WhySixBottlesModalProps) {
  const { t } = useTranslations();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set(["single-bottles"]),
  );

  const faqs: FAQItem[] = useMemo(
    () => [
      {
        id: "single-bottles",
        question: t("cart.whyFaqSingleBottlesQ"),
        answer: t("cart.whyFaqSingleBottlesA"),
        icon: "🍷",
      },
      {
        id: "mix-wines",
        question: t("cart.whyFaqMixWinesQ"),
        answer: t("cart.whyFaqMixWinesA"),
        icon: "🔄",
      },
      {
        id: "different-producers",
        question: t("cart.whyFaqDifferentProducersQ"),
        answer: t("cart.whyFaqDifferentProducersA"),
        icon: "🚫",
      },
      {
        id: "producer-groups",
        question: t("cart.whyFaqProducerGroupsQ"),
        answer: t("cart.whyFaqProducerGroupsA"),
        icon: "👥",
      },
      {
        id: "separate-boxes",
        question: t("cart.whyFaqSeparateBoxesQ"),
        answer: t("cart.whyFaqSeparateBoxesA"),
        icon: "📦",
      },
    ],
    [t],
  );

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl max-h-[80vh] bg-background border border-border/20 rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-muted-foreground/10 rounded-lg transition-colors z-10"
          aria-label={t("cart.closeAria")}
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="p-5 max-h-[80vh] overflow-y-auto">
          <div className="space-y-2">
            {faqs.map((faq) => {
              const isExpanded = expandedItems.has(faq.id);
              
              return (
                <motion.div
                  key={faq.id}
                  initial={false}
                  animate={{ height: "auto" }}
                  className="border border-border/20 rounded-lg overflow-hidden hover:border-border/30 transition-colors"
                >
                  {/* Question */}
                  <button
                    onClick={() => toggleExpanded(faq.id)}
                    className="w-full p-4 text-left hover:bg-muted-foreground/5 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{faq.icon}</span>
                      <span className="text-sm font-medium text-foreground">
                        {faq.question}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Answer */}
                  <motion.div
                    initial={false}
                    animate={{
                      height: isExpanded ? "auto" : 0,
                      opacity: isExpanded ? 1 : 0,
                    }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-0">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border/10">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors font-medium"
          >
            {t("cart.gotIt")}
          </button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
