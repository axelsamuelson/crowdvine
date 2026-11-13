import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const clientSrc = readFileSync(
  join(process.cwd(), "app/access-request/access-request-client.tsx"),
  "utf8",
);
const gallerySrc = readFileSync(
  join(process.cwd(), "components/access-request/infinite-gallery.tsx"),
  "utf8",
);

describe("access-request gallery stacking", () => {
  it("keeps PR250 copy/logic with readable solid chrome (no mix-blend)", () => {
    expect(clientSrc).toMatch(/useTranslations/);
    expect(clientSrc).toMatch(/shouldShowNoB2bAccessMessage/);
    expect(clientSrc).toMatch(/t\("accessRequest\.membersOnly"\)/);
    expect(clientSrc).toMatch(/t\("accessRequest\.noB2bMessage"\)/);
    expect(clientSrc).toMatch(/fixed inset-0 isolate/);
    expect(clientSrc).toMatch(/absolute inset-0 z-0/);
    expect(clientSrc).toMatch(/z-10/);
    expect(clientSrc).toMatch(/translateZ\(0\)/);
    expect(clientSrc).toMatch(/text-foreground/);
    expect(clientSrc).toMatch(/bg-background\/80/);
    expect(clientSrc).toMatch(/backdrop-blur/);
    expect(clientSrc).toMatch(/variant=\"iconButton\"/);
    expect(clientSrc).not.toMatch(/mix-blend-/);
    expect(clientSrc).not.toMatch(/bg-zinc-950/);
    expect(clientSrc).not.toMatch(/bg-white\/20/);
    expect(clientSrc).not.toMatch(/text-white/);
  });

  it("forces the WebGL canvas onto z-index 0 after create", () => {
    expect(gallerySrc).toMatch(/onCreated/);
    expect(gallerySrc).toMatch(/el\.style\.zIndex = ['"]0['"]/);
  });
});
