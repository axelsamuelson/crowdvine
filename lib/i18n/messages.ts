import type { AppLocale } from "@/lib/i18n/locale";
import en from "@/messages/en.json";
import sv from "@/messages/sv.json";

export type MessageTree = Record<string, string | MessageTree>;

const CATALOGS: Record<AppLocale, MessageTree> = {
  en: en as MessageTree,
  sv: sv as MessageTree,
};

function getNested(tree: MessageTree, path: string): string | undefined {
  const parts = path.split(".");
  let cur: string | MessageTree = tree;
  for (const p of parts) {
    if (typeof cur !== "object" || cur == null || !(p in cur)) return undefined;
    cur = cur[p] as string | MessageTree;
  }
  return typeof cur === "string" ? cur : undefined;
}

export function translate(
  locale: AppLocale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const raw = getNested(CATALOGS[locale], key) ?? getNested(CATALOGS.en, key) ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = params[name];
    return v != null ? String(v) : `{${name}}`;
  });
}
