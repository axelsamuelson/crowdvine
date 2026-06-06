export type DiscountTier = 0 | 10 | 20;

export type DropState = "existing" | "virtual_available" | "unavailable";

export type ZoneStatusPayload = {
  bottlesFilled: number;
  bottleCapacity: number;
  fillPercent: number;
  discountTier: DiscountTier;
  estimatedDays: number | null;
  userZoneName: string;
  settingsUrl: string;
  statusPrimary: string;
  bottlesVerb: "ordered" | "requested";
  logisticsFootnote: string | null;
  dropState: DropState;
  marketDropId: string | null;
  displayDestination: string;
  canStartMarketDrop: boolean;
  campaignTagline: string | null;
  showProgressBar: boolean;
  showEarlyBird: boolean;
  unavailableMessage: string | null;
};

function isDiscountTier(n: number): n is DiscountTier {
  return n === 0 || n === 10 || n === 20;
}

function parseDropState(raw: unknown): DropState {
  if (
    raw === "existing" ||
    raw === "virtual_available" ||
    raw === "unavailable"
  ) {
    return raw;
  }
  return "existing";
}

export function parseZoneStatusPayload(raw: unknown): ZoneStatusPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const bottlesFilled = Number(o.bottlesFilled);
  const bottleCapacity = Number(o.bottleCapacity);
  const fillPercent = Number(o.fillPercent);
  const discountTierNum = Number(o.discountTier);
  const userZoneName = o.userZoneName;
  const settingsUrl = o.settingsUrl;
  const statusPrimaryRaw = o.statusPrimary;
  const bottlesVerbRaw = o.bottlesVerb;
  const footnoteRaw = o.logisticsFootnote;

  if (
    !Number.isFinite(bottlesFilled) ||
    !Number.isFinite(bottleCapacity) ||
    !Number.isFinite(fillPercent) ||
    !Number.isFinite(discountTierNum) ||
    !isDiscountTier(discountTierNum) ||
    typeof userZoneName !== "string" ||
    typeof settingsUrl !== "string"
  ) {
    return null;
  }

  const statusPrimary =
    typeof statusPrimaryRaw === "string" && statusPrimaryRaw.trim()
      ? statusPrimaryRaw.trim()
      : "Pallet status";
  const bottlesVerb =
    bottlesVerbRaw === "requested" ? "requested" : "ordered";
  const logisticsFootnote =
    footnoteRaw === null || footnoteRaw === undefined
      ? null
      : typeof footnoteRaw === "string"
        ? footnoteRaw.trim() || null
        : null;

  let estimatedDays: number | null = null;
  if (o.estimatedDays !== null && o.estimatedDays !== undefined) {
    const ed = Number(o.estimatedDays);
    if (!Number.isFinite(ed)) return null;
    estimatedDays = ed;
  }

  const dropState = parseDropState(o.dropState);
  const marketDropId =
    typeof o.marketDropId === "string" && o.marketDropId.trim()
      ? o.marketDropId.trim()
      : null;
  const displayDestination =
    typeof o.displayDestination === "string" ? o.displayDestination : "";
  const canStartMarketDrop = o.canStartMarketDrop !== false;
  const campaignTagline =
    typeof o.campaignTagline === "string" && o.campaignTagline.trim()
      ? o.campaignTagline.trim()
      : null;
  const showProgressBar = o.showProgressBar !== false;
  const showEarlyBird = o.showEarlyBird !== false;
  const unavailableMessage =
    typeof o.unavailableMessage === "string" && o.unavailableMessage.trim()
      ? o.unavailableMessage.trim()
      : null;

  return {
    bottlesFilled,
    bottleCapacity,
    fillPercent,
    discountTier: discountTierNum,
    estimatedDays,
    userZoneName,
    settingsUrl,
    statusPrimary,
    bottlesVerb,
    logisticsFootnote,
    dropState,
    marketDropId,
    displayDestination,
    canStartMarketDrop,
    campaignTagline,
    showProgressBar,
    showEarlyBird,
    unavailableMessage,
  };
}
