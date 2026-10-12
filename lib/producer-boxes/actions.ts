"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { updateSiteContent } from "@/lib/actions/content";
import {
  PRODUCER_BOXES_CONTENT_KEY,
  PRODUCER_BOXES_PATH,
  type ProducerBoxDefinition,
} from "@/lib/producer-boxes/config";
import {
  catalogContainsEmDash,
  parseProducerBoxesCatalog,
  serializeProducerBoxesCatalog,
} from "@/lib/producer-boxes/catalog";
import { loadProducerBoxesCatalog } from "@/lib/producer-boxes/load";

export async function getProducerBoxesEditorState(): Promise<{
  boxes: ProducerBoxDefinition[];
  source: "site_content" | "default";
}> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new Error("Not authorized");
  }
  const catalog = await loadProducerBoxesCatalog();
  return { boxes: catalog.boxes, source: catalog.source };
}

export async function saveProducerBoxesCatalog(
  boxes: ProducerBoxDefinition[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized" };

  const parsed = parseProducerBoxesCatalog({
    boxes: boxes.map((box) => ({
      ...box,
      wineNames: box.wineNames.map((name) => name.trim()).filter(Boolean),
    })),
  });
  if (!parsed) {
    return {
      ok: false,
      error: "Varje låda behöver producent, namn, två texter och exakt sex vinnamn.",
    };
  }
  if (catalogContainsEmDash(parsed)) {
    return {
      ok: false,
      error: "Ta bort em-dash och en-dash i texten innan du sparar.",
    };
  }

  await updateSiteContent(
    PRODUCER_BOXES_CONTENT_KEY,
    serializeProducerBoxesCatalog(parsed),
  );
  revalidatePath(PRODUCER_BOXES_PATH.sv);
  revalidatePath(PRODUCER_BOXES_PATH.en);
  revalidatePath("/admin/producer-boxes");
  return { ok: true };
}
