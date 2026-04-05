/**
 * Seeds OKR Framework v3 tree: 1 goal, 4 objectives, projects, tasks.
 * Idempotent: skips if a non-deleted goal titled "Första leveransen" exists.
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * Run: pnpm exec tsx scripts/seed-v3-framework.ts
 */

import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

import { getSupabaseAdmin } from "../lib/supabase-admin"

const GOAL_TITLE = "Första leveransen"

const DEFAULT_PERIOD = "H2 2026"

type ProjSeed = { title: string; description: string; tasks: string[] }

type ObjSeed = { title: string; description: string; projects: ProjSeed[] }

const OBJECTIVES: ObjSeed[] = [
  {
    title: "Förstå varför folk inte köper",
    description:
      "Vi har data — folk skapar konto och tittar på vin men lägger inte i cart. Innan vi ändrar något behöver vi förstå varför.",
    projects: [
      {
        title: "Analysera beteendedata",
        description:
          "Kartlägg den exakta funneln med siffror och identifiera var folk droppar.",
        tasks: [
          "Kartlägg funneln med siffror: besökare → konto → bläddra vin → produktsida → add to cart → checkout → order",
          "Mät tid på produktsidor — stannar folk 3 sekunder eller 30?",
          "Identifiera skillnader mellan producenter/viner — säljer någons sidor bättre?",
          "Analysera mönster i vilka användare som kommer längst (källa, demografi, beteende)",
        ],
      },
      {
        title: "Prata med befintliga användare (Mom Test)",
        description:
          "Kontakta 10–15 användare som skapat konto och tittat på vin men inte köpt. De har svaret.",
        tasks: [
          "Välj 10–15 användare som skapat konto och tittat på vin men inte köpt",
          "Kontakta personligt — inte massmail: 'Har du 10 min för ett kort samtal?'",
          "Genomför Mom Test-samtal: fråga om beteende, inte om de gillar PACT",
          "Dokumentera ordagrant — speciellt tveksamheter, invändningar och missförstånd",
          "Sammanfatta mönster efter 10 samtal: vilka 2–3 saker stoppar folk mest?",
        ],
      },
      {
        title: "Granska produktsidan med fräscha ögon",
        description:
          "Ärlig utvärdering av vad kunden faktiskt ser på sajten idag.",
        tasks: [
          "Skärmdumpa 3 representativa produktsidor och granska mot Value Equation",
          "Be 3 personer utanför teamet dela skärm och tänka högt medan de besöker sajten",
          "Jämför med 2–3 konkurrenter (dansk nätbutik, Vivino, Natural Wine Dealers)",
        ],
      },
    ],
  },
  {
    title: "Gör produktsidan så övertygande att folk köper",
    description:
      "Baserat på insikter från Objective 1 — fixa det som stoppar folk från att lägga i varukorgen.",
    projects: [
      {
        title: "Producentberättelsen som köpargument",
        description:
          "Berättelsen ÄR produkten. Utan den är PACT bara ytterligare en vinlista med priser.",
        tasks: [
          "Skapa producentberättelse-mall: vem, varför detta vin, smak, varför inte på Systembolaget",
          "Implementera berättelse + foto av producent/vingård på varje produktsida",
          "Testa: visa uppdaterad sida för 5 personer, lyssna på reaktionen",
        ],
      },
      {
        title: "Tydliggör vad som händer efter köp",
        description:
          "Om kunden inte vet när de får sitt vin köper de inte.",
        tasks: [
          "Bestäm leveranslöfte: fast cykel, rullande med uppskattning, eller subventionerad snabbleverans",
          "Visa leveranslöftet tydligt på produktsidan, i varukorgen och vid checkout",
          "Överväg och testa progress-indikator: 'Nästa leverans: 73% fylld'",
        ],
      },
      {
        title: "Priskommunikation",
        description:
          "'Mycket billigare per flaska' är vårt starkaste argument — men bara om kunden ser det.",
        tasks: [
          "Visa jämförelsepris eller besparingsindikator mot Systembolagets nivåer",
          "Visa tydligt vad som ingår i priset — inga dolda kostnader vid checkout",
          "Skapa 'Så här funkar priset'-sektion: direkt från producent, utan mellanhänder",
        ],
      },
      {
        title: "Sänk tröskeln med ett starterbjudande",
        description:
          "Designa ett första-order-erbjudande genom Value Equation som sänker risken till noll.",
        tasks: [
          "Skapa 2–3 kurerade startlådor: Naturvinslådan, Italien-lådan, Överraskningslådan",
          "Prissätt attraktivt — break-even eller liten förlust, detta är kundanskaffning",
          "Gör startlådan till primärt CTA på startsidan — inte 'bläddra bland alla viner'",
          "Lägg till nöjd-kund-garanti: 'Gillar du inte vinet, kontakta oss'",
        ],
      },
    ],
  },
  {
    title: "Genomför första B2C-leveransen",
    description:
      "Sluta planera. Leverera vin till riktiga människor. Lär er av det.",
    projects: [
      {
        title: "Första 10 kunderna (manuellt)",
        description:
          "Ni behöver inte en funnel för de första 10. Ni behöver 10 människor som beställer.",
        tasks: [
          "Identifiera 20 personer i ert nätverk som dricker vin och bor i Stockholm",
          "Kontakta personligt: 'Vi lanserar och vill att du blir en av våra första kunder'",
          "Erbjud förmånligt pris eller gratis frakt för de första 10",
          "Låt dem beställa via plattformen — testa hela flödet end-to-end",
        ],
      },
      {
        title: "Fyll pallen med B2B",
        description:
          "Komplettera med B2B-volymer för att nå pallens ekonomiska miniminivå.",
        tasks: [
          "Kontakta 5 restauranger/vinbarer i Stockholm som är intresserade av naturvin",
          "Erbjud: 'Vi har en leverans som kommer — vill ni lägga till era flaskor?'",
          "Mål: tillräckligt B2B-flaskor för att pallen bär sig ekonomiskt (100+ totalt)",
        ],
      },
      {
        title: "Skicka pallen och samla feedback",
        description:
          "Det enda sättet att veta om PACT funkar är att göra det.",
        tasks: [
          "Koordinera med producenter: samla flaskor, packa pall, etiketter, frakt",
          "Förbered kundkommunikation: 'Din beställning har skickats! Leverans: [datum]'",
          "Följ upp med varje kund 3–5 dagar efter leverans med feedback-frågor",
          "Dokumentera all feedback ordagrant",
          "Be nöjda kunder om testimonial (2–3 meningar + foto om möjligt)",
          "Be varje kund: 'Känner du någon som också skulle vilja testa?' (naturlig referral)",
        ],
      },
    ],
  },
  {
    title: "Bygg en repeterbar loop",
    description:
      "Först efter leverans 1 med riktig feedback kan vi börja skala.",
    projects: [
      {
        title: "Iterera baserat på verklig feedback",
        description:
          "Sammanställ feedback från första leveransen och gör konkreta förbättringar.",
        tasks: [
          "Sammanställ all feedback från första leveransen",
          "Identifiera: vad överraskade positivt? Vad frustrerade? Vad fattade folk inte?",
          "Gör 3–5 konkreta förändringar på plattformen baserat på feedback",
          "Planera leverans 2 med förbättringarna implementerade",
        ],
      },
      {
        title: "Testa en traction-kanal (Bullseye)",
        description:
          "Systematiskt testa hur vi hittar kunder utanför vårt nätverk.",
        tasks: [
          "Bullseye brainstorm: gå igenom alla 19 kanaler, ranka, välj 3 att testa",
          "Kör kanal-test 1: [community/events/referral] — 2 veckor, max 3000 kr",
          "Kör kanal-test 2: [blogs/influencers/existing platforms] — 2 veckor, max 3000 kr",
          "Kör kanal-test 3: [offline events/engineering as marketing] — 2 veckor, max 3000 kr",
          "Mät CAC och konvertering per kanal, välj vinnare, fokusera",
        ],
      },
      {
        title: "Etablera leveransrytm",
        description: "Gå från engångsleverans till regelbunden cadence.",
        tasks: [
          "Bestäm cadence: leverans varje månad eller varannan månad",
          "Kommunicera tydligt: 'PACT levererar den 15:e varje månad — beställ senast den 10:e'",
          "Skapa marknadsföringsrytm kring leveranscykeln",
          "Mät: ökar antalet B2C-ordrar per leveranscykel?",
        ],
      },
      {
        title: "Viral loop genom delad beställning",
        description:
          "Ju fler som beställer, desto billigare frakt per person. Använd den inbyggda mekaniken.",
        tasks: [
          "Validera manuellt: fråga första 10 kunder om de vill gå ihop med vänner",
          "Om intresse: bygg enkel 'bjud in till pallen'-funktion med delbar länk",
          "Kommunicera egenintresset: fler medbeställare = lägre fraktkostnad per person",
        ],
      },
    ],
  },
]

