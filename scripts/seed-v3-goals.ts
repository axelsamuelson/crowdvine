/**
 * Seeds goal "Första leveransen" with Acquisition / Activation / Conversion / AOQ,
 * objective metrics, projects, and tasks (OKR + metrics v1).
 *
 * Idempotent: skips objectives that already exist for this goal (matched by title).
 *
 * Run: pnpm exec tsx scripts/seed-v3-goals.ts
 * Requires: migrations 106–107 applied; .env.local with service role.
 */

import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

import { getSupabaseAdmin } from "../lib/supabase-admin"

const GOAL_TITLE = "Första leveransen"
const GOAL_DESCRIPTION =
  "Genomföra vår första B2C-leverans till riktiga kunder, samla genuin feedback, och iterera tills folk köper utan att vi behöver övertala dem."

const DEFAULT_PERIOD = "H2 2026"

type MetricSeed = {
  slug: string
  label: string
  unit: string
  query_type: "count" | "ratio" | "average" | "sum" | "custom"
  query_config: Record<string, unknown>
  target_value: number | null
  period_type: string
}

type ProjectSeed = { name: string; description: string; tasks: string[] }

type ObjSeed = {
  title: string
  description: string
  metrics: MetricSeed[]
  projects: ProjectSeed[]
}

const OBJECTIVES: ObjSeed[] = [
  {
    title: "Acquisition",
    description:
      "Rekrytera fler medlemmar till plattformen. Fyll toppen av funneln med rätt personer som är intresserade av att köpa vin direkt från producenter.",
    metrics: [
      {
        slug: "signup_count",
        label: "Registrerade medlemmar",
        unit: "members",
        query_type: "count",
        query_config: { table: "profiles", count_column: "*" },
        target_value: 100,
        period_type: "all_time",
      },
    ],
    projects: [
      {
        name: "Prata med befintliga användare (Mom Test)",
        description:
          "Kontakta användare som skapat konto men inte köpt. Förstå vad som fick dem att registrera sig och varför de inte gått vidare.",
        tasks: [
          "Välj 10–15 användare som skapat konto men inte lagt en order",
          "Kontakta personligt: 'Har du 10 min för ett kort samtal?'",
          "Genomför Mom Test-samtal: fråga om beteende, inte om de gillar PACT",
          "Dokumentera ordagrant — tveksamheter, invändningar, missförstånd",
          "Sammanfatta mönster efter 10 samtal: vilka 2–3 saker stoppar folk?",
        ],
      },
      {
        name: "Vinentusiast-communities",
        description:
          "Gå dit folk redan pratar om vin. Bygg förtroende innan vi pitchar.",
        tasks: [
          "Kartlägg de 10 mest aktiva svenska vin-communities (Facebook, Reddit, Vivino, Discord)",
          "Skapa personlig pitch anpassad per community — inte spam, genuin",
          "Posta i 3 grupper/vecka med värdefullt innehåll + länk till PACT",
          "Identifiera 5 micro-influencers inom vin (1k–10k följare) och kontakta dem",
          "Mät: spåra signup-källa per community (UTM eller 'hur hittade du oss?')",
        ],
      },
      {
        name: "Referral-loop",
        description:
          "Låt befintliga användare rekrytera nya. Vin delas naturligt — utnyttja det.",
        tasks: [
          "Designa referral-mekanism: 'Bjud in en vän, ni får båda X'",
          "Bygg referral-flöde: unik länk per användare, spåra vem som bjöd in vem",
          "Skicka personligt mail till 20 första signups och be dem sprida",
          "A/B-testa incitament: rabatt vs exklusivitet vs fri frakt",
        ],
      },
      {
        name: "Lokal närvaro & events",
        description:
          "Fysisk kontakt konverterar bättre än digitala annonser i vinvärlden.",
        tasks: [
          "Identifiera 5 lokala vinevenemang eller matmarknader kommande 3 månader",
          "Skapa PACT-kit för events: QR-kod till signup, one-pager, ev. smakprover",
          "Delta på minst 2 events och samla signups",
          "Följ upp alla event-signups inom 48h med personligt välkomstmail",
        ],
      },
    ],
  },
  {
    title: "Activation",
    description:
      "Få medlemmar att lägga sin första beställning. Sänk tröskeln, subventionera om nödvändigt, gör det löjligt enkelt.",
    metrics: [
      {
        slug: "activated_users",
        label: "Användare med minst en beställning",
        unit: "users",
        query_type: "count",
        query_config: {
          table: "order_reservations",
          count_column: "DISTINCT user_id",
          filters: {
            status: ["placed", "approved", "confirmed", "pending_payment"],
          },
        },
        target_value: 10,
        period_type: "all_time",
      },
    ],
    projects: [
      {
        name: "Första 10 kunderna (manuellt)",
        description:
          "Vi behöver inte en funnel. Vi behöver 10 människor som beställer via plattformen.",
        tasks: [
          "Identifiera 20 personer i nätverket som dricker vin och bor i Stockholm",
          "Kontakta personligt: 'Vi lanserar — vill du bli en av våra första kunder?'",
          "Erbjud förmånligt pris eller gratis frakt för de första 10",
          "Låt dem beställa via plattformen — testa hela flödet end-to-end",
          "Dokumentera: var i flödet tvekade de? Vad behövde de hjälp med?",
        ],
      },
      {
        name: "Starterbjudande (Grand Slam Offer)",
        description:
          "Designa ett första-order-erbjudande genom Value Equation som gör att folk känner sig dumma om de tackar nej.",
        tasks: [
          "Skapa 2–3 kurerade startlådor: Naturvinslådan, Italien-lådan, Överraskningslådan",
          "Prissätt som kundanskaffning — break-even eller liten förlust",
          "Gör startlådan till primärt CTA på startsidan",
          "Lägg till nöjd-kund-garanti: 'Gillar du inte vinet, kontakta oss'",
          "Testa erbjudandet muntligt på 10 personer — sök commitments",
        ],
      },
      {
        name: "Subventionera första pallen",
        description:
          "En pall kostar ~100€ oavsett storlek. Ta förlusten medvetet som en marknadsföringskostnad.",
        tasks: [
          "Beräkna break-even: vid nuvarande 17% marginal, hur många flaskor behövs per pall?",
          "Besluta max subventionering per pall (t.ex. 100€ förlust = OK)",
          "Fyll med B2B-volymer: kontakta 5 restauranger/vinbarer i Stockholm",
          "Koordinera med producenter: samla flaskor, packa pall, skicka",
          "Dokumentera hela logistikflödet från beställning till leverans",
        ],
      },
    ],
  },
  {
    title: "Conversion",
    description:
      "Öka andelen registrerade medlemmar som faktiskt lägger en beställning. Fixa det som stoppar folk mellan 'titta' och 'köp'.",
    metrics: [
      {
        slug: "conversion_rate",
        label: "Konverteringsgrad signup → order",
        unit: "%",
        query_type: "ratio",
        query_config: {
          numerator: {
            table: "order_reservations",
            count_column: "DISTINCT user_id",
            filters: {
              status: ["placed", "approved", "confirmed", "pending_payment"],
            },
          },
          denominator: { table: "profiles", count_column: "*" },
          multiply_by: 100,
        },
        target_value: 10,
        period_type: "all_time",
      },
      {
        slug: "add_to_cart_count",
        label: "Add to cart events",
        unit: "events",
        query_type: "count",
        query_config: {
          table: "user_events",
          count_column: "*",
          filters: { event_type: "add_to_cart" },
        },
        target_value: null,
        period_type: "all_time",
      },
    ],
    projects: [
      {
        name: "Producentberättelsen som köpargument",
        description:
          "Berättelsen ÄR produkten. Utan den är PACT bara ytterligare en vinlista.",
        tasks: [
          "Skapa producentberättelse-mall: vem, varför detta vin, smak, varför inte på Systembolaget",
          "Implementera berättelse + foto av producent/vingård på varje produktsida",
          "Testa: visa uppdaterad sida för 5 personer, lyssna på reaktionen",
        ],
      },
      {
        name: "Tydliggör vad som händer efter köp",
        description:
          "Användare frågar 'när kan jag lägga en beställning?' — de förstår inte att de redan kan. Fixa det.",
        tasks: [
          "Bestäm leveranslöfte: fast cykel, rullande med uppskattning, eller subventionerad",
          "Visa leveranslöftet tydligt på produktsida, i varukorg och vid checkout",
          "Testa progress-indikator: 'Nästa leverans: 73% fylld'",
          "Skriv FAQ-sektion: 'Hur funkar det?' i max 3 meningar",
        ],
      },
      {
        name: "Priskommunikation",
        description:
          "Vi är billigare per flaska — men bara om kunden ser det.",
        tasks: [
          "Visa jämförelsepris eller besparingsindikator mot Systembolagets nivåer",
          "Visa tydligt vad som ingår i priset — inga dolda kostnader vid checkout",
          "Skapa 'Så funkar priset'-sektion: direkt från producent, utan mellanhänder",
        ],
      },
      {
        name: "Checkout-optimering",
        description: "Varje extra klick kostar flaskor.",
        tasks: [
          "Granska checkout: hur många steg? Krävs konto? Vilka betalmetoder?",
          "Implementera gäst-checkout om det inte finns",
          "Säkerställ Swish/Klarna/kort som betalningsalternativ",
          "Visa ordersummering med tydlig leveranstid innan betalning",
        ],
      },
    ],
  },
  {
    title: "AOQ / Value Optimization",
    description:
      "Öka antalet flaskor per beställning. Skillnaden mellan 2 och 6 flaskor per order multiplicerar allt annat.",
    metrics: [
      {
        slug: "avg_bottles_per_order",
        label: "Snitt flaskor per order",
        unit: "bottles",
        query_type: "average",
        query_config: {
          table: "order_reservation_items",
          avg_column: "quantity",
          join: {
            table: "order_reservations",
            on: "order_reservation_items.reservation_id = order_reservations.id",
            filters: {
              status: ["placed", "approved", "confirmed", "pending_payment"],
            },
          },
          group_by: "order_reservations.id",
          aggregate: "avg_of_sums",
        },
        target_value: 6,
        period_type: "all_time",
      },
      {
        slug: "total_bottles",
        label: "Totalt beställda flaskor",
        unit: "bottles",
        query_type: "sum",
        query_config: {
          table: "order_reservation_items",
          sum_column: "quantity",
          join: {
            table: "order_reservations",
            on: "order_reservation_items.reservation_id = order_reservations.id",
            filters: {
              status: ["placed", "approved", "confirmed", "pending_payment"],
            },
          },
        },
        target_value: 300,
        period_type: "all_time",
      },
    ],
    projects: [
      {
        name: "Kurerade lådor som default",
        description:
          "Gör det enklare och billigare att köpa mer — och gör det till standardvalet.",
        tasks: [
          "Skapa 3–5 kurerade lådor: Sommarlådan (6 fl), Provarlåda (3 fl), Blandat (6 fl)",
          "Prissätt med tydlig besparing vs enskilda flaskor",
          "Gör en låda till primärt CTA istället för enskild flaska",
          "A/B-testa: kurerad låda vs 'bygg din egen'",
        ],
      },
      {
        name: "Progressiv prissättning / volymrabatt",
        description: "Belöna större beställningar synligt i realtid.",
        tasks: [
          "Implementera trappstegsrabatt: 6+ flaskor = X%, 12+ = Y%",
          "Visa progress bar i kundvagnen: 'Lägg till 2 flaskor för fri frakt'",
          "Placera nästa rabattnivå synligt vid checkout",
        ],
      },
      {
        name: "Delad beställning (validera först)",
        description:
          "En person som bjuder in vänner löser acquisition, activation OCH AOQ samtidigt.",
        tasks: [
          "Validera intresse: fråga 10 befintliga kontakter om de vill gå ihop med vänner",
          "Om 5+ ja: designa enkelt MVP-flöde med delbar länk",
          "Kommunicera egenintresset: fler medbeställare = lägre fraktkostnad per person",
        ],
      },
    ],
  },
]

