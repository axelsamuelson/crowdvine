/**
 * Diagnostic run for one wine + one source: capture request/response and match details.
 */

import type { FetchRecord } from "./fetch-with-retries";
import { setDiagnosticRecorder } from "./fetch-with-retries";
import { getAdapter } from "./adapters";
import { evaluateMatch, MATCH_THRESHOLD } from "./match";
import { getPriceSource } from "./db";
import type { NormalizedOffer, PriceSource, WineForMatch } from "./types";

async function loadWineForMatch(wineId: string): Promise<WineForMatch | null> {
  const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("wines")
    .select("id, wine_name, vintage, grape_varieties, color, producer_id, producers(name)")
    .eq("id", wineId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as {
    id: string;
    wine_name: string;
    vintage: string;
    grape_varieties?: string;
    color?: string;
    producer_id: string;
    producers: { name: string } | null;
  };
  return {
    id: row.id,
    wine_name: row.wine_name,
    vintage: row.vintage,
    producer: row.producers ? { name: row.producers.name } : null,
    grape_varieties: row.grape_varieties ?? null,
    color: row.color ?? null,
  };
}

export interface DiagnosticCandidate {
  pdpUrl: string;
  fetchStatus: number;
  fetchByteLength: number;
  fetchSnippet: string;
  botBlockDetected: boolean;
  extracted: Partial<NormalizedOffer> | null;
  matchScore: number;
  matchBreakdown: ReturnType<typeof evaluateMatch>["breakdown"];
  decision: "accepted" | "rejected";
  rejectReason: string | null;
}

export interface DiagnosticOutput {
  wine: WineForMatch | null;
  source: PriceSource | null;
  error?: string;
  requests: FetchRecord[];
  candidateCount: number;
  candidates: DiagnosticCandidate[];
  thresholdUsed: number;
}

export async function runDiagnostic(
  wineId: string,
  sourceId: string
): Promise<DiagnosticOutput> {
  const requests: FetchRecord[] = [];
  setDiagnosticRecorder((r) => requests.push(r));

  try {
    const [wine, source] = await Promise.all([
      loadWineForMatch(wineId),
      getPriceSource(sourceId),
    ]);

    if (!wine) {
      setDiagnosticRecorder(null);
      return {
        wine: null,
        source: source ?? null,
        error: `Wine not found: ${wineId}`,
        requests: [],
        candidateCount: 0,
        candidates: [],
        thresholdUsed: MATCH_THRESHOLD,
      };
    }
    if (!source) {
      setDiagnosticRecorder(null);
      return {
        wine,
        source: null,
        error: `Price source not found: ${sourceId}`,
        requests: [],
        candidateCount: 0,
        candidates: [],
        thresholdUsed: MATCH_THRESHOLD,
      };
    }

    const threshold =
      (source.config?.matchThreshold as number) ?? MATCH_THRESHOLD;
    const adapter = getAdapter(source);
    const candidateUrls = await adapter.searchCandidates(wine, source);
    const searchRequestCount = requests.length;

    const candidates: DiagnosticCandidate[] = [];

    for (let i = 0; i < candidateUrls.length; i++) {
      const pdpUrl = candidateUrls[i];
      const req = requests[searchRequestCount + i];
      const fetchStatus = req?.status ?? 0;
      const fetchByteLength = req?.bodyByteLength ?? 0;
      const fetchSnippet = req?.bodySnippet ?? "";
      const botBlockDetected = req?.botBlockDetected ?? false;

      let extracted: Partial<NormalizedOffer> | null = null;
      try {
        const offer = await adapter.fetchOffer(pdpUrl, source);
        if (offer) {
          extracted = {
            titleRaw: offer.titleRaw,
            priceAmount: offer.priceAmount,
            currency: offer.currency,
            available: offer.available,
            pdpUrl: offer.pdpUrl,
            vendor: offer.vendor ?? undefined,
            size: offer.size ?? undefined,
          };
          const evalResult = evaluateMatch(wine, offer, { threshold });
          candidates.push({
            pdpUrl,
            fetchStatus,
            fetchByteLength,
            fetchSnippet,
            botBlockDetected,
            extracted,
            matchScore: evalResult.score,
            matchBreakdown: evalResult.breakdown,
            decision: evalResult.accepted ? "accepted" : "rejected",
            rejectReason: evalResult.rejectReason,
          });
        } else {
          candidates.push({
            pdpUrl,
            fetchStatus,
            fetchByteLength,
            fetchSnippet,
            botBlockDetected,
            extracted: null,
            matchScore: 0,
            matchBreakdown: {
              producerScore: 0,
              wineNameScore: 0,
              vintageScore: 0,
              vintageOur: null,
              vintagePdp: null,
              sizeOur: null,
              sizePdp: null,
            },
            decision: "rejected",
            rejectReason: "no_offer_extracted",
          });
        }
      } catch (err) {
        candidates.push({
          pdpUrl,
          fetchStatus,
          fetchByteLength,
          fetchSnippet,
          botBlockDetected,
          extracted: null,
          matchScore: 0,
          matchBreakdown: {
            producerScore: 0,
            wineNameScore: 0,
            vintageScore: 0,
            vintageOur: null,
            vintagePdp: null,
            sizeOur: null,
            sizePdp: null,
          },
          decision: "rejected",
            rejectReason: err instanceof Error ? err.message : "fetch_or_parse_error",
        });
      }
    }

    setDiagnosticRecorder(null);
    // PDP fetches append to requests; req above is correct per candidate

    return {
      wine,
      source,
      requests,
      candidateCount: candidateUrls.length,
      candidates,
      thresholdUsed: threshold,
    };
  } finally {
    setDiagnosticRecorder(null);
  }
}
