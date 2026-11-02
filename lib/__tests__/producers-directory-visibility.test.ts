import { describe, expect, it } from "vitest";

import { filterProducersForDirectoryLocale } from "@/lib/i18n/producers-directory-visibility";

const producers = [
  {
    id: "with-en-and-wines",
    name: "Keep Me",
    short_description: { sv: "svensk", en: "english" },
  },
  {
    id: "missing-en",
    name: "No English",
    short_description: { sv: "bara svenska" },
  },
  {
    id: "plain-sv-string",
    name: "Legacy Swedish",
    short_description: "legacy swedish only",
  },
  {
    id: "en-but-no-wines",
    name: "Empty cellar",
    short_description: { en: "english only" },
  },
  {
    id: "empty-en",
    name: "Blank EN",
    short_description: { sv: "svensk", en: "  " },
  },
];

describe("filterProducersForDirectoryLocale", () => {
  it("does not filter the Swedish directory list", () => {
    const filtered = filterProducersForDirectoryLocale(
      producers,
      "sv",
      new Set(),
    );
    expect(filtered.map((p) => p.id)).toEqual(producers.map((p) => p.id));
  });

  it("keeps English producers only when EN copy and live wines exist", () => {
    const filtered = filterProducersForDirectoryLocale(
      producers,
      "en",
      new Set(["with-en-and-wines", "missing-en", "plain-sv-string", "empty-en"]),
    );
    expect(filtered.map((p) => p.id)).toEqual(["with-en-and-wines"]);
  });

  it("hides producers that have EN copy but no live wines", () => {
    const filtered = filterProducersForDirectoryLocale(
      producers,
      "en",
      new Set(["with-en-and-wines"]),
    );
    expect(filtered.map((p) => p.id)).toEqual(["with-en-and-wines"]);
  });
});
