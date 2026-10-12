import { ProducerBoxesForm } from "@/app/admin/producer-boxes/producer-boxes-form";
import { getProducerBoxesEditorState } from "@/lib/producer-boxes/actions";

export const dynamic = "force-dynamic";

export default async function AdminProducerBoxesPage() {
  const state = await getProducerBoxesEditorState();
  return <ProducerBoxesForm boxes={state.boxes} source={state.source} />;
}
