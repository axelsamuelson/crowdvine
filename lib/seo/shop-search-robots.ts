import type { Metadata } from "next";

/** Shop search/filter URLs should not be indexed — canonical is the bare PLP. */
export function shopSearchParamsRobots(
  searchParams: { [key: string]: string | string[] | undefined } | undefined,
): NonNullable<Metadata["robots"]> | undefined {
  if (!searchParams) return undefined;
  if (!("q" in searchParams) || searchParams.q == null) return undefined;
  return { index: false, follow: true };
}
