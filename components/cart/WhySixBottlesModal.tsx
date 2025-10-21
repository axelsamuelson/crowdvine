"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const faqs: FAQItem[] = [
    {
      id: "single-bottles",
      question: "Why can't I buy just one or two bottles?",
      answer: "Because producers pack and ship wine in 6-bottle boxes. It keeps transport efficient, safe, and affordable — no repacking or broken bottles.",
      icon: "🍷"
    },
    {
      id: "mix-wines",
      question: "Can I mix different wines in one box?",
      answer: "Yes — as long as they're from the same producer. You can fill your 6-bottle box with any mix of that producer's wines.",
      icon: "🔄"
    },
    {
      id: "different-producers",
      question: "Why can't I mix wines from different producers?",
      answer: "Each producer ships their own wines directly to you. Mixing between producers would require repacking, extra handling, and higher costs — which we avoid.",
      icon: "🚫"
    },
    {
      id: "producer-groups",
      question: "What's a \"producer group\"?",
      answer: "It's a set of nearby winemakers who share logistics. If producers belong to the same group, you can mix their wines in the same box.",
      icon: "👥"
    },
    {
      id: "separate-boxes",
      question: "Why does every producer need a separate box?",
      answer: "Because each producer (or group) prepares, seals, and labels their boxes for shipment. This guarantees origin, authenticity, and fair transport costs.",
      icon: "📦"
    },
    {
      id: "incomplete-box",
      question: "What happens if my box isn't full yet?",
      answer: "You'll see the progress bar — once it reaches 6 bottles, the box is complete and ready to ship. Until then, you can add more bottles or wait for others to join.",
      icon: "⏳"
    },
    {
      id: "pay-per-bottle",
      question: "Why not let me pay per bottle and combine later?",
      answer: "That would mean repacking bottles from different wineries, breaking seals, and adding warehouse costs — exactly what we're avoiding to keep prices fair and shipping green.",
      icon: "💰"
    }
  ];

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
        className="relative w-full max-w-3xl max-h-[85vh] bg-background/98 backdrop-blur-xl border border-border/20 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/10">
          <h2 className="text-xl font-light text-foreground tracking-wide">
            Why 6 bottles per producer?
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted-foreground/5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground/70" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          <div className="space-y-3">
            {faqs.map((faq) => {
              const isExpanded = expandedItems.has(faq.id);
              
              return (
                <motion.div
                  key={faq.id}
                  initial={false}
                  animate={{ height: "auto" }}
                  className="border border-border/10 rounded-2xl overflow-hidden hover:border-border/20 transition-colors"
                >
                  {/* Question */}
                  <button
                    onClick={() => toggleExpanded(faq.id)}
                    className="w-full p-5 text-left hover:bg-muted-foreground/3 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{faq.icon}</span>
                      <span className="text-base font-light text-foreground group-hover:text-foreground/90 transition-colors">
                        {faq.question}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground/60" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground/60" />
                    )}
                  </button>

                  {/* Answer */}
                  <motion.div
                    initial={false}
                    animate={{
                      height: isExpanded ? "auto" : 0,
                      opacity: isExpanded ? 1 : 0,
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-0">
                      <p className="text-sm text-muted-foreground leading-relaxed font-light">
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
        <div className="p-6 border-t border-border/10">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl hover:from-amber-600 hover:to-amber-700 transition-all duration-200 font-medium tracking-wide shadow-lg hover:shadow-xl"
          >
            Got it!
          </button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
