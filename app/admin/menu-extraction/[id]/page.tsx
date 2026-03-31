"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RelatedTasksCard } from "@/components/admin/operations/related-tasks-card";
import type { Task, ProjectMin, ObjectiveMin, AdminUserMin } from "@/lib/types/operations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Play,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  FileText,
  Loader2,
  Check,
  Pencil,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

type ExtractionStatus = "pending" | "processing" | "completed" | "failed";
type ConfidenceLabel = "high" | "medium" | "low";

interface MenuDocument {
  id: string;
  file_name: string;
  file_path: string;
  source_slug?: string | null;
  extraction_status: ExtractionStatus;
  created_at?: string;
  extracted_at?: string | null;
  last_extraction_attempt_at?: string | null;
  model_version?: string | null;
  prompt_version?: string | null;
  workflow_version?: string | null;
  error_message?: string | null;
  raw_text?: string | null;
  extraction_input_tokens?: number | null;
  extraction_output_tokens?: number | null;
  extraction_cache_read_input_tokens?: number | null;
  extraction_cache_creation_input_tokens?: number | null;
  critic_stats?: {
    approved_direct?: number;
    improved_by_critic?: number;
    escalated?: number;
  } | null;
  used_batch_api?: boolean | null;
  extraction_trace?: ExtractionTraceJson | null;
}

/** Mirrors lib/menu-extraction/types ExtractionTrace for client display. */
type ExtractionTraceJson = {
  documentId?: string;
  totalSections?: number;
  approvedFirstTry?: number;
  improvedByCritic?: number;
  escalated?: number;
  totalIterations?: number;
  totalCostUsd?: number;
  rawTextExtractionCostUsd?: number;
  batchActorCostUsd?: number;
  criticSkippedAutoApprove?: number;
  criticSkippedHeuristic?: number;
  criticApiCalls?: number;
  usedSonnetFallback?: boolean;
  sections?: Array<{
    section: string;
    iterations: number;
    approved: boolean;
    totalCostUsd: number;
    steps?: Array<{
      iteration: number;
      role: string;
      model?: string;
      approved?: boolean;
      confidence?: number;
      issueCount?: number;
      issues?: Array<{
        rowIndex: number;
        field: string;
        problem: string;
        suggestion: string;
      }>;
      skipped?: boolean;
      skipReason?: string;
      durationMs?: number;
      usage?: {
        inputTokens?: number;
        outputTokens?: number;
        cacheReadTokens?: number;
      };
      costUsd?: number;
    }>;
  }>;
};

interface MenuDocumentSection {
  id: string;
  section_name: string;
  normalized_section: string | null;
  section_order: number;
}

interface MenuExtractedRow {
  id: string;
  row_index: number;
  raw_text: string;
  producer: string | null;
  wine_name: string | null;
  vintage: string | null;
  country: string | null;
  region: string | null;
  price_glass: number | null;
  price_bottle: number | null;
  price_other: number | null;
  confidence_label: ConfidenceLabel | null;
  needs_review: boolean;
  review_reasons: string[] | null;
  section_id: string | null;
  auto_corrected?: boolean;
  extraction_iterations?: number | null;
  critic_approved?: boolean | null;
}

interface DocumentDetailResponse {
  document: MenuDocument;
  sections: MenuDocumentSection[];
  rows: MenuExtractedRow[];
  stats: {
    total_rows: number;
    needs_review_count: number;
    reviewed_count?: number;
    high_confidence_count: number;
    ambiguous_format_count: number;
    auto_corrected_count?: number;
    by_section: Record<string, number>;
  };
}

const RAW_TEXT_TRUNCATE = 60;

function rowToSnapshot(r: MenuExtractedRow): Record<string, unknown> {
  return {
    producer: r.producer,
    wine_name: r.wine_name,
    vintage: r.vintage,
    region: r.region,
    country: r.country,
    price_glass: r.price_glass,
    price_bottle: r.price_bottle,
    price_other: r.price_other,
    needs_review: r.needs_review,
    review_reasons: r.review_reasons,
  };
}

function CriticActorBadges({ row }: { row: MenuExtractedRow }) {
  const iter = row.extraction_iterations ?? 1;
  const approved = row.critic_approved;
  return (
    <>
      {iter > 1 && (
        <Badge
          variant="outline"
          className="text-[10px] border-violet-400 text-violet-800 dark:text-violet-200 shrink-0"
        >
          {iter} iter
        </Badge>
      )}
      {approved === false && (
        <Badge className="text-[10px] bg-red-600 dark:bg-red-700 text-white shrink-0">Eskalerad</Badge>
      )}
      {approved === true && iter > 1 && (
        <Badge className="text-[10px] bg-emerald-600 dark:bg-emerald-700 text-white shrink-0">
          Auto-fixad
        </Badge>
      )}
    </>
  );
}

