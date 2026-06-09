import { PageLayout } from "@/components/layout/page-layout";
import { SavedTasteProfileView } from "@/components/taste-quiz/saved-taste-profile-view";
import { getQuizWines } from "@/lib/taste-quiz/get-quiz-wines";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import { getShoppingContextFromRequest } from "@/lib/shopping-context/server";

export const dynamic = "force-dynamic";

export default async function TasteProfilePage() {
  const shoppingContext = await getShoppingContextFromRequest().catch(() =>
    fallbackShoppingContext(),
  );
  const wines = await getQuizWines(shoppingContext.locale);

  return (
    <PageLayout>
      <SavedTasteProfileView wines={wines} />
    </PageLayout>
  );
}
