/** Server-side open-platform flag. Client receives this via props / API. */
export function isPlatformOpen(): boolean {
  return process.env.PLATFORM_OPEN === "true";
}
