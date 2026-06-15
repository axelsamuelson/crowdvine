import type { Metadata } from "next";

type ShopSearchParams = { [key: string]: string | string[] | undefined };

function hasActiveShopQueryParams(searchParams: ShopSearchParams | undefined): boolean {
  if (!searchParams) return false;

  return Object.values(searchParams).some((value) => {
    if (value == null) return false;
    if (Array.isArray(value)) {
      return value.some((entry) => entry != null && String(entry).trim() !== "");
    }
    return String(value).trim() !== "";
  });
}

/** Filter/sort/search URLs should not be indexed — canonical is the bare PLP. */
export function shopSearchParamsRobots(
  searchParams: ShopSearchParams | undefined,
): NonNullable<Metadata["robots"]> | undefined {
  if (!hasActiveShopQueryParams(searchParams)) return undefined;
  return { index: false, follow: true };
}
