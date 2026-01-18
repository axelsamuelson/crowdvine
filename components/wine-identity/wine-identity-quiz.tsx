"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wine, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Question {
  id: string;
  question: string;
  options: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
  multiple?: boolean;
}

const questions: Question[] = [
  {
    id: "color_preference",
    question: "What wine colors do you prefer?",
    multiple: true,
    options: [
      { value: "red", label: "Red", description: "Bold and rich" },
      { value: "white", label: "White", description: "Crisp and refreshing" },
      { value: "rose", label: "Rosé", description: "Light and fruity" },
      { value: "orange", label: "Orange", description: "Complex and unique" },
    ],
  },
  {
    id: "body_preference",
    question: "What body style do you prefer?",
    options: [
      { value: "light", label: "Light", description: "Delicate and subtle" },
      { value: "medium", label: "Medium", description: "Balanced" },
      { value: "full", label: "Full", description: "Rich and intense" },
    ],
  },
  {
    id: "sweetness",
    question: "How do you prefer your wine?",
    options: [
      { value: "dry", label: "Dry", description: "No residual sugar" },
      { value: "off_dry", label: "Off-dry", description: "Slightly sweet" },
      { value: "sweet", label: "Sweet", description: "Noticeably sweet" },
    ],
  },
  {
    id: "flavor_profile",
    question: "What flavors do you enjoy?",
    multiple: true,
    options: [
      { value: "fruity", label: "Fruity", description: "Berry, citrus, tropical" },
      { value: "earthy", label: "Earthy", description: "Mushroom, forest floor" },
      { value: "spicy", label: "Spicy", description: "Pepper, cinnamon" },
      { value: "floral", label: "Floral", description: "Rose, lavender" },
      { value: "mineral", label: "Mineral", description: "Stone, slate" },
    ],
  },
  {
    id: "price_range",
    question: "What's your typical price range?",
    options: [
      { value: "budget", label: "Budget", description: "Under 150 kr" },
      { value: "mid", label: "Mid-range", description: "150-300 kr" },
      { value: "premium", label: "Premium", description: "300-500 kr" },
      { value: "luxury", label: "Luxury", description: "500+ kr" },
    ],
  },
  {
    id: "occasion",
    question: "When do you typically drink wine?",
    multiple: true,
    options: [
      { value: "daily", label: "Daily", description: "Regular enjoyment" },
      { value: "dinner", label: "Dinner", description: "With meals" },
      { value: "social", label: "Social", description: "With friends" },
      { value: "special", label: "Special occasions", description: "Celebrations" },
    ],
  },
];

export function WineIdentityQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const question = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;
  const canProceed = answers[question.id] && answers[question.id].length > 0;

  const handleSelect = (value: string) => {
    if (question.multiple) {
      const currentAnswers = answers[question.id] || [];
      if (currentAnswers.includes(value)) {
        setAnswers({
          ...answers,
          [question.id]: currentAnswers.filter((a) => a !== value),
        });
      } else {
        setAnswers({
          ...answers,
          [question.id]: [...currentAnswers, value],
        });
      }
    } else {
      setAnswers({
        ...answers,
        [question.id]: [value],
      });
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/user/wine-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: answers }),
      });

      if (response.ok) {
        toast.success("Wine Identity saved!");
        router.push("/profile");
      } else {
        toast.error("Failed to save Wine Identity");
      }
    } catch (error) {
      console.error("Error saving wine identity:", error);
      toast.error("Failed to save Wine Identity");
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="rounded-xl border border-gray-200/70 bg-white/90 backdrop-blur p-6 md:p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          {question.question}
        </h2>

        <div className="space-y-3">
          {question.options.map((option) => {
            const isSelected = answers[question.id]?.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "w-full text-left p-4 rounded-lg border transition-all duration-200",
                  isSelected
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0",
                          isSelected
                            ? "border-gray-900 bg-gray-900"
                            : "border-gray-300"
                        )}
                      >
                        {isSelected && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {option.label}
                        </p>
                        {option.description && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            {option.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentQuestion === 0}
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canProceed || isSubmitting}
          className="bg-gray-900 text-white hover:bg-gray-800"
        >
          {isSubmitting ? (
            "Saving..."
          ) : isLastQuestion ? (
            <>
              Complete
              <Check className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}