async function main() {
  const sb = getSupabaseAdmin()

  const { data: adminRow, error: adminErr } = await sb
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle()

  if (adminErr) throw adminErr
  if (!adminRow?.id) {
    throw new Error("No admin profile (role=admin). Cannot set created_by.")
  }
  const created_by = adminRow.id

  let goalId: string
  const { data: existingGoal } = await sb
    .from("admin_goals")
    .select("id")
    .eq("title", GOAL_TITLE)
    .is("deleted_at", null)
    .maybeSingle()

  if (existingGoal?.id) {
    goalId = existingGoal.id
    console.log("Using existing goal:", goalId)
  } else {
    const { data: g, error: gErr } = await sb
      .from("admin_goals")
      .insert({
        title: GOAL_TITLE,
        description: GOAL_DESCRIPTION,
        status: "active",
        created_by,
      })
      .select("id")
      .single()
    if (gErr) throw gErr
    goalId = g!.id
    console.log("Created goal:", goalId)
  }

  for (const obj of OBJECTIVES) {
    const { data: existingObj } = await sb
      .from("admin_objectives")
      .select("id")
      .eq("goal_id", goalId)
      .eq("title", obj.title)
      .is("deleted_at", null)
      .maybeSingle()

    let objectiveId: string
    if (existingObj?.id) {
      objectiveId = existingObj.id
      console.log("  Skip objective (exists):", obj.title)
    } else {
      const { data: o, error: oErr } = await sb
        .from("admin_objectives")
        .insert({
          title: obj.title,
          description: obj.description,
          period: DEFAULT_PERIOD,
          goal_id: goalId,
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
      objectiveId = o!.id
      console.log("  Objective:", objectiveId, obj.title)
    }

    for (const m of obj.metrics) {
      const { error: mErr } = await sb.from("admin_objective_metrics").upsert(
        {
          objective_id: objectiveId,
          slug: m.slug,
          label: m.label,
          unit: m.unit,
          query_type: m.query_type,
          query_config: m.query_config,
          target_value: m.target_value,
          period_type: m.period_type,
        },
        { onConflict: "objective_id,slug" },
      )
      if (mErr) throw mErr
    }

    const { error: rpcErr } = await sb.rpc("admin_refresh_objective_metrics", {
      p_objective_id: objectiveId,
    })
    if (rpcErr) {
      console.warn("  RPC refresh failed (run migration 107?):", rpcErr.message)
    }

    for (const proj of obj.projects) {
      const { data: existingProj } = await sb
        .from("admin_projects")
        .select("id")
        .eq("objective_id", objectiveId)
        .eq("name", proj.name)
        .is("deleted_at", null)
        .maybeSingle()

      let projectId: string
      if (existingProj?.id) {
        projectId = existingProj.id
        console.log("    Skip project:", proj.name.slice(0, 40))
      } else {
        const { data: p, error: pErr } = await sb
          .from("admin_projects")
          .insert({
            name: proj.name,
            description: proj.description,
            objective_id: objectiveId,
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
        projectId = p!.id
        console.log("    Project:", projectId, proj.name.slice(0, 40))
      }

      for (const title of proj.tasks) {
        const { data: existingTask } = await sb
          .from("admin_tasks")
          .select("id")
          .eq("project_id", projectId)
          .eq("title", title)
          .is("deleted_at", null)
          .maybeSingle()

        if (existingTask?.id) continue

        const { error: tErr } = await sb.from("admin_tasks").insert({
          title,
          description: null,
          project_id: projectId,
          objective_id: objectiveId,
          assigned_to: null,
          created_by,
          status: "todo",
          priority: "medium",
          task_type: "ops",
        })
        if (tErr) throw tErr
      }
    }
  }

  console.log("Done. Goal", goalId)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
