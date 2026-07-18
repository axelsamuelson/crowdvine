"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import { Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FunnelBar } from "./funnel-bar";
import { FunnelStepBadgeEl } from "./funnel-step-badge";

type UserRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  first_login_at: string | null;
  last_seen_at: string | null;
  product_views: number;
  add_to_carts: number;
  reservations: number;
  furthest_step: string;
};

type Summary = {
  total_users: number;
  active_7d: number;
  active_28d: number;
  users_with_add_to_cart: number;
  users_with_reservation: number;
};

type Funnel = {
  total_users: number;
  first_login: number;
  first_product_view: number;
  first_add_to_cart: number;
  reservation_completed: number;
};

type SessionGroup = {
  session_id: string;
  last_seen_at: string | null;
  events: {
    event_type: string;
    event_metadata: unknown;
    page_url: string | null;
    created_at: string;
  }[];
};

type SortKey =
  | "email"
  | "full_name"
  | "first_login_at"
  | "last_seen_at"
  | "product_views"
  | "add_to_carts"
  | "reservations";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function eventContext(meta: unknown, pageUrl: string | null): string {
  const m =
    meta && typeof meta === "object" ? (meta as Record<string, unknown>) : {};
  if (typeof m.productName === "string") return m.productName;
  if (typeof m.path === "string") return m.path;
  if (typeof m.phase === "string") return `fas: ${m.phase}`;
  if (pageUrl) {
    try {
      return new URL(pageUrl).pathname;
    } catch {
      return pageUrl;
    }
  }
  return "";
}

