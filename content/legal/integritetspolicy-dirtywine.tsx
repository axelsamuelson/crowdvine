import {
  LegalH2,
  LegalLink,
  LegalList,
  LegalP,
  LegalProse,
  LegalTable,
  LegalTd,
  LegalTh,
} from "@/components/legal/legal-prose";

export type DirtyWinePrivacyProps = {
  /** From env DIRTYWINE_LEGAL_ADDRESS; omitted from copy when empty. */
  legalAddress?: string | null;
};

/**
 * Processors evidenced for dirtywine.se (shared Next.js deployment).
 * Sources documented in the PR body — do not invent vendors.
 */
export const DIRTYWINE_PRIVACY_PROCESSORS = [
  {
    service: "Vercel",
    purpose: "Hosting och webbstatistik",
    country: "Sverige (arn1) / USA",
  },
  {
    service: "Supabase",
    purpose: "Databas, autentisering och lagring av användarhändelser",
    country: "Sverige (eu-north-1)",
  },
  {
    service: "Resend",
    purpose: "Utskick av bekräftelse- och kontomejl",
    country: "USA",
  },
] as const;

function ContactEmail() {
  return (
    <LegalLink href="mailto:axel@dirtywine.se">axel@dirtywine.se</LegalLink>
  );
}

export default function DirtyWineIntegritetspolicyContent({
  legalAddress,
}: DirtyWinePrivacyProps) {
  const address = legalAddress?.trim() || null;

  return (
    <LegalProse>
      <LegalP>
        Den här policyn gäller dirtywine.se. Personuppgiftsansvarig är Axel
        Samuelson (enskild firma), Stockholm
        {address ? `, ${address}` : ""}. Kontakt: <ContactEmail />.
      </LegalP>

      <LegalH2>Vilka uppgifter vi behandlar</LegalH2>
      <LegalP>
        Uppgifter om dig som kontaktperson hos en restaurang eller bar: namn,
        e-post, telefon, roll och företag samt dina förfrågningar och
        beställningar. Inloggningsuppgifter för ditt konto.
      </LegalP>

      <LegalH2>Varför och med vilken rättslig grund</LegalH2>
      <LegalList>
        <li>
          För att hantera konto, förfrågningar och leveranser. Grunden är avtal
          med företaget och vårt berättigade intresse av att kunna ha kontakt
          med dess personal.
        </li>
        <li>
          För att kontakta krogar om vårt sortiment och om provningar. Grunden
          är berättigat intresse, och du kan när som helst säga nej genom att
          svara på ett mejl.
        </li>
        <li>
          För bokföring och alkoholskatt. Grunden är rättslig förpliktelse.
        </li>
      </LegalList>

      <LegalH2>Hur länge</LegalH2>
      <LegalP>
        Kontouppgifter sparas så länge kontot finns. Kontaktuppgifter för
        försäljning sparas i högst 2 år efter senaste kontakt.
        Bokföringsunderlag sparas i 7 år.
      </LegalP>

      <LegalH2>Mottagare</LegalH2>
      <LegalP>Leverantörer som driver tjänsten för vår räkning:</LegalP>

      {/* <640px: stacked blocks; ≥sm (640px): table */}
      <ul className="sm:hidden space-y-4 list-none pl-0">
        {DIRTYWINE_PRIVACY_PROCESSORS.map((row) => (
          <li key={row.service} className="border-b border-border pb-4">
            <p className="font-medium text-foreground">{row.service}</p>
            <p className="mt-0.5">{row.purpose}</p>
            <p className="mt-0.5 text-muted-foreground/80">{row.country}</p>
          </li>
        ))}
      </ul>

      <LegalTable className="hidden sm:block">
        <thead>
          <tr>
            <LegalTh>Tjänst</LegalTh>
            <LegalTh>Syfte</LegalTh>
            <LegalTh>Land</LegalTh>
          </tr>
        </thead>
        <tbody>
          {DIRTYWINE_PRIVACY_PROCESSORS.map((row) => (
            <tr key={row.service}>
              <LegalTd>{row.service}</LegalTd>
              <LegalTd>{row.purpose}</LegalTd>
              <LegalTd>{row.country}</LegalTd>
            </tr>
          ))}
        </tbody>
      </LegalTable>

      <LegalP>Uppgifterna säljs aldrig.</LegalP>
      <LegalP>
        {
          "Vid överföring till USA används EU–US Data Privacy Framework eller EU:s standardavtalsklausuler, beroende på leverantör."
        }
      </LegalP>

      <LegalH2>Dina rättigheter</LegalH2>
      <LegalP>
        Du har rätt till tillgång, rättelse, radering, begränsning och
        invändning, och rätt till dataportabilitet. Mejla <ContactEmail />. Du
        kan klaga hos Integritetsskyddsmyndigheten (
        <LegalLink href="https://imy.se">imy.se</LegalLink>).
      </LegalP>
    </LegalProse>
  );
}
