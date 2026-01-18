import { WineIdentityQuiz } from "@/components/wine-identity/wine-identity-quiz";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WineIdentityPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-sides py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Wine Identity
          </h1>
          <p className="text-muted-foreground">
            Tell us about your wine preferences to get personalized recommendations
          </p>
        </div>
        <WineIdentityQuiz />
      </div>
    </div>
  );
}




