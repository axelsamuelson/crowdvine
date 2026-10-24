import { permanentRedirect } from "next/navigation";
import { PRODUCER_BOXES_PATH } from "@/lib/producer-boxes/config";

export default function BoxesPage() {
  permanentRedirect(PRODUCER_BOXES_PATH.sv);
}
