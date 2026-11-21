/**
 * Guide hub + articles are anonymous SEO content — keep them ISR-cacheable.
 * force-static avoids falling back to ƒ when shared helpers look dynamic-capable.
 */
export const dynamic = "force-static";
export const revalidate = 600;

export default function GuidesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