async function main() {
  const sb = getSupabaseAdmin()

  const { data: dup } = await sb
    .from("admin_goals")
    .select("id")
    .eq("title", GOAL_TITLE)
    .is("deleted_at", null)
    .maybeSingle()

  if (dup) {
    console.log(`Skip: goal "${GOAL_TITLE}" already exists (${dup.id})`)
    return
  }

  const { data: adminRow, error: adminErr } = await sb
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle()

  if (adminErr) throw adminErr
  if (!adminRow?.id) {
    throw new Error("No admin profile found (role=admin). Cannot set created_by.")
  }
  const created_by = adminRow.id

  const { data: goal, error: gErr } = await sb
    .from("admin_goals")
    .insert({
      title: GOAL_TITLE,
      description:
        "Genomföra vår första B2C-leverans till riktiga kunder, samla genuin feedback, och använda den för att iterera tills folk köper utan att vi behöver övertala dem.",
      status: "active",
      created_by,
    })
    .select("id")
    .single()

  if (gErr) throw gErr
  console.log("Goal:", goal.id)

  for (const obj of OBJECTIVES) {
    const { data: objective, error: oErr } = await sb
      .from("admin_objectives")
      .insert({
        title: obj.title,
        description: obj.description,
        period: DEFAULT_PERIOD,
        goal_id: goal.id,
        status: "active",
        progress_method: "tasks",
        strategy_area: null,
        owner_id: null,
        manual_progress: null,
        created_by,
      })
      .select("id")
      .single()

    if (oErr) throw oErr
    console.log("  Objective:", objective.id, obj.title.slice(0, 48))

    for (const proj of obj.projects) {
      const { data: project, error: pErr } = await sb
        .from("admin_projects")
        .insert({
          name: proj.title,
          description: proj.description,
          objective_id: objective.id,
          key_result_id: null,
          owner_id: null,
          status: "active",
          priority: "medium",
          start_date: null,
          due_date: null,
          created_by,
        })
        .select("id")
        .single()

      if (pErr) throw pErr
      console.log("    Project:", project.id, proj.title.slice(0, 40))

      for (const title of proj.tasks) {
        const { data: task, error: tErr } = await sb
          .from("admin_tasks")
          .insert({
            title,
            description: null,
            project_id: project.id,
            objective_id: objective.id,
            assigned_to: null,
            created_by,
            status: "todo",
            priority: "medium",
            task_type: "ops",
          })
          .select("id")
          .single()

        if (tErr) throw tErr
        console.log("      Task:", task.id)
      }
    }
  }

  console.log("Done. Seeded v3 framework under goal", goal.id)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
