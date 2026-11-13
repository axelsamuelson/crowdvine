import { afterEach, describe, expect, it } from "vitest";

import {
  COST_DIRECT,
  COST_SHARED,
  HOW_LONG_DIRECT,
  NOT_HOME_DIRECT,
  NOT_HOME_SHARED,
  PAYMENT_DIRECT,
  deliveryCostBody,
  homeDeliveryMeta,
  howLongDeliveryBody,
  naturalWineHomeDeliveryArticle,
  notHomeBody,
  paymentBody,
  whereWeDeliverBody,
  WHERE_WE_DELIVER_DIRECT,
} from "@/lib/guides/articles/natural-wine-home-delivery";
import {
  HOME_DELIVERY_GUIDE_PATH,
  resolveHomeDeliveryGuidePath,
} from "@/lib/guides/home-delivery-guide";
import { publishedBilingualArticleGuides } from "@/lib/guides/guide-publication";
import {
  articleLinkText,
  articlePath,
  isGuideArticlePublished,
} from "@/lib/guides/guide-types";

const WHERE_WE_DELIVER_BASE_SV =
  "Vi levererar hem till dig i hela Budbees leveransområde i Sverige. Om din adress ingår ser du när du anger postnumret i kassan. Leveransen sker normalt inom 2–3 veckor efter att pallen har stängt och alltid senast 30 dagar efter. Vid överlämningen kontrollerar budet din legitimation, och du måste vara minst 20 år. Om du inte kan visa giltig legitimation lämnas inte vinet ut. Fraktkostnaden visas i kassan innan du betalar.";
const WHERE_WE_DELIVER_BASE_EN =
  "We deliver to your door anywhere in Budbee's delivery area in Sweden. You can check whether your address is covered by entering your postcode at checkout. Delivery normally takes 2–3 weeks after the pallet has closed and always within 30 days. On delivery, the courier checks your ID and you must be at least 20 years old. If you can't show valid ID, the wine won't be handed over. The shipping cost is shown at checkout before you pay.";

const HOW_LONG_BASE_SV =
  "Leveransen sker normalt inom 2–3 veckor efter att pallen stängt och alltid senast 30 dagar efter. När pallen har skickats får du ett beräknat leveransfönster, och leveransdagen när vinet nått Sverige. Hur lång tid det tar innan pallen stänger beror på hur snabbt den fylls.";
const HOW_LONG_BASE_EN =
  "Delivery normally takes 2–3 weeks after the pallet closes and always within 30 days. Once the pallet has shipped you'll get an estimated delivery window, and the delivery day once the wine has reached Sweden. How long it takes before the pallet closes depends on how quickly it fills.";

const PAYMENT_SHARED_SV =
  "Du betalar med kort. Beloppet dras vid ett enda tillfälle, när pallen stänger.";
const PAYMENT_SHARED_EN =
  "You pay by card. The amount is charged once, when the pallet closes.";

