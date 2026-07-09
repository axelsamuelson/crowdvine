import type { MenuDocument, StarwinelistSource } from "./types";

export const JSON_MENU_SOURCE_ERROR = "JSON source, no PDF extraction";

export function isJsonMenuDocument(
  document: Pick<MenuDocument, "source_type">,
  source?: Pick<StarwinelistSource, "menu_provider"> | null,
): boolean {
  if (document.source_type === "savantbar_flasklista") return true;
  if (source?.menu_provider === "systemless") return true;
  return false;
}
