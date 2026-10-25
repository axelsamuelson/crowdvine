/**
 * Seed English producer bios via catalog PATCH (MCP_API_KEY).
 * Only writes bio_short_en / bio_long_en — never touches Swedish locales.
 *
 * Usage:
 *   MCP_API_KEY=… BASE_URL=https://pactwines.com node scripts/seed-producer-en-bios.mjs
 */
const BASE = (process.env.BASE_URL || "https://pactwines.com").replace(/\/$/, "");
const KEY = process.env.MCP_API_KEY?.trim();
if (!KEY) {
  console.error("MCP_API_KEY is required");
  process.exit(1);
}

/** @type {Record<string, { bio_short_en: string, bio_long_en?: string }>} */
const BIOS = {
  "chateau-del-ranq": {
    bio_short_en:
      "Laure and Sébastien run Château del Ranq in Pic Saint-Loup — one of Languedoc's most distinctive terroirs, with limestone soils, high elevation, and a climate shaped by sea wind and mountain air. The wines are known for their freshness, salinity, and minerality. The range spans AOP Pic Saint-Loup to experimental Vin de France cuvées.",
    bio_long_en:
      "Château del Ranq sits in Pic Saint-Loup, perhaps Languedoc's most ambitious appellation — mountain terrain north of Montpellier where limestone soils, elevation, and a unique microclimate combine to give wines a freshness and minerality rare in southern France.\n\nLaure and Sébastien run the estate with a clear focus on terroir expression and minimal intervention. Their signature is limestone's imprint in the wines — a salinity and tension on the palate that sets Pic Saint-Loup apart from Languedoc's warmer zones.\n\nThe range is varied: AOP Pic Saint-Loup in three red cuvées (Château del Ranq, Redares, and Le Ribou), a white Sauvignon (La Cadène), a blanc de noir from red grapes, a light Vin de France red (Poucèt), and a pétillant naturel rosé (La Vertu). Each wine finds its own form depending on grape variety and parcel.",
  },
  "clos-fantine": {
    bio_short_en:
      "Carole, Corine, and Olivier Andrieu run Clos Fantine in Cabrerolles, Faugères. A 25-hectare family estate farmed organically since the 1990s. Carignan dominates — some vines a hundred years old. No additives, no sulphites.",
    bio_long_en:
      "Clos Fantine is a family estate in Cabrerolles at the heart of the Faugères appellation. Carole, Corine, and Olivier Andrieu took over from their father in the mid-1990s and have farmed it organically ever since — something their father had already begun.\n\nThe domaine is 25 hectares, mostly planted to Carignan (40%), Grenache (20%), Mourvèdre (20%), Syrah (10%), and Cinsault (10%) — all on the schist soils typical of Faugères. Some Carignan plantings are a hundred years old.\n\nThe work is minimally interventionist: no synthetic products, no chemical fertilizers, no filtration, no cooling, no sulphites. Corine has a background in oenology, Olivier in viticulture, and Carole handles the commercial side — a well-worked division of roles in a sibling team that shares a common vision of what Faugères can be.",
  },
  "grain-d-l": {
    bio_short_en:
      "Gaëlle Steunou runs Grain D'L in Languedoc — micro-cuvées from Carignan, Aramon, and Grenache. Natural winemaking focused on pure fruit and terroir.",
    bio_long_en:
      "Gaëlle Steunou runs Grain D'L in Roujan, Hérault — small lots from old gobelet vines on schist, farmed organically (Ecocert) without mechanization. Everything is hand-harvested and bottled by gravity, with no additives.\n\nThe focus is micro-cuvées that show Carignan, Carignan Blanc, Aramon, and Grenache with clean fruit and a clear sense of place. Natural fermentation, no shortcuts — just the vineyard and the vintage.",
  },
  "julien-peyras": {
    bio_short_en:
      "Julien Peyras runs GAEC La Dame Jeanne in Paulhan, Hérault. Organic farming without synthetic products, native yeasts, no additives, no sulphites. The range spans sparkling Clairette to complex blends with long-aged Syrah.",
    bio_long_en:
      "Julien Peyras runs GAEC La Dame Jeanne in Paulhan, Hérault — an estate built on respect for nature and a love of good bottles. His vines are grown without synthetic products: the soil is managed with green manure and cover crops such as field bean, rye, phacelia, and wheat, and the vines are treated with natural preparations like nettle, field horsetail, and horsetail extracts.\n\nThe range is broad and varied — from the sparkling Les Pétillantes (100% Clairette) through blends like Dolce Vita and Madame la Rouge to the pure Syrah Nostra. Each wine is an expression of a specific parcel, soil type, and vintage. Shared across all of them: native yeasts, no additives, no added sulphites, and movement only by gravity.\n\nMadame la Rouge is the estate's most singular cuvée — a blend of Syrah and Grenache from 2014 (with years in barrique) and Syrah, Carignan, Grenache, and Cinsault from 2022. A vinified journey through time.",
  },
};

const SLUG_TO_ID = {
  "chateau-del-ranq": "0dc212c5-b926-42db-9436-fda06264115d",
  "clos-fantine": "30a4559f-0fb3-48f8-9a1c-7215805a1e2d",
  "grain-d-l": "3c5aff1f-431a-4424-b9bc-9d205a859f7d",
  "julien-peyras": "fb189c6d-cd4e-4ee8-914a-c673192d589c",
};

async function patch(id, body) {
  const res = await fetch(`${BASE}/api/producers/${id}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${KEY}`,
      "content-type": "application/json",
      "cache-control": "no-cache",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  for (const [slug, bios] of Object.entries(BIOS)) {
    const id = SLUG_TO_ID[slug];
    console.log(`Updating ${slug} (${id})…`);
    const result = await patch(id, {
      bio_short_en: bios.bio_short_en,
      ...(bios.bio_long_en ? { bio_long_en: bios.bio_long_en } : {}),
    });
    const p = result.producer ?? result;
    console.log(
      `  ok short_en=${Boolean(p.bio_short_en)} long_en=${Boolean(p.bio_long_en)} sv_short_unchanged=${Boolean(p.bio_short)}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
