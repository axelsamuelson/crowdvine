import {
  LegalH2,
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
] as const;

export default function DirtyWineIntegritetspolicyContent({
  legalAddress,
}: DirtyWinePrivacyProps) {
  const address = legalAddress?.trim() || null;

  return (
    <LegalProse>
      <LegalH2>Integritetspolicy för Dirty Wine</LegalH2>
      <LegalP>
        Personuppgiftsansvarig är Axel Samuelson (enskild firma), Stockholm
        {address ? `, ${address}` : ""}. Kontakt: axel@dirtywine.se.
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
      <LegalP>
        Leverantörer som driver tjänsten för vår räkning:
      </LegalP>
      <LegalTable>
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

      <LegalH2>Dina rättigheter</LegalH2>
      <LegalP>
        Du har rätt till tillgång, rättelse, radering, begränsning och
        invändning, och rätt till dataportabilitet. Mejla axel@dirtywine.se. Du
        kan klaga hos Integritetsskyddsmyndigheten (imy.se).
      </LegalP>

      <LegalP>Senast uppdaterad: 31 oktober 2026</LegalP>
    </LegalProse>
  );
}
