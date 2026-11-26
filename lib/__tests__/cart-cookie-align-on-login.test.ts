import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

const h = vi.hoisted(() => {
  const state = {
    jar: {} as Record<string, string>,
    readOnly: false,
    carts: [] as Row[],
    items: [] as Row[],
    fromCalls: 0,
  };

  function list(table: "carts" | "cart_items"): Row[] {
    return table === "carts" ? state.carts : state.items;
  }

  function createQuery(table: "carts" | "cart_items") {
    const filters: Array<(row: Row) => boolean> = [];
    let op: "select" | "update" | "delete" = "select";
    let payload: Row | null = null;
    let single = false;

    const query = {
      select() {
        op = "select";
        return query;
      },
      update(next: Row) {
        op = "update";
        payload = next;
        return query;
      },
      delete() {
        op = "delete";
        return query;
      },
      insert(next: Row) {
        list(table).push({ ...next });
        return Promise.resolve({ data: next, error: null });
      },
      eq(key: string, value: unknown) {
        filters.push((row) => row[key] === value);
        return query;
      },
      neq(key: string, value: unknown) {
        filters.push((row) => row[key] !== value);
        return query;
      },
      is(key: string, value: unknown) {
        filters.push((row) => row[key] === value);
        return query;
      },
      order() {
        return query;
      },
      limit() {
        return query;
      },
      maybeSingle() {
        single = true;
        return execute();
      },
      then(
        resolve: (value: { data: unknown; error: null }) => unknown,
        reject?: (reason: unknown) => unknown,
      ) {
        return execute().then(resolve, reject);
      },
    };

    function execute() {
      const rows = list(table);
      const matched = rows.filter((row) => filters.every((fn) => fn(row)));
      if (op === "update" && payload) {
        for (const row of matched) Object.assign(row, payload);
        return Promise.resolve({ data: null, error: null });
      }
      if (op === "delete") {
        const kept = rows.filter((row) => !filters.every((fn) => fn(row)));
        rows.length = 0;
        rows.push(...kept);
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({
        data: single ? (matched[0] ?? null) : matched,
        error: null,
      });
    }

    return query;
  }

  return { state, createQuery };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      h.state.jar[name] != null ? { value: h.state.jar[name] } : undefined,
    set: (name: string, value: string) => {
      if (h.state.readOnly) {
        throw new Error(
          "Cookies can only be modified in a Server Action or Route Handler.",
        );
      }
      h.state.jar[name] = value;
    },
  }),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: "carts" | "cart_items") => {
      h.state.fromCalls += 1;
      return h.createQuery(table);
    },
  }),
}));

import { alignCartCookieToDbId } from "@/lib/cart/align-cart-cookie";
import { reconcileSessionCartForUser } from "@/lib/cart/reconcile-on-auth";

const CART_ID = "6a989498-user-cart";
const SESSION_ID = "dd01d636-session";

describe("guest cart survives login", () => {
  beforeEach(() => {
    h.state.jar = { cv_cart_id: SESSION_ID };
    h.state.readOnly = false;
    h.state.fromCalls = 0;
    h.state.carts = [
      {
        id: CART_ID,
        session_id: SESSION_ID,
        user_id: null,
        updated_at: "2026-11-26T00:00:00.000Z",
      },
    ];
    h.state.items = [
      {
        id: "line-1",
        cart_id: CART_ID,
        wine_id: "wine-1",
        quantity: 6,
        source: "producer",
      },
    ];
  });

  it("keeps the 6-bottle line and sets cv_cart_id to carts.id after login", async () => {
    const result = await reconcileSessionCartForUser({
      userId: "user-1",
      sessionId: h.state.jar.cv_cart_id,
    });

    expect(result.cartId).toBe(CART_ID);
    expect(h.state.jar.cv_cart_id).toBe(CART_ID);
    expect(h.state.carts[0]?.session_id).toBe(CART_ID);
    expect(h.state.carts[0]?.user_id).toBe("user-1");
    expect(h.state.items).toEqual([
      expect.objectContaining({
        cart_id: CART_ID,
        wine_id: "wine-1",
        quantity: 6,
      }),
    ]);

    const readsAfterLogin = h.state.fromCalls;
    await alignCartCookieToDbId(CART_ID);
    expect(h.state.fromCalls).toBe(readsAfterLogin);
    expect(h.state.jar.cv_cart_id).toBe(CART_ID);
    expect(h.state.items[0]?.quantity).toBe(6);
  });

  it("does not write session_id when cookies cannot be set", async () => {
    h.state.readOnly = true;
    const aligned = await alignCartCookieToDbId(CART_ID);
    expect(aligned).toBe(SESSION_ID);
    expect(h.state.jar.cv_cart_id).toBe(SESSION_ID);
    expect(h.state.carts[0]?.session_id).toBe(SESSION_ID);
    expect(h.state.fromCalls).toBe(0);
    expect(h.state.items[0]?.quantity).toBe(6);
  });
});

describe("cart cookie stays out of page render", () => {
  it("does not align the cookie from CartService.getCart", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/lib/cart-service.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/alignCartCookieToDbId/);
  });

  it("does not resolve pallet zones while rendering the PDP", () => {
    const src = readFileSync(
      resolve(process.cwd(), "lib/i18n/pdp-page.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(
      /getCachedPalletZoneStatusForHandle|getPalletZoneStatusForHandle|determineZones/,
    );
  });
});
