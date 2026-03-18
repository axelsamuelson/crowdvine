/**
 * Verifies AI extraction result schema tolerates real-world AI output
 * (row_type/wine_type/currency fixes, nulls, string confidence) so we don't get empty sections.
 */
import { describe, it, expect } from "vitest";
import { aiExtractionResultSchema } from "../schema";

describe("aiExtractionResultSchema", () => {
  const minimalSection = {
    section_name: "Vitt",
    normalized_section: "white",
    rows: [
      {
        raw_text: "Loimer Riesling 2022 165/725",
        row_type: "wine_row",
        wine_type: "white",
        producer: "Loimer",
        wine_name: "Riesling",
        vintage: "2022",
        region: null,
        country: "Austria",
        grapes: [],
        attributes: [],
        format_label: "15cl/75cl",
        price_glass: 165,
        price_bottle: 725,
        price_other: null,
        currency: "SEK",
        confidence: 0.88,
        review_reasons: [],
      },
    ],
  };

  it("parses normal payload", () => {
    const result = aiExtractionResultSchema.safeParse({ sections: [minimalSection] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sections).toHaveLength(1);
      expect(result.data.sections[0].rows).toHaveLength(1);
      expect(result.data.sections[0].rows[0].currency).toBe("SEK");
      expect(result.data.sections[0].rows[0].confidence).toBe(0.88);
    }
  });

  it("accepts row_type as unknown string (e.g. subheader)", () => {
    const payload = {
      sections: [
        {
          ...minimalSection,
          rows: [
            { ...minimalSection.rows[0], row_type: "subheader" },
            { ...minimalSection.rows[0], raw_text: "Another wine", row_type: "wine_row" },
          ],
        },
      ],
    };
    const result = aiExtractionResultSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sections[0].rows[0].row_type).toBe("subheader");
    }
  });

  it("accepts wine_type null and unknown string", () => {
    const payload = {
      sections: [
        {
          ...minimalSection,
          rows: [
            { ...minimalSection.rows[0], wine_type: null },
            { ...minimalSection.rows[0], raw_text: "House wine", wine_type: "house_wine" },
          ],
        },
      ],
    };
    const result = aiExtractionResultSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sections[0].rows[0].wine_type).toBeNull();
      expect(result.data.sections[0].rows[1].wine_type).toBe("house_wine");
    }
  });

  it("accepts currency null and defaults without throwing", () => {
    const payload = {
      sections: [
        {
          ...minimalSection,
          rows: [{ ...minimalSection.rows[0], currency: null }],
        },
      ],
    };
    const result = aiExtractionResultSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sections[0].rows[0].currency).toBeNull();
    }
  });

  it("coerces confidence from string", () => {
    const payload = {
      sections: [
        {
          ...minimalSection,
          rows: [{ ...minimalSection.rows[0], confidence: "0.82" }],
        },
      ],
    };
    const result = aiExtractionResultSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sections[0].rows[0].confidence).toBe(0.82);
    }
  });

  it("defaults missing review_reasons to []", () => {
    const row = { ...minimalSection.rows[0] };
    delete (row as Record<string, unknown>).review_reasons;
    const payload = { sections: [{ ...minimalSection, rows: [row] }] };
    const result = aiExtractionResultSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sections[0].rows[0].review_reasons).toEqual([]);
    }
  });

  it("defaults null raw_text to empty string", () => {
    const payload = {
      sections: [
        {
          ...minimalSection,
          rows: [{ ...minimalSection.rows[0], raw_text: null }],
        },
      ],
    };
    const result = aiExtractionResultSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sections[0].rows[0].raw_text).toBe("");
    }
  });

  it("produces valid result for section with empty rows array", () => {
    const payload = {
      sections: [{ section_name: "Bubbel", normalized_section: "sparkling", rows: [] }],
    };
    const result = aiExtractionResultSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sections).toHaveLength(1);
      expect(result.data.sections[0].rows).toHaveLength(0);
    }
  });

  it("handles invalid confidence by defaulting to 0.5", () => {
    const payload = {
      sections: [
        {
          ...minimalSection,
          rows: [{ ...minimalSection.rows[0], confidence: "high" }],
        },
      ],
    };
    const result = aiExtractionResultSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sections[0].rows[0].confidence).toBe(0.5);
    }
  });
});
