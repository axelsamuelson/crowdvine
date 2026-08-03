#!/usr/bin/env node
/**
 * Dev verification for visitor identity + first-touch (no browser).
 * Run: pnpm exec tsx scripts/verify-visitor-identity.mjs
 */
import { createRequire } from "module";

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

let cookieJar = "";
globalThis.document = {
  get referrer() {
    return "https://google.com/";
  },
  get cookie() {
    return cookieJar;
  },
  set cookie(v) {
    const [pair] = String(v).split(";");
    const eq = pair.indexOf("=");
    const name = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    const parts = cookieJar
      .split("; ")
      .filter(Boolean)
      .filter((p) => !p.startsWith(`${name}=`));
    parts.push(`${name}=${value}`);
    cookieJar = parts.join("; ");
  },
};

globalThis.window = {
  location: {
    pathname: "/vin",
    search: "?utm_source=tiktok&utm_medium=social&utm_campaign=launch",
  },
};

const require = createRequire(import.meta.url);
require("tsx/cjs");
const {
  getVisitorId,
  getOrCreateFirstTouch,
  ensureVisitorIdentity,
  FIRST_TOUCH_KEY,
  VISITOR_ID_KEY,
} = require("../lib/analytics/visitor-identity.ts");

const id1 = getVisitorId();
const id2 = getVisitorId();
if (!id1 || id1 !== id2) {
  console.error("FAIL visitor_id not stable", { id1, id2 });
  process.exit(1);
}
console.log("OK visitor_id stable:", id1);

const touch1 = getOrCreateFirstTouch();
globalThis.window.location.search = "?utm_source=other";
const touch2 = getOrCreateFirstTouch();
if (JSON.stringify(touch1) !== JSON.stringify(touch2)) {
  console.error("FAIL first_touch overwritten", { touch1, touch2 });
  process.exit(1);
}
if (touch1.first_utm_source !== "tiktok") {
  console.error("FAIL first_touch utm", touch1);
  process.exit(1);
}
console.log("OK first_touch immutable:", touch1.first_utm_source);

if (!localStorage.getItem(VISITOR_ID_KEY) || !localStorage.getItem(FIRST_TOUCH_KEY)) {
  console.error("FAIL not persisted in localStorage");
  process.exit(1);
}
const again = ensureVisitorIdentity();
if (again.visitorId !== id1) {
  console.error("FAIL visitor changed after ensure");
  process.exit(1);
}
console.log("OK survives reload (localStorage)");
console.log("All visitor-identity checks passed.");
