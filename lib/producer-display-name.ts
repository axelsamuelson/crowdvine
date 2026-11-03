/** Customer-facing producer label. Slugs stay on the legal name. */
export function producerDisplayName(producer: {
  name?: string | null;
  display_name?: string | null;
}): string {
  const display = producer.display_name?.trim() ?? "";
  if (display) return display;
  return (producer.name ?? "").trim();
}