export default function MenuExtractionDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [data, setData] = useState<DocumentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [extractTextLoading, setExtractTextLoading] = useState(false);
  const [expandedRaw, setExpandedRaw] = useState<Set<string>>(new Set());
  const [rowFilter, setRowFilter] = useState<"all" | "needs_review">("all");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    producer: string;
    wine_name: string;
    vintage: string;
    region: string;
    country: string;
    price_glass: string;
    price_bottle: string;
    price_other: string;
    needs_review: boolean;
    notes: string;
  } | null>(null);
  const [originalSnapshot, setOriginalSnapshot] = useState<Record<string, unknown> | null>(null);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [savedRowId, setSavedRowId] = useState<string | null>(null);
  const [bulkSectionId, setBulkSectionId] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);
  const [traceOpen, setTraceOpen] = useState(false);
  const [entityTasksData, setEntityTasksData] = useState<{
    tasks: Task[];
    projects: ProjectMin[];
    objectives: ObjectiveMin[];
    admins: AdminUserMin[];
  } | null>(null);

  const loadEntityTasks = useCallback(async (documentId: string) => {
    try {
      const res = await fetch(
        `/api/admin/operations/entity-tasks?entity_type=menu_document&entity_id=${encodeURIComponent(documentId)}`
      );
      if (!res.ok) return;
      const json = await res.json();
      setEntityTasksData({
        tasks: json.tasks ?? [],
        projects: json.projects ?? [],
        objectives: json.objectives ?? [],
        admins: json.admins ?? [],
      });
    } catch {
      setEntityTasksData(null);
    }
  }, []);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/menu-extraction/documents/${id}`);
      if (res.status === 404) {
        setData(null);
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Kunde inte ladda");
      }
      const json = await res.json();
      setData(json);
      if (json?.document?.id) {
        loadEntityTasks(json.document.id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Något gick fel");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const patchRow = useCallback(
    async (
      rowId: string,
      documentId: string,
      updates: Record<string, unknown>,
      original: Record<string, unknown>,
      notes?: string
    ) => {
      const res = await fetch(`/api/admin/menu-extraction/rows/${rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: documentId,
          updates,
          original,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sparning misslyckades");
      return json.row as MenuExtractedRow;
    },
    []
  );

  const mergeRowInState = useCallback((updated: MenuExtractedRow) => {
    setData((prev) => {
      if (!prev) return prev;
      const rows = prev.rows.map((r) => (r.id === updated.id ? { ...r, ...updated } : r));
      const needs_review_count = rows.filter((r) => r.needs_review).length;
      const reviewed_count = rows.filter((r) => !r.needs_review).length;
      return {
        ...prev,
        rows,
        stats: {
          ...prev.stats,
          needs_review_count,
          reviewed_count,
        },
      };
    });
  }, []);

  const openEdit = (row: MenuExtractedRow) => {
    setEditingRowId(row.id);
    setOriginalSnapshot(rowToSnapshot(row));
    setEditForm({
      producer: row.producer ?? "",
      wine_name: row.wine_name ?? "",
      vintage: row.vintage ?? "",
      region: row.region ?? "",
      country: row.country ?? "",
      price_glass: row.price_glass != null ? String(row.price_glass) : "",
      price_bottle: row.price_bottle != null ? String(row.price_bottle) : "",
      price_other: row.price_other != null ? String(row.price_other) : "",
      needs_review: row.needs_review,
      notes: "",
    });
  };

  const cancelEdit = () => {
    setEditingRowId(null);
    setEditForm(null);
    setOriginalSnapshot(null);
  };

  const saveEdit = async (rowId: string) => {
    if (!data || !editForm || !originalSnapshot) return;
    setSavingRowId(rowId);
    try {
      const updates: Record<string, unknown> = {
        producer: editForm.producer || null,
        wine_name: editForm.wine_name || null,
        vintage: editForm.vintage || null,
        region: editForm.region || null,
        country: editForm.country || null,
        price_glass: editForm.price_glass === "" ? null : Number(editForm.price_glass),
        price_bottle: editForm.price_bottle === "" ? null : Number(editForm.price_bottle),
        price_other: editForm.price_other === "" ? null : Number(editForm.price_other),
        needs_review: editForm.needs_review,
      };
      if (!editForm.needs_review) updates.review_reasons = null;
      const updated = await patchRow(rowId, data.document.id, updates, originalSnapshot, editForm.notes.trim() || undefined);
      mergeRowInState(updated);
      cancelEdit();
      setSavedRowId(rowId);
      setTimeout(() => setSavedRowId(null), 2000);
      toast.success("Sparat");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte spara");
    } finally {
      setSavingRowId(null);
    }
  };

  const markSectionReviewed = async (sectionRows: MenuExtractedRow[], sectionKey: string) => {
    if (!data) return;
    const toMark = sectionRows.filter((r) => r.needs_review);
    if (toMark.length === 0) return;
    setBulkSectionId(sectionKey);
    let done = 0;
    for (const row of toMark) {
      setBulkProgress(`Granskar ${done + 1}/${toMark.length} rader…`);
      try {
        const orig = rowToSnapshot(row);
        const updated = await patchRow(row.id, data.document.id, { needs_review: false }, orig);
        mergeRowInState(updated);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Fel vid bulk-granskning");
        break;
      }
      done++;
    }
    setBulkSectionId(null);
    setBulkProgress(null);
    toast.success(`Markerade ${done} rader som granskade`);
  };

  const handleExtract = async () => {
    if (!id) return;
    setExtracting(true);
    try {
      const res = await fetch(`/api/admin/menu-extraction/documents/${id}/extract`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Extraction misslyckades");
      toast.success("Extraction klar");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Extraction misslyckades");
    } finally {
      setExtracting(false);
    }
  };

  const handleExtractText = async () => {
    if (!id) return;
    setExtractTextLoading(true);
    try {
      const res = await fetch(`/api/admin/menu-extraction/documents/${id}/extract-text`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Kunde inte extrahera text");
      toast.success(`Text extraherad (${json.raw_text_length ?? 0} tecken)`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte extrahera text");
    } finally {
      setExtractTextLoading(false);
    }
  };

  const statusBadge = (status: ExtractionStatus) => {
    const v = {
      pending: { label: "Väntar", className: "bg-gray-500 text-white" },
      processing: { label: "Kör", className: "bg-amber-500 text-white" },
      completed: { label: "Klar", className: "bg-green-600 text-white" },
      failed: { label: "Misslyckad", className: "bg-red-600 text-white" },
    };
    const { label, className } = v[status] ?? v.pending;
    return (
      <Badge className={`${className} hover:opacity-90`}>
        {label}
      </Badge>
    );
  };

  const confidenceBadge = (label: ConfidenceLabel | null) => {
    if (!label) return <span className="text-gray-500 dark:text-zinc-200">—</span>;
    const v = {
      high: "bg-green-600 text-white dark:bg-green-700",
      medium: "bg-amber-500 text-white",
      low: "bg-red-600 text-white dark:bg-red-700",
    };
    return (
      <Badge className={v[label]} variant="secondary">
        {label}
      </Badge>
    );
  };

  const toggleRaw = (rowId: string) => {
    setExpandedRaw((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const filterRows = (list: MenuExtractedRow[]) =>
    rowFilter === "needs_review" ? list.filter((r) => r.needs_review) : list;

  if (!id) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild className="mb-4 gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F1F23]">
          <Link href="/admin/menu-extraction">
            <ArrowLeft className="w-4 h-4" />
            Tillbaka till Menyextraktion
          </Link>
        </Button>
        <p className="text-gray-500 dark:text-zinc-200">Ogiltigt dokument-id.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild className="mb-4 gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F1F23]">
          <Link href="/admin/menu-extraction">
            <ArrowLeft className="w-4 h-4" />
            Tillbaka till Menyextraktion
          </Link>
        </Button>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-zinc-600 border-t-gray-900 dark:border-t-white" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild className="mb-4 gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F1F23]">
          <Link href="/admin/menu-extraction">
            <ArrowLeft className="w-4 h-4" />
            Tillbaka till Menyextraktion
          </Link>
        </Button>
        <p className="text-gray-500 dark:text-zinc-200">Dokumentet hittades inte.</p>
      </div>
    );
  }

  const { document: doc, sections, rows, stats } = data;
  const rowsBySection = new Map<string, MenuExtractedRow[]>();
  for (const s of sections) {
    rowsBySection.set(s.id, rows.filter((r) => r.section_id === s.id));
  }
  const uncategorizedRows = rows.filter((r) => !r.section_id);
  const reviewedCount = stats.reviewed_count ?? rows.filter((r) => !r.needs_review).length;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" asChild className="mb-4 gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F1F23]">
            <Link href="/admin/menu-extraction">
              <ArrowLeft className="w-4 h-4" />
              Tillbaka till Menyextraktion
            </Link>
          </Button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{doc.file_name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-zinc-200">
                <span className="font-mono truncate max-w-full" title={doc.file_path}>{doc.file_path}</span>
                {doc.source_slug && (
                  <span className="shrink-0">Källa: <span className="font-medium text-gray-700 dark:text-zinc-200">{doc.source_slug}</span></span>
                )}
              </div>
            </div>
            <span className="shrink-0">{statusBadge(doc.extraction_status)}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
            Dokument
          </h2>
          <div className="w-full bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl">
            <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-gray-600 dark:text-zinc-200">Extraktion</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {statusBadge(doc.extraction_status)}
                  {doc.error_message && (
                    <span className="text-xs text-red-600 dark:text-red-400">{doc.error_message}</span>
                  )}
                </div>
              </div>
              <Button
                onClick={handleExtract}
                disabled={extracting}
                className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90"
              >
                {extracting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white dark:border-zinc-900 border-t-transparent" />
                    Kör extraction…
                  </span>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 mr-2" />
                    Kör extraction
                  </>
                )}
              </Button>
            </div>
            {!doc.raw_text?.trim() && (
              <div className="p-4 border-b border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 text-sm space-y-2">
                <p className="font-medium text-amber-900 dark:text-amber-200">Raw text saknas</p>
                <p className="text-amber-800 dark:text-amber-300/90 text-xs">
                  AI-extraktion behöver text från PDF:en. Om PDF:en är skannad eller text inte extraherats, använd knappen nedan.
                </p>
                {doc.file_path?.trim() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExtractText}
                    disabled={extractTextLoading}
                    className="border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white"
                  >
                    {extractTextLoading ? "Extraherar text…" : "Extrahera text från PDF"}
                  </Button>
                )}
              </div>
            )}
            <div className="p-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
              <div>
                <span className="text-gray-500 dark:text-zinc-200">Uppladdad</span>
                <p className="font-medium text-gray-900 dark:text-zinc-100 mt-0.5">
                  {doc.created_at ? new Date(doc.created_at).toLocaleString("sv-SE") : "—"}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-zinc-200">Extraherad (klar)</span>
                <p className="font-medium text-gray-900 dark:text-zinc-100 mt-0.5">
                  {doc.extracted_at ? new Date(doc.extracted_at).toLocaleString("sv-SE") : "—"}
                </p>
              </div>
              <div className="col-span-2 lg:col-span-1">
                <span className="text-gray-500 dark:text-zinc-200" title="Uppdateras vid varje extraktionsförsök, även misslyckat">
                  Senaste extraktionsförsök
                </span>
                <p className="font-medium text-gray-900 dark:text-zinc-100 mt-0.5">
                  {doc.last_extraction_attempt_at
                    ? new Date(doc.last_extraction_attempt_at).toLocaleString("sv-SE")
                    : "—"}
                </p>
              </div>
              <div className="col-span-2 lg:col-span-2">
                <span className="text-gray-500 dark:text-zinc-200">Modell / prompt / workflow</span>
                <p className="font-medium text-gray-900 dark:text-zinc-100 mt-0.5 truncate" title={`${doc.model_version ?? ""} / ${doc.prompt_version ?? ""} / ${doc.workflow_version ?? ""}`}>
                  {doc.model_version ?? "—"} / {doc.prompt_version ?? "—"} / {doc.workflow_version ?? "—"}
                </p>
              </div>
            </div>
            {(doc.extraction_input_tokens != null || doc.extraction_output_tokens != null || doc.extraction_cache_read_input_tokens != null) && (
              <div className="px-4 pb-2 text-xs border-t border-gray-100 dark:border-zinc-800 pt-3">
                <span className="text-gray-500 dark:text-zinc-200">Tokenanvändning (senaste extraction)</span>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-gray-700 dark:text-zinc-200">
                  {doc.extraction_input_tokens != null && <span>Input: {doc.extraction_input_tokens.toLocaleString()}</span>}
                  {doc.extraction_output_tokens != null && <span>Output: {doc.extraction_output_tokens.toLocaleString()}</span>}
                  {doc.extraction_cache_read_input_tokens != null && doc.extraction_cache_read_input_tokens > 0 && (
                    <span className="text-green-700 dark:text-green-400">Cache read: {doc.extraction_cache_read_input_tokens.toLocaleString()}</span>
                  )}
                  {doc.extraction_cache_creation_input_tokens != null && doc.extraction_cache_creation_input_tokens > 0 && (
                    <span className="text-blue-700 dark:text-blue-400">Cache creation: {doc.extraction_cache_creation_input_tokens.toLocaleString()}</span>
                  )}
                </div>
              </div>
            )}
            <div className="px-4 pb-4 flex flex-wrap gap-4 text-xs text-gray-700 dark:text-zinc-200">
              <span><strong className="text-gray-900 dark:text-zinc-100">Totalt rader:</strong> {stats.total_rows}</span>
              <span><strong className="text-gray-900 dark:text-zinc-100">Auto-korrigerade:</strong> {stats.auto_corrected_count ?? 0}</span>
              {doc.extraction_trace?.totalCostUsd != null && (
                <span>
                  <strong className="text-gray-900 dark:text-zinc-100">Kostnad:</strong>{" "}
                  ${Number(doc.extraction_trace.totalCostUsd).toFixed(4)} USD
                </span>
              )}
              {doc.critic_stats != null && typeof doc.critic_stats === "object" && (
                <>
                  <span>
                    <strong className="text-gray-900 dark:text-zinc-100">Godkänd direkt:</strong>{" "}
                    {Number((doc.critic_stats as { approved_direct?: number }).approved_direct) || 0} sektioner
                  </span>
                  <span>
                    <strong className="text-gray-900 dark:text-zinc-100">Förbättrad av Critic:</strong>{" "}
                    {Number((doc.critic_stats as { improved_by_critic?: number }).improved_by_critic) || 0}{" "}
                    sektioner
                  </span>
                  <span>
                    <strong className="text-gray-900 dark:text-zinc-100">Eskalerad:</strong>{" "}
                    {Number((doc.critic_stats as { escalated?: number }).escalated) || 0} sektioner
                  </span>
                </>
              )}
              {doc.extraction_trace?.usedSonnetFallback === true && (
                <span>
                  <strong className="text-gray-900 dark:text-zinc-100">Sonnet-fallback:</strong> Ja
                </span>
              )}
              {doc.used_batch_api === true && (
                <span>
                  <strong className="text-gray-900 dark:text-zinc-100">Batch API:</strong> Ja
                </span>
              )}
              <span><strong className="text-gray-900 dark:text-zinc-100">Kvar för granskning:</strong> {stats.needs_review_count}</span>
              <span><strong className="text-gray-900 dark:text-zinc-100">Granskade:</strong> {reviewedCount}</span>
              <span><strong className="text-gray-900 dark:text-zinc-100">High confidence:</strong> {stats.high_confidence_count}</span>
              <span><strong className="text-gray-900 dark:text-zinc-100">Ambiguous format:</strong> {stats.ambiguous_format_count}</span>
            </div>

            {doc.extraction_trace?.sections && doc.extraction_trace.sections.length > 0 && (
              <div className="px-4 pb-4 border-t border-gray-100 dark:border-zinc-800 pt-3">
                <Collapsible open={traceOpen} onOpenChange={setTraceOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-gray-800 dark:text-zinc-100 hover:opacity-90 w-full text-left">
                    {traceOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    Extraction Trace ({doc.extraction_trace.sections.length} sektioner)
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3 text-xs">
                    {doc.extraction_trace.sections.map((sec, si) => (
                      <div
                        key={`${sec.section}-${si}`}
                        className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50/80 dark:bg-zinc-900/50 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2 justify-between">
                          <span className="font-medium text-gray-900 dark:text-zinc-100">{sec.section}</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {sec.iterations} iter
                            </Badge>
                            {sec.approved ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                <Check className="h-3.5 w-3.5" /> Approved
                              </span>
                            ) : (
                              <span className="text-red-600 dark:text-red-400 flex items-center gap-0.5">
                                <AlertTriangle className="h-3.5 w-3.5" /> Eskalerad
                              </span>
                            )}
                            <span className="text-gray-600 dark:text-zinc-300">
                              ${sec.totalCostUsd.toFixed(4)}
                            </span>
                          </div>
                        </div>
                        {sec.steps && sec.steps.length > 0 && (
                          <ul className="mt-2 space-y-1.5 text-gray-700 dark:text-zinc-300 border-t border-gray-200 dark:border-zinc-700 pt-2">
                            {sec.steps.map((st, sti) => (
                              <li key={sti} className="pl-2 border-l-2 border-gray-300 dark:border-zinc-600">
                                <span className="font-medium text-gray-800 dark:text-zinc-200">
                                  iter {st.iteration} · {st.role}
                                </span>
                                {st.model && ` · ${st.model}`}
                                {st.skipped && (
                                  <span className="text-amber-700 dark:text-amber-300">
                                    {" "}
                                    (skipped{st.skipReason ? `: ${st.skipReason}` : ""})
                                  </span>
                                )}
                                {st.usage && (
                                  <span className="ml-1 text-gray-600 dark:text-zinc-400">
                                    in {st.usage.inputTokens ?? 0} / out {st.usage.outputTokens ?? 0}
                                  </span>
                                )}
                                {st.costUsd != null && st.costUsd > 0 && (
                                  <span className="ml-1">${st.costUsd.toFixed(4)}</span>
                                )}
                                {st.role === "critic" && st.issues && st.issues.length > 0 && (
                                  <ul className="mt-1 list-disc list-inside text-[11px] text-gray-600 dark:text-zinc-400">
                                    {st.issues.slice(0, 5).map((iss, ii) => (
                                      <li key={ii}>
                                        Rad {iss.rowIndex} {iss.field}: {iss.problem}
                                      </li>
                                    ))}
                                    {st.issues.length > 5 && (
                                      <li>… +{st.issues.length - 5} till</li>
                                    )}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </div>
        </div>

        {entityTasksData && (
          <RelatedTasksCard
            entity_type="menu_document"
            entity_id={id}
            entity_label={doc.file_name ?? "Menu Document"}
            tasks={entityTasksData.tasks}
            projects={entityTasksData.projects}
            objectives={entityTasksData.objectives}
            admins={entityTasksData.admins}
          />
        )}

        <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
            Extraherade rader
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-200 mb-3">
            Grupperat per sektion. Rader som behöver granskning har gul bakgrund. Använd Granska/Redigera för att korrigera.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              type="button"
              size="sm"
              variant={rowFilter === "all" ? "default" : "outline"}
              className={rowFilter === "all" ? "bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900" : ""}
              onClick={() => setRowFilter("all")}
            >
              Alla rader
            </Button>
            <Button
              type="button"
              size="sm"
              variant={rowFilter === "needs_review" ? "default" : "outline"}
              className={rowFilter === "needs_review" ? "bg-amber-600 text-white" : ""}
              onClick={() => setRowFilter("needs_review")}
            >
              Behöver granskning
            </Button>
          </div>
          <div className="w-full bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl p-4 space-y-6">
            {sections.length === 0 && uncategorizedRows.length === 0 ? (
              <p className="text-sm text-center text-gray-500 dark:text-zinc-200 py-8">
                Inga rader ännu. Kör extraction ovan.
              </p>
            ) : (
              <>
                {sections.map((sec) => {
                  const sectionRows = rowsBySection.get(sec.id) ?? [];
                  const visible = filterRows(sectionRows);
                  if (sectionRows.length === 0) return null;
                  if (rowFilter === "needs_review" && visible.length === 0) return null;
                  const displayRows = rowFilter === "needs_review" ? visible : sectionRows;
                  return (
                    <div key={sec.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                          {sec.section_name}
                          {sec.normalized_section && (
                            <span className="text-gray-500 dark:text-zinc-200 font-normal ml-2">({sec.normalized_section})</span>
                          )}
                        </h3>
                        {sectionRows.some((r) => r.needs_review) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={bulkSectionId === sec.id}
                            onClick={() => markSectionReviewed(sectionRows, sec.id)}
                            className="text-xs"
                          >
                            {bulkSectionId === sec.id ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                {bulkProgress ?? "…"}
                              </span>
                            ) : (
                              "Markera alla som granskade"
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 min-w-0 overflow-x-clip">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 hover:bg-transparent">
                              <TableHead className="w-8 text-xs text-gray-500 dark:text-zinc-200">#</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Åtgärd</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Råtext</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Producent</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Vinnamn</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Årgång</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Land</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Region</TableHead>
                              <TableHead className="text-right text-xs text-gray-500 dark:text-zinc-200">Glas</TableHead>
                              <TableHead className="text-right text-xs text-gray-500 dark:text-zinc-200">Flaska</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Confidence</TableHead>
                              <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Review</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {displayRows.map((row) => (
                              <Fragment key={row.id}>
                                <TableRow
                                  className={
                                    row.needs_review
                                      ? "bg-amber-50/90 dark:bg-amber-900/25 hover:bg-amber-100/90 dark:hover:bg-amber-900/35 border-gray-100 dark:border-zinc-800"
                                      : "border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/30"
                                  }
                                >
                                  <TableCell className="text-gray-600 dark:text-zinc-200 text-sm align-top">{row.row_index + 1}</TableCell>
                                  <TableCell className="align-top whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                      {row.needs_review && (
                                        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(row)}>
                                          <Eye className="h-3 w-3 mr-1" />
                                          Granska
                                        </Button>
                                      )}
                                      <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(row)}>
                                        <Pencil className="h-3 w-3 mr-1" />
                                        Redigera
                                      </Button>
                                      {savedRowId === row.id && (
                                        <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-0.5">
                                          <Check className="h-3 w-3" /> Sparat
                                        </span>
                                      )}
                                      {row.auto_corrected && (
                                        <Badge className="text-[10px] bg-green-600 dark:bg-green-700 text-white shrink-0">Auto-korrigerad</Badge>
                                      )}
                                      <CriticActorBadges row={row} />
                                    </div>
                                  </TableCell>
                                  <TableCell className="max-w-[180px] align-top">
                                    <RawTextCell
                                      rawText={row.raw_text}
                                      rowId={row.id}
                                      expanded={expandedRaw.has(row.id)}
                                      onToggle={() => toggleRaw(row.id)}
                                    />
                                  </TableCell>
                                  <TableCell className="text-sm align-top text-gray-900 dark:text-zinc-100">{editingRowId === row.id ? "—" : row.producer ?? "—"}</TableCell>
                                  <TableCell className="text-sm align-top text-gray-900 dark:text-zinc-100">{editingRowId === row.id ? "—" : row.wine_name ?? "—"}</TableCell>
                                  <TableCell className="text-sm align-top text-gray-900 dark:text-zinc-100">{editingRowId === row.id ? "—" : row.vintage ?? "—"}</TableCell>
                                  <TableCell className="text-sm align-top text-gray-900 dark:text-zinc-100">{editingRowId === row.id ? "—" : row.country ?? "—"}</TableCell>
                                  <TableCell className="text-sm align-top text-gray-900 dark:text-zinc-100">{editingRowId === row.id ? "—" : row.region ?? "—"}</TableCell>
                                  <TableCell className="text-right text-sm align-top text-gray-900 dark:text-zinc-100">{editingRowId === row.id ? "—" : row.price_glass != null ? row.price_glass : "—"}</TableCell>
                                  <TableCell className="text-right text-sm align-top text-gray-900 dark:text-zinc-100">{editingRowId === row.id ? "—" : row.price_bottle != null ? row.price_bottle : "—"}</TableCell>
                                  <TableCell className="align-top text-gray-900 dark:text-zinc-100">{confidenceBadge(row.confidence_label)}</TableCell>
                                  <TableCell className="align-top text-gray-900 dark:text-zinc-100"><ReviewCell needsReview={row.needs_review} reviewReasons={row.review_reasons} /></TableCell>
                                </TableRow>
                                {editingRowId === row.id && editForm && (
                                  <TableRow key={`${row.id}-edit`} className="bg-gray-50 dark:bg-zinc-900/50">
                                    <TableCell colSpan={12} className="p-4">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                        <label className="space-y-1">
                                          <span className="text-xs text-gray-500 dark:text-zinc-200">Producent</span>
                                          <Input value={editForm.producer} onChange={(e) => setEditForm((f) => f && { ...f, producer: e.target.value })} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" />
                                        </label>
                                        <label className="space-y-1">
                                          <span className="text-xs text-gray-500 dark:text-zinc-200">Vinnamn</span>
                                          <Input value={editForm.wine_name} onChange={(e) => setEditForm((f) => f && { ...f, wine_name: e.target.value })} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" />
                                        </label>
                                        <label className="space-y-1">
                                          <span className="text-xs text-gray-500 dark:text-zinc-200">Årgång</span>
                                          <Input value={editForm.vintage} onChange={(e) => setEditForm((f) => f && { ...f, vintage: e.target.value })} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" />
                                        </label>
                                        <label className="space-y-1">
                                          <span className="text-xs text-gray-500 dark:text-zinc-200">Region</span>
                                          <Input value={editForm.region} onChange={(e) => setEditForm((f) => f && { ...f, region: e.target.value })} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" />
                                        </label>
                                        <label className="space-y-1">
                                          <span className="text-xs text-gray-500 dark:text-zinc-200">Land</span>
                                          <Input value={editForm.country} onChange={(e) => setEditForm((f) => f && { ...f, country: e.target.value })} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" />
                                        </label>
                                        <label className="space-y-1">
                                          <span className="text-xs text-gray-500 dark:text-zinc-200">Glas</span>
                                          <Input type="number" value={editForm.price_glass} onChange={(e) => setEditForm((f) => f && { ...f, price_glass: e.target.value })} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" />
                                        </label>
                                        <label className="space-y-1">
                                          <span className="text-xs text-gray-500 dark:text-zinc-200">Flaska</span>
                                          <Input type="number" value={editForm.price_bottle} onChange={(e) => setEditForm((f) => f && { ...f, price_bottle: e.target.value })} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" />
                                        </label>
                                        <label className="space-y-1">
                                          <span className="text-xs text-gray-500 dark:text-zinc-200">Övrigt pris</span>
                                          <Input type="number" value={editForm.price_other} onChange={(e) => setEditForm((f) => f && { ...f, price_other: e.target.value })} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" />
                                        </label>
                                        <label className="flex items-center gap-2 sm:col-span-2">
                                          <Checkbox
                                            checked={!editForm.needs_review}
                                            onCheckedChange={(c) => setEditForm((f) => f && { ...f, needs_review: c !== true })}
                                          />
                                          <span className="text-xs text-gray-700 dark:text-zinc-200">Markerad som granskad (behöver inte review)</span>
                                        </label>
                                        <label className="space-y-1 sm:col-span-3">
                                          <span className="text-xs text-gray-500 dark:text-zinc-200">Anteckning (valfritt)</span>
                                          <Textarea value={editForm.notes} onChange={(e) => setEditForm((f) => f && { ...f, notes: e.target.value })} rows={2} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" />
                                        </label>
                                      </div>
                                      <div className="flex gap-2 mt-4">
                                        <Button
                                          type="button"
                                          size="sm"
                                          disabled={savingRowId === row.id}
                                          onClick={() => saveEdit(row.id)}
                                          className="bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
                                        >
                                          {savingRowId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Spara"}
                                        </Button>
                                        <Button type="button" size="sm" variant="outline" onClick={cancelEdit} disabled={savingRowId === row.id}>
                                          Avbryt
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </Fragment>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
                {uncategorizedRows.length > 0 && (rowFilter === "all" || filterRows(uncategorizedRows).length > 0) && (
                  <div>
                    <div className="flex flex-wrap justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Övriga rader</h3>
                      {uncategorizedRows.some((r) => r.needs_review) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={bulkSectionId === "uncategorized"}
                          onClick={() => markSectionReviewed(uncategorizedRows, "uncategorized")}
                          className="text-xs"
                        >
                          {bulkSectionId === "uncategorized" ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {bulkProgress ?? "…"}
                            </span>
                          ) : (
                            "Markera alla som granskade"
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 min-w-0 overflow-x-clip">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 hover:bg-transparent">
                            <TableHead className="w-8 text-xs text-gray-500 dark:text-zinc-200">#</TableHead>
                            <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Åtgärd</TableHead>
                            <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Råtext</TableHead>
                            <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Producent</TableHead>
                            <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Vinnamn</TableHead>
                            <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Årgång</TableHead>
                            <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Land</TableHead>
                            <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Region</TableHead>
                            <TableHead className="text-right text-xs text-gray-500 dark:text-zinc-200">Glas</TableHead>
                            <TableHead className="text-right text-xs text-gray-500 dark:text-zinc-200">Flaska</TableHead>
                            <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Confidence</TableHead>
                            <TableHead className="text-xs text-gray-500 dark:text-zinc-200">Review</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterRows(uncategorizedRows).map((row) => (
                            <Fragment key={row.id}>
                              <TableRow
                                className={
                                  row.needs_review
                                    ? "bg-amber-50/90 dark:bg-amber-900/25 border-gray-100 dark:border-zinc-800"
                                    : "border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/30"
                                }
                              >
                                <TableCell className="text-sm align-top">{row.row_index + 1}</TableCell>
                                <TableCell className="align-top">
                                  <div className="flex flex-col gap-1">
                                    {row.needs_review && (
                                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(row)}>
                                        <Eye className="h-3 w-3 mr-1" />
                                        Granska
                                      </Button>
                                    )}
                                    <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(row)}>
                                      <Pencil className="h-3 w-3 mr-1" />
                                      Redigera
                                    </Button>
                                    {savedRowId === row.id && (
                                      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-0.5"><Check className="h-3 w-3" /> Sparat</span>
                                    )}
                                    {row.auto_corrected && (
                                      <Badge className="text-[10px] bg-green-600 dark:bg-green-700 text-white shrink-0">Auto-korrigerad</Badge>
                                    )}
                                    <CriticActorBadges row={row} />
                                  </div>
                                </TableCell>
                                <TableCell className="max-w-[180px] align-top">
                                  <RawTextCell rawText={row.raw_text} rowId={row.id} expanded={expandedRaw.has(row.id)} onToggle={() => toggleRaw(row.id)} />
                                </TableCell>
                                <TableCell className="text-sm text-gray-900 dark:text-zinc-100">{editingRowId === row.id ? "—" : row.producer ?? "—"}</TableCell>
                                <TableCell className="text-sm text-gray-900 dark:text-zinc-100">{editingRowId === row.id ? "—" : row.wine_name ?? "—"}</TableCell>
                                <TableCell className="text-sm text-gray-900 dark:text-zinc-100">{editingRowId === row.id ? "—" : row.vintage ?? "—"}</TableCell>
                                <TableCell className="text-sm text-gray-900 dark:text-zinc-100">{editingRowId === row.id ? "—" : row.country ?? "—"}</TableCell>
                                <TableCell className="text-sm text-gray-900 dark:text-zinc-100">{editingRowId === row.id ? "—" : row.region ?? "—"}</TableCell>
                                <TableCell className="text-right text-sm text-gray-900 dark:text-zinc-100">{editingRowId === row.id ? "—" : row.price_glass ?? "—"}</TableCell>
                                <TableCell className="text-right text-sm text-gray-900 dark:text-zinc-100">{editingRowId === row.id ? "—" : row.price_bottle ?? "—"}</TableCell>
                                <TableCell className="text-gray-900 dark:text-zinc-100">{confidenceBadge(row.confidence_label)}</TableCell>
                                <TableCell className="text-gray-900 dark:text-zinc-100"><ReviewCell needsReview={row.needs_review} reviewReasons={row.review_reasons} /></TableCell>
                              </TableRow>
                              {editingRowId === row.id && editForm && (
                                <TableRow key={`${row.id}-edit-uncat`} className="bg-gray-50 dark:bg-zinc-900/50">
                                  <TableCell colSpan={12} className="p-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                      <label className="space-y-1"><span className="text-xs text-gray-500 dark:text-zinc-200">Producent</span>
                                        <Input value={editForm.producer} onChange={(e) => setEditForm((f) => f && { ...f, producer: e.target.value })} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" /></label>
                                      <label className="space-y-1"><span className="text-xs text-gray-500 dark:text-zinc-200">Vinnamn</span>
                                        <Input value={editForm.wine_name} onChange={(e) => setEditForm((f) => f && { ...f, wine_name: e.target.value })} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" /></label>
                                      <label className="space-y-1"><span className="text-xs text-gray-500 dark:text-zinc-200">Årgång</span>
                                        <Input value={editForm.vintage} onChange={(e) => setEditForm((f) => f && { ...f, vintage: e.target.value })} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" /></label>
                                      <label className="space-y-1"><span className="text-xs text-gray-500 dark:text-zinc-200">Region</span>
                                        <Input value={editForm.region} onChange={(e) => setEditForm((f) => f && { ...f, region: e.target.value })} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" /></label>
                                      <label className="space-y-1"><span className="text-xs text-gray-500 dark:text-zinc-200">Land</span>
                                        <Input value={editForm.country} onChange={(e) => setEditForm((f) => f && { ...f, country: e.target.value })} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" /></label>
                                      <label className="space-y-1"><span className="text-xs text-gray-500 dark:text-zinc-200">Glas</span>
                                        <Input type="number" value={editForm.price_glass} onChange={(e) => setEditForm((f) => f && { ...f, price_glass: e.target.value })} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" /></label>
                                      <label className="space-y-1"><span className="text-xs text-gray-500 dark:text-zinc-200">Flaska</span>
                                        <Input type="number" value={editForm.price_bottle} onChange={(e) => setEditForm((f) => f && { ...f, price_bottle: e.target.value })} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" /></label>
                                      <label className="space-y-1"><span className="text-xs text-gray-500 dark:text-zinc-200">Övrigt pris</span>
                                        <Input type="number" value={editForm.price_other} onChange={(e) => setEditForm((f) => f && { ...f, price_other: e.target.value })} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" /></label>
                                      <label className="flex items-center gap-2 sm:col-span-2">
                                        <Checkbox checked={!editForm.needs_review} onCheckedChange={(c) => setEditForm((f) => f && { ...f, needs_review: c !== true })} />
                                        <span className="text-xs text-gray-700 dark:text-zinc-200">Markerad som granskad</span>
                                      </label>
                                      <label className="space-y-1 sm:col-span-3"><span className="text-xs text-gray-500 dark:text-zinc-200">Anteckning</span>
                                        <Textarea value={editForm.notes} onChange={(e) => setEditForm((f) => f && { ...f, notes: e.target.value })} rows={2} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-400" /></label>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                      <Button type="button" size="sm" disabled={savingRowId === row.id} onClick={() => saveEdit(row.id)} className="bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900">
                                        {savingRowId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Spara"}
                                      </Button>
                                      <Button type="button" size="sm" variant="outline" onClick={cancelEdit} disabled={savingRowId === row.id}>Avbryt</Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function RawTextCell({
  rawText,
  rowId,
  expanded,
  onToggle,
}: {
  rawText: string;
  rowId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isLong = rawText.length > RAW_TEXT_TRUNCATE;
  const display = isLong && !expanded
    ? `${rawText.slice(0, RAW_TEXT_TRUNCATE)}…`
    : rawText;
  return (
    <div className="text-sm text-gray-900 dark:text-zinc-100">
      {isLong ? (
        <Collapsible open={expanded} onOpenChange={() => onToggle()}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="text-left hover:underline flex items-center gap-1 text-blue-600 dark:text-blue-400"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              {display}
            </button>
          </CollapsibleTrigger>
          {/* When open, avoid overflow-hidden on Radix content (steals vertical wheel from main scroll). */}
          <CollapsibleContent className="data-[state=open]:!overflow-visible">
            <div className="pt-1 text-gray-600 dark:text-zinc-200 break-words">
              {rawText}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <span className="break-words">{display}</span>
      )}
    </div>
  );
}

function ReviewCell({
  needsReview,
  reviewReasons,
}: {
  needsReview: boolean;
  reviewReasons: string[] | null;
}) {
  const reasons = reviewReasons ?? [];
  const hasGrapesInferred = reasons.includes("grapes_inferred");
  const content = (
    <div className="flex items-center gap-1">
      {needsReview && (
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
      )}
      {reasons.length > 0 ? (
        <span className="text-xs text-gray-700 dark:text-zinc-200">
          {hasGrapesInferred && (
            <span className="text-amber-700 dark:text-amber-300 font-medium" title="Druvor som AI gissat – inte fakta">
              grapes_inferred
              {reasons.length > 1 ? "; " : ""}
            </span>
          )}
          {reasons.filter((r) => r !== "grapes_inferred").join(", ")}
        </span>
      ) : (
        <span className="text-gray-500 dark:text-zinc-200">—</span>
      )}
    </div>
  );
  if (reasons.length > 2) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help truncate max-w-[140px]">{content}</div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs bg-white dark:bg-[#1F1F23] border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100">
          <p className="font-medium mb-1">Review reasons:</p>
          <ul className="list-disc list-inside text-xs">
            {reasons.map((r) => (
              <li key={r}>
                {r === "grapes_inferred"
                  ? "grapes_inferred (druvor som AI gissat – inte fakta)"
                  : r}
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    );
  }
  return content;
}
