/** Strip site suffix so root layout title.template does not duplicate it. */
export function categoryPageTitle(
  title: string,
  siteName: string,
): string {
  const suffix = ` | ${siteName}`;
  if (title.endsWith(suffix)) {
    return title.slice(0, -suffix.length).trimEnd();
  }
  return title.replace(/\s*\|\s*PACT Wines\s*$/i, "").trimEnd();
}
