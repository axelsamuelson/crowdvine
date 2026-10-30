import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireAdmin = vi.fn();

vi.mock("@/lib/admin-auth-server", () => {
  class AdminAuthError extends Error {
    status: 401 | 403;
    constructor(status: 401 | 403, message: string) {
      super(message);
      this.name = "AdminAuthError";
      this.status = status;
    }
  }
  return {
    requireAdmin: (...args: unknown[]) => requireAdmin(...args),
    getCurrentAdmin: vi.fn(),
    AdminAuthError,
  };
});

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => {
    throw new Error("getSupabaseAdmin should not run without admin");
  },
}));

vi.mock("@/lib/sendgrid-service", () => ({
  sendGridService: { sendEmail: vi.fn() },
}));

vi.mock("@/lib/email-templates", () => ({
  getAccessApprovalEmailTemplate: vi.fn(),
  getAccessApprovalEmailText: vi.fn(),
}));

describe("admin API auth gaps — unauthenticated denial", () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    requireAdmin.mockRejectedValue(new Error("Admin authentication required"));
  });

  it("returns 401 from send-fast-approval-email without admin", async () => {
    const { POST } = await import(
      "@/app/api/admin/send-fast-approval-email/route"
    );
    const res = await POST(
      new NextRequest("http://localhost/api/admin/send-fast-approval-email", {
        method: "POST",
        body: JSON.stringify({ email: "x@example.com" }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(401);
    expect(requireAdmin).toHaveBeenCalledOnce();
  });

  it("returns 401 from send-hotmail-optimized-email without admin", async () => {
    const { POST } = await import(
      "@/app/api/admin/send-hotmail-optimized-email/route"
    );
    const res = await POST(
      new NextRequest(
        "http://localhost/api/admin/send-hotmail-optimized-email",
        {
          method: "POST",
          body: JSON.stringify({ email: "x@example.com" }),
          headers: { "content-type": "application/json" },
        },
      ),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 from memberships without admin", async () => {
    const memberships = await import("@/app/api/admin/memberships/route");
    expect(
      (
        await memberships.GET(
          new Request("http://localhost/api/admin/memberships"),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await memberships.PUT(
          new Request("http://localhost/api/admin/memberships", {
            method: "PUT",
            body: JSON.stringify({ userId: "u1" }),
            headers: { "content-type": "application/json" },
          }),
        )
      ).status,
    ).toBe(401);
  });

  it("returns 401 from memberships/[level] without admin", async () => {
    const { PATCH } = await import("@/app/api/admin/memberships/[level]/route");
    const res = await PATCH(
      new Request("http://localhost/api/admin/memberships/brons", {
        method: "PATCH",
        body: JSON.stringify({ discount: 5 }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ level: "brons" }) },
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 from invitations/generate without admin", async () => {
    const { POST } = await import("@/app/api/admin/invitations/generate/route");
    const res = await POST(
      new NextRequest("http://localhost/api/admin/invitations/generate", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 from wine-boxes GET handlers without admin", async () => {
    const list = await import("@/app/api/admin/wine-boxes/route");
    const byId = await import("@/app/api/admin/wine-boxes/[id]/route");
    const items = await import("@/app/api/admin/wine-boxes/[id]/items/route");

    expect((await list.GET()).status).toBe(401);
    expect(
      (
        await byId.GET(new Request("http://localhost/api/admin/wine-boxes/x"), {
          params: Promise.resolve({ id: "x" }),
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await items.GET(
          new Request("http://localhost/api/admin/wine-boxes/x/items"),
          { params: Promise.resolve({ id: "x" }) },
        )
      ).status,
    ).toBe(401);
  });

  it("returns 401 from bulk-upload without admin", async () => {
    const upload = await import("@/app/api/admin/bulk-upload/route");
    const parse = await import("@/app/api/admin/bulk-upload/parse/route");
    expect(
      (
        await upload.POST(
          new NextRequest("http://localhost/api/admin/bulk-upload", {
            method: "POST",
            body: JSON.stringify({ products: [] }),
            headers: { "content-type": "application/json" },
          }),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await parse.POST(
          new NextRequest("http://localhost/api/admin/bulk-upload/parse", {
            method: "POST",
            body: new FormData(),
          }),
        )
      ).status,
    ).toBe(401);
  });

  it("returns 401 from wines/bulk-margin without admin", async () => {
    const { POST } = await import("@/app/api/admin/wines/bulk-margin/route");
    const res = await POST(
      new NextRequest("http://localhost/api/admin/wines/bulk-margin", {
        method: "POST",
        body: JSON.stringify({ margin_percentage: 30 }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a signed-in non-admin on send-fast-approval-email", async () => {
    const { AdminAuthError } = await import("@/lib/admin-auth-server");
    requireAdmin.mockRejectedValueOnce(
      new AdminAuthError(403, "Admin access required"),
    );
    const { POST } = await import(
      "@/app/api/admin/send-fast-approval-email/route"
    );
    const res = await POST(
      new NextRequest("http://localhost/api/admin/send-fast-approval-email", {
        method: "POST",
        body: JSON.stringify({ email: "x@example.com" }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(403);
  });
});
