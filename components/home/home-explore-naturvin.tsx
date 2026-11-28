const EXPLORE_LINKS = [
  { href: "/vin", label: "Naturvin" },
  { href: "/vin/rott-naturvin", label: "Rött naturvin" },
  { href: "/vin/vitt-naturvin", label: "Vitt naturvin" },
  { href: "/vin/orange-naturvin", label: "Orange vin" },
  { href: "/vin/pet-nat", label: "Pet nat" },
  { href: "/vin/naturvin-lada", label: "Naturvinslåda" },
] as const;

/**
 * Swedish homepage shop chips. Plain anchors so the links are in the
 * server HTML without the Next.js link client.
 */
export function HomeExploreNaturvin() {
  return (
    <section
      className="col-span-2 w-full px-sides py-8 md:py-10"
      aria-labelledby="home-explore-naturvin"
    >
      <h2
        id="home-explore-naturvin"
        className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground"
      >
        Utforska naturvin
      </h2>
      <ul className="flex flex-nowrap gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-md:[mask-image:linear-gradient(to_right,#000_0,#000_calc(100%-28px),transparent_100%)] md:overflow-visible md:[mask-image:none]">
          {EXPLORE_LINKS.map((link) => (
            <li key={link.href} className="shrink-0">
              <a
                href={link.href}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-[#c6c6c6] bg-white px-4 text-sm font-medium tracking-[-0.01em] text-foreground no-underline min-h-11 md:min-h-9 md:px-3.5 md:text-[13px] transition-colors hover:bg-white"
              >
                {link.label}
              </a>
            </li>
          ))}
      </ul>
    </section>
  );
}
