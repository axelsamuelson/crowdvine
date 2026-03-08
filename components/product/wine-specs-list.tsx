interface WineSpecsListProps {
  /** Key = label (e.g. "Region"), value = text (e.g. "Languedoc, France") */
  specs: Record<string, string>;
  className?: string;
}

/**
 * Bullet list of wine specifications under description (Region, Appellation, Terroir, Vinification, ABV).
 * Matches the style from the reference: bold label, then value; indented list.
 */
export function WineSpecsList({ specs, className = "" }: WineSpecsListProps) {
  const entries = Object.entries(specs);
  if (entries.length === 0) return null;

  return (
    <ul
      className={`list-disc pl-6 space-y-1 text-sm text-foreground/90 opacity-90 ${className}`}
    >
      {entries.map(([label, value]) => (
        <li key={label} className="leading-snug">
          <span className="font-semibold text-foreground">{label}:</span>{" "}
          <span>{value}</span>
        </li>
      ))}
    </ul>
  );
}
