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
 * Supports nested `{name}` placeholders inside one/other arms.
 * Uses English-style one/other (Swedish one = exactly 1).
 */
function readBalancedBraceBody(
  template: string,
  openBraceIndex: number,
): { body: string; end: number } | null {
  if (template[openBraceIndex] !== "{") return null;
  let depth = 0;
  for (let i = openBraceIndex; i < template.length; i++) {
    const ch = template[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          body: template.slice(openBraceIndex + 1, i),
          end: i,
        };
      }
    }
  }
  return null;
}

function applyIcuPlural(
  template: string,
  params: Record<string, string | number>,
): string {
  let out = "";
  let i = 0;
  const re = /\{(\w+),\s*plural,\s*one\s*/g;
  while (i < template.length) {
    re.lastIndex = i;
    const match = re.exec(template);
    if (!match) {
      out += template.slice(i);
      break;
    }
    out += template.slice(i, match.index);
    const name = match[1]!;
    const oneStart = match.index + match[0].length; // '{' of one body
    const one = readBalancedBraceBody(template, oneStart);
    if (!one) {
      out += template.slice(match.index, match.index + match[0].length);
      i = match.index + match[0].length;
      continue;
    }
    const afterOne = template.slice(one.end + 1);
    const otherPrefix = afterOne.match(/^\s*other\s*/);
    if (!otherPrefix) {
      out += template.slice(match.index, one.end + 1);
      i = one.end + 1;
      continue;
    }
    const otherStart = one.end + 1 + otherPrefix[0].length;
    const other = readBalancedBraceBody(template, otherStart);
    if (!other) {
      out += template.slice(match.index, otherStart);
      i = otherStart;
      continue;
    }
    // Closing '}' of the outer `{name, plural, ...}`
    let j = other.end + 1;
    while (j < template.length && /\s/.test(template[j]!)) j += 1;
    if (template[j] === "}") j += 1;

    const raw = params[name];
    const n = typeof raw === "number" ? raw : Number(raw);
    const form = Number.isFinite(n) && n === 1 ? one.body : other.body;
    const rendered = Number.isFinite(n) ? String(n) : String(raw ?? "");
    out += form.replace(/#/g, rendered);
    i = j;
  }
  return out;
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