describe("natural wine home delivery guide", () => {
  const prevDirectBox = process.env.DIRECT_BOX_CHECKOUT_ENABLED;

  afterEach(() => {
    if (prevDirectBox === undefined) {
      delete process.env.DIRECT_BOX_CHECKOUT_ENABLED;
    } else {
      process.env.DIRECT_BOX_CHECKOUT_ENABLED = prevDirectBox;
    }
  });

  it("is published with the requested title, meta, h1 and paths", () => {
    expect(isGuideArticlePublished(naturalWineHomeDeliveryArticle)).toBe(true);
    expect(publishedBilingualArticleGuides()).toContain(
      naturalWineHomeDeliveryArticle,
    );
    expect(naturalWineHomeDeliveryArticle.title.sv).toBe(
      "Hemleverans av naturvin: så fungerar det",
    );
    expect(naturalWineHomeDeliveryArticle.title.en).toBe(
      "Natural Wine Home Delivery: How It Works",
    );
    expect(naturalWineHomeDeliveryArticle.h1.sv).toBe(
      "Så fungerar hemleverans av naturvin",
    );
    expect(naturalWineHomeDeliveryArticle.h1.en).toBe(
      "How Natural Wine Home Delivery Works",
    );
    expect(naturalWineHomeDeliveryArticle.meta.sv.length).toBeLessThan(160);
    expect(naturalWineHomeDeliveryArticle.meta.en.length).toBeLessThan(160);
    expect(naturalWineHomeDeliveryArticle.faqs).toBeUndefined();
    expect(articlePath(naturalWineHomeDeliveryArticle, "sv")).toBe(
      HOME_DELIVERY_GUIDE_PATH.sv,
    );
    expect(articlePath(naturalWineHomeDeliveryArticle, "en")).toBe(
      HOME_DELIVERY_GUIDE_PATH.en,
    );
  });

  it("maps legacy shop landings to the guide in one hop", () => {
    expect(
      resolveHomeDeliveryGuidePath("/vin/naturvin-hemleverans-stockholm"),
    ).toBe("/guider/hemleverans-av-naturvin");
    expect(
      resolveHomeDeliveryGuidePath("/wine/natural-wine-delivery-stockholm"),
    ).toBe("/guides/natural-wine-home-delivery");
  });

  it("has no FAQ and no em dashes", () => {
    expect(naturalWineHomeDeliveryArticle.faqs).toBeUndefined();
    const blobs = [
      naturalWineHomeDeliveryArticle.title.sv,
      naturalWineHomeDeliveryArticle.title.en,
      naturalWineHomeDeliveryArticle.meta.sv,
      naturalWineHomeDeliveryArticle.meta.en,
      naturalWineHomeDeliveryArticle.lede?.sv,
      naturalWineHomeDeliveryArticle.lede?.en,
      ...(naturalWineHomeDeliveryArticle.sections.flatMap((s) => [
        s.heading?.sv,
        s.heading?.en,
        ...(Array.isArray(s.body.sv) ? s.body.sv : [s.body.sv]),
        ...(Array.isArray(s.body.en) ? s.body.en : [s.body.en]),
      ])),
    ];
    for (const text of blobs) {
      // Em dash only — numeric ranges may use en dash (e.g. 2–3 weeks).
      // Strip markdown links so URL fragments are not mistaken for copy.
      expect(articleLinkText(text ?? "")).not.toMatch(/—/);
      expect(text).not.toMatch(/\[FYLL I/);
    }
  });

  it("includes the full FAQ-style section set without placeholders", () => {
    const svHeadings = naturalWineHomeDeliveryArticle.sections.map(
      (s) => s.heading?.sv,
    );
    const enHeadings = naturalWineHomeDeliveryArticle.sections.map(
      (s) => s.heading?.en,
    );
    expect(svHeadings).toEqual([
      "Var levererar vi?",
      "Hur lång tid tar leveransen?",
      "Vad kostar leveransen?",
      "Om du inte är hemma",
      "Betalning",
      "Frågor",
    ]);
    expect(enHeadings).toEqual([
      "Where do we deliver?",
      "How long does delivery take?",
      "What does delivery cost?",
      "If you are not at home",
      "Payment",
      "Questions",
    ]);
    expect(whereWeDeliverBody(false).sv).toEqual([WHERE_WE_DELIVER_BASE_SV]);
    expect(whereWeDeliverBody(false).en).toEqual([WHERE_WE_DELIVER_BASE_EN]);
    expect(howLongDeliveryBody(false).sv).toEqual([HOW_LONG_BASE_SV]);
    expect(howLongDeliveryBody(false).en).toEqual([HOW_LONG_BASE_EN]);
    expect(deliveryCostBody(false)).toEqual({
      sv: [COST_SHARED.sv],
      en: [COST_SHARED.en],
    });
    expect(notHomeBody(false)).toEqual({
      sv: [NOT_HOME_SHARED.sv],
      en: [NOT_HOME_SHARED.en],
    });
    expect(paymentBody(false)).toEqual({
      sv: [PAYMENT_SHARED_SV],
      en: [PAYMENT_SHARED_EN],
    });
    const stockholmOnly =
      /endast Stockholm|only in Stockholm|leverans i Stockholm|hemleverans i Stockholm|in Stockholm/i;
    const guideBlobs = [
      naturalWineHomeDeliveryArticle.meta.sv,
      naturalWineHomeDeliveryArticle.meta.en,
      naturalWineHomeDeliveryArticle.lede?.sv,
      naturalWineHomeDeliveryArticle.lede?.en,
      naturalWineHomeDeliveryArticle.hubCard?.description.sv,
      naturalWineHomeDeliveryArticle.hubCard?.description.en,
      ...naturalWineHomeDeliveryArticle.sections.flatMap((s) => [
        ...(Array.isArray(s.body.sv) ? s.body.sv : [s.body.sv]),
        ...(Array.isArray(s.body.en) ? s.body.en : [s.body.en]),
      ]),
    ];
    for (const text of guideBlobs) {
      expect(text).not.toMatch(stockholmOnly);
    }
  });

  it("gates direct-delivery paragraphs behind DIRECT_BOX_CHECKOUT_ENABLED", () => {
    expect(whereWeDeliverBody(true)).toEqual({
      sv: [WHERE_WE_DELIVER_BASE_SV, WHERE_WE_DELIVER_DIRECT.sv],
      en: [WHERE_WE_DELIVER_BASE_EN, WHERE_WE_DELIVER_DIRECT.en],
    });
    expect(WHERE_WE_DELIVER_DIRECT.sv).toBe(
      "Vid direktleverans packas lådorna i Frankrike och skickas med UPS Standard. Budet kontrollerar legitimation vid överlämningen, och mottagaren måste ha fyllt 20 år.",
    );
    expect(WHERE_WE_DELIVER_DIRECT.en).toBe(
      "With direct delivery, the boxes are packed in France and sent with UPS Standard. The courier checks ID on delivery, and the recipient must be at least 20 years old.",
    );
    expect(WHERE_WE_DELIVER_DIRECT.sv).not.toMatch(/5–10/);
    expect(WHERE_WE_DELIVER_DIRECT.en).not.toMatch(/5–10/);

    expect(howLongDeliveryBody(true)).toEqual({
      sv: [HOW_LONG_BASE_SV, HOW_LONG_DIRECT.sv],
      en: [HOW_LONG_BASE_EN, HOW_LONG_DIRECT.en],
    });

    expect(deliveryCostBody(true)).toEqual({
      sv: [COST_SHARED.sv, COST_DIRECT.sv],
      en: [COST_SHARED.en, COST_DIRECT.en],
    });

    expect(notHomeBody(true)).toEqual({
      sv: [NOT_HOME_SHARED.sv, NOT_HOME_DIRECT.sv],
      en: [NOT_HOME_SHARED.en, NOT_HOME_DIRECT.en],
    });

    expect(paymentBody(true)).toEqual({
      sv: [PAYMENT_SHARED_SV, PAYMENT_DIRECT.sv],
      en: [PAYMENT_SHARED_EN, PAYMENT_DIRECT.en],
    });
  });

  it("uses one shared-pallet cost paragraph (intro folded in)", () => {
    expect(COST_SHARED.sv).toBe(
      "Leverans på delad pall kostar 99 kr per order inklusive moms, ett introduktionspris tills vidare.",
    );
    expect(COST_SHARED.en).toBe(
      "Delivery on a shared pallet costs SEK 99 per order including VAT, an introductory price for now.",
    );
    expect(deliveryCostBody(false).sv).toHaveLength(1);
    expect(deliveryCostBody(false).en).toHaveLength(1);
  });

  it("prefixes not-home shared paragraph and links direct to terms #punkt-3b", () => {
    expect(NOT_HOME_SHARED.sv.startsWith("Gäller delad pall:")).toBe(true);
    expect(NOT_HOME_SHARED.en.startsWith("For shared pallets:")).toBe(true);
    expect(NOT_HOME_DIRECT.sv).toBe(
      "Gäller direktleverans: Om du inte är hemma får du besked från UPS om ny leverans eller var du kan hämta lådan. UPS lämnar bara ut lådan mot legitimation till någon som fyllt 20 år. Kan UPS inte lämna över lådan, till exempel för att den inte hämtas ut, gäller det som står i [köpvillkoren, punkt 3 b](/villkor#punkt-3b).",
    );
    expect(NOT_HOME_DIRECT.en).toBe(
      "Direct delivery: If you're not home, UPS will let you know about a new delivery attempt or where you can collect the box. UPS only hands over the box to someone aged 20 or over who shows ID. If UPS cannot hand over the box, for example because it is not collected, [the terms of purchase apply, see point 3 b](/terms#punkt-3b).",
    );
    expect(PAYMENT_DIRECT.sv).toBe(
      "Vid direktleverans dras beloppet när du lägger ordern.",
    );
    expect(PAYMENT_DIRECT.en).toBe(
      "With direct delivery, the amount is charged when you place the order.",
    );
  });

  it("gates meta description direct-delivery phrase behind the checkout flag", () => {
    expect(homeDeliveryMeta(true)).toEqual({
      sv: "Beställ naturvin online med hemleverans i Sverige. Så fungerar köp, delad pall, direktleverans, leveranstid, ålderskontroll och kostnad.",
      en: "Order natural wine online with home delivery in Sweden. How buying, shared pallets, direct delivery, delivery times, age checks and costs work.",
    });
    expect(homeDeliveryMeta(false)).toEqual({
      sv: "Beställ naturvin online med hemleverans i Sverige. Så fungerar köp, delad pall, leveranstid, ålderskontroll och kostnad.",
      en: "Order natural wine online with home delivery in Sweden. How buying, shared pallets, delivery times, age checks and costs work.",
    });
    expect(homeDeliveryMeta(true).sv.length).toBeLessThan(160);
    expect(homeDeliveryMeta(true).en.length).toBeLessThan(160);
    expect(homeDeliveryMeta(false).sv).not.toMatch(/direktleverans/);
    expect(homeDeliveryMeta(false).en).not.toMatch(/direct delivery/);
    // Article meta getter uses the live flag (same as section bodies).
    expect(naturalWineHomeDeliveryArticle.meta).toEqual(homeDeliveryMeta());
  });
});
