import type { Metadata } from "next";
import { redirect } from "next/navigation";

/** Alias route — quiz lives on the homepage at /#taste-quiz. */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default function TasteQuizPage() {
  redirect("/#taste-quiz");
}