export function UsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("last_seen_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionGroup[] | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/analytics/users");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Kunde inte ladda användare");
        if (!cancelled) {
          setUsers(json.users ?? []);
          setFunnel(json.funnel ?? null);
          setSummary(json.summary ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Kunde inte ladda");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "email" || key === "full_name" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = users;
    if (q) {
      list = list.filter((u) => (u.email || "").toLowerCase().includes(q));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv), "sv") * dir;
    });
  }, [users, search, sortKey, sortDir]);

  const openUser = async (userId: string) => {
    if (expandedId === userId) {
      setExpandedId(null);
      setSessions(null);
      return;
    }
    setExpandedId(userId);
    setSessions(null);
    setLoadingDetail(true);
    try {
      const res = await fetch(
        `/api/admin/analytics/users?userId=${encodeURIComponent(userId)}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Kunde inte ladda detaljer");
      setSessions(json.sessions ?? []);
    } catch (e) {
      console.error(e);
      setSessions([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-gray-500 dark:text-zinc-400">
        Laddar användare…
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  const funnelSteps = funnel
    ? [
        { key: "users", label: "Användare", value: funnel.total_users },
        { key: "login", label: "Första inloggning", value: funnel.first_login },
        {
          key: "product",
          label: "Produktvy",
          value: funnel.first_product_view,
        },
        {
          key: "cart",
          label: "Varukorg",
          value: funnel.first_add_to_cart,
        },
        {
          key: "res",
          label: "Reservation",
          value: funnel.reservation_completed,
        },
      ]
    : [];

  const summaryCards = summary
    ? [
        { label: "Totalt användare", value: summary.total_users },
        { label: "Aktiva 7 dagar", value: summary.active_7d },
        { label: "Aktiva 28 dagar", value: summary.active_28d },
        { label: "Med varukorg", value: summary.users_with_add_to_cart },
        { label: "Med reservation", value: summary.users_with_reservation },
      ]
    : [];

  const SortHead = ({
    label,
    col,
    className,
  }: {
    label: string;
    col: SortKey;
    className?: string;
  }) => (
    <th className={className}>
      <button
        type="button"
        onClick={() => toggleSort(col)}
        className="inline-flex items-center gap-1 font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
      >
        {label}
        <ArrowUpDown className="size-3 opacity-50" aria-hidden />
      </button>
    </th>
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Användare
        </h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
          Inloggade användare och deras funnel — exkluderar interna profiler.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
          <FunnelBar
            title="Inloggade användare (alla tider)"
            subtitle="user_journey_funnel · exkl. admin_metrics_excluded_profiles"
            steps={funnelSteps}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-1 gap-3">
          {summaryCards.map((c) => (
            <div
              key={c.label}
              className="rounded-xl border border-gray-200 dark:border-[#1F1F23] px-4 py-3"
            >
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                {c.label}
              </p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white tabular-nums mt-0.5">
                {c.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Användartabell
          </h3>
          <div className="relative max-w-sm w-full">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sök på e-post…"
              className="pl-8 h-9"
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-800">
                <SortHead label="E-post" col="email" className="px-3 py-2.5" />
                <SortHead label="Namn" col="full_name" className="px-3 py-2.5" />
                <SortHead
                  label="Första inloggning"
                  col="first_login_at"
                  className="px-3 py-2.5"
                />
                <SortHead
                  label="Senast sedd"
                  col="last_seen_at"
                  className="px-3 py-2.5"
                />
                <SortHead
                  label="Produktvyer"
                  col="product_views"
                  className="px-3 py-2.5 text-right"
                />
                <SortHead
                  label="Varukorg"
                  col="add_to_carts"
                  className="px-3 py-2.5 text-right"
                />
                <SortHead
                  label="Reservationer"
                  col="reservations"
                  className="px-3 py-2.5 text-right"
                />
                <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-zinc-400">
                  Steg
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-gray-500 dark:text-zinc-400"
                  >
                    Inga användare matchar sökningen.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const open = expandedId === u.user_id;
                  return (
                    <Fragment key={u.user_id}>
                      <tr
                        onClick={() => void openUser(u.user_id)}
                        className="border-b border-gray-50 dark:border-zinc-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900/40"
                      >
                        <td className="px-3 py-2.5">
                          {u.email ? (
                            <a
                              href={`mailto:${u.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-900 dark:text-white underline-offset-2 hover:underline"
                            >
                              {u.email}
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-gray-700 dark:text-zinc-300">
                          {u.full_name || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 dark:text-zinc-400 whitespace-nowrap">
                          {formatDate(u.first_login_at)}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 dark:text-zinc-400 whitespace-nowrap">
                          {formatDate(u.last_seen_at)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {u.product_views}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {u.add_to_carts}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {u.reservations}
                        </td>
                        <td className="px-3 py-2.5">
                          <FunnelStepBadgeEl step={u.furthest_step} />
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td
                            colSpan={8}
                            className="bg-gray-50/80 dark:bg-zinc-900/30 px-4 py-4"
                          >
                            {loadingDetail ? (
                              <p className="text-sm text-gray-500">
                                Laddar resa…
                              </p>
                            ) : !sessions?.length ? (
                              <p className="text-sm text-gray-500">
                                Inga events för denna användare.
                              </p>
                            ) : (
                              <div className="space-y-4 max-h-96 overflow-y-auto">
                                {sessions.map((sess) => (
                                  <div key={sess.session_id}>
                                    <p className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-2 font-mono">
                                      Session {sess.session_id.slice(0, 28)}
                                      {sess.session_id.length > 28 ? "…" : ""}
                                    </p>
                                    <ol className="space-y-1.5 border-l border-gray-200 dark:border-zinc-700 pl-3">
                                      {sess.events.map((ev, i) => (
                                        <li
                                          key={`${ev.created_at}-${i}`}
                                          className="text-xs text-gray-700 dark:text-zinc-300"
                                        >
                                          <span className="text-gray-400 dark:text-zinc-500 mr-2">
                                            {new Date(
                                              ev.created_at,
                                            ).toLocaleString("sv-SE")}
                                          </span>
                                          <span className="font-mono">
                                            {ev.event_type}
                                          </span>
                                          {eventContext(
                                            ev.event_metadata,
                                            ev.page_url,
                                          ) ? (
                                            <span className="text-gray-500 dark:text-zinc-400 ml-2">
                                              ·{" "}
                                              {eventContext(
                                                ev.event_metadata,
                                                ev.page_url,
                                              )}
                                            </span>
                                          ) : null}
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 dark:text-zinc-500">
          {filtered.length} användare
          {search ? ` matchar “${search}”` : ""} · klicka på en rad för
          eventresa
        </p>
      </div>
    </div>
  );
}
