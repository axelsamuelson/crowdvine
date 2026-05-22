/** Map membership level slug → shop.membership* message key. */
export function membershipLevelMessageKey(level: string): string {
  const l = level.trim().toLowerCase();
  switch (l) {
    case "basic":
      return "shop.membershipBasic";
    case "brons":
      return "shop.membershipPlus";
    case "silver":
      return "shop.membershipPremium";
    case "guld":
      return "shop.membershipPriority";
    case "privilege":
      return "shop.membershipPrivilege";
    case "admin":
      return "shop.membershipAdmin";
    default:
      return "shop.membershipBasic";
  }
}
