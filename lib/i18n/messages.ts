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

/**
 * Minimal ICU plural: `{count, plural, one {# vin} other {# viner}}`.
 * Uses English-style one/other (Swedish one = exactly 1).
 */
function applyIcuPlural(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(
    /\{(\w+),\s*plural,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\}/g,
    (_match, name: string, one: string, other: string) => {
      const raw = params[name];
      const n = typeof raw === "number" ? raw : Number(raw);
      const form = Number.isFinite(n) && n === 1 ? one : other;
      const rendered = Number.isFinite(n) ? String(n) : String(raw ?? "");
      return form.replace(/#/g, rendered);
    },
  );
}

export function translate(
  locale: AppLocale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const raw =
    getNested(CATALOGS[locale], key) ?? getNested(CATALOGS.en, key) ?? key;
  if (!params) return raw;
  const withPlural = applyIcuPlural(raw, params);
  return withPlural.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = params[name];
    return v != null ? String(v) : `{${name}}`;
  });
}
