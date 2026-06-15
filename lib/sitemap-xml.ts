import type { MetadataRoute } from "next";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatLastMod(lastModified: SitemapEntry["lastModified"]): string {
  if (!lastModified) return "";
  const date = lastModified instanceof Date ? lastModified : new Date(lastModified);
  if (Number.isNaN(date.getTime())) return "";
  return `<lastmod>${date.toISOString().split("T")[0]}</lastmod>`;
}

type SitemapEntry = MetadataRoute.Sitemap[number];

export function sitemapEntriesToXml(entries: MetadataRoute.Sitemap): string {
  const body = entries
    .map((entry) => {
      const lastmod = formatLastMod(entry.lastModified);
      const changefreq = entry.changeFrequency
        ? `<changefreq>${entry.changeFrequency}</changefreq>`
        : "";
      const priority =
        entry.priority != null ? `<priority>${entry.priority}</priority>` : "";

      return `  <url>
    <loc>${escapeXml(entry.url)}</loc>${lastmod ? `\n    ${lastmod}` : ""}${changefreq ? `\n    ${changefreq}` : ""}${priority ? `\n    ${priority}` : ""}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}
