"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import {
  BookOpen,
  CreditCard,
  Download,
  Share2,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import {
  getAnalyticsDashboard,
  type AnalyticsDashboardResponse,
  type AnalyticsQueryFilters,
} from "@/app/lib/analytics-service";
import { downloadCsv } from "@/app/lib/csvExport";
import { firestore } from "@/app/lib/firebase";
import type {
  FilterGranularity,
  OperatorFilterState,
} from "@/app/(operator)/operator/analytics/filter";

const Filters = dynamic(() => import("@/app/(operator)/operator/analytics/filter"), { ssr: false });
const ChartLineLinear = dynamic(() => import("@/app/(operator)/operator/analytics/linechart"), { ssr: false });
const ChartBarDefault = dynamic(() => import("@/app/(operator)/operator/analytics/barchart"), { ssr: false });
const ChartBarCodesDistribution = dynamic(() => import("@/app/(operator)/operator/analytics/barcharty"), { ssr: false });
const ChartPieSimple = dynamic(() => import("@/app/(operator)/operator/analytics/piechart"), { ssr: false });
const ChartPieCodes = dynamic(() => import("@/app/(operator)/operator/analytics/piechart2"), { ssr: false });
const PaymentMethod = dynamic(() => import("@/app/(operator)/operator/analytics/payment"), { ssr: false });

function formatPeso(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type UserRecord = {
  role?: string;
  operatorId?: string;
  operatorID?: string;
  operatorCode?: string;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function resolveOperatorUid(
  currentUid: string,
  userData: UserRecord,
  options: AnalyticsDashboardResponse["filters"]["options"]["operators"]
) {
  const candidates = [
    currentUid,
    normalizeText(userData.operatorId),
    normalizeText(userData.operatorID),
    normalizeText(userData.operatorCode),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const byUid = options.find((operator) => operator.uid === candidate);
    if (byUid) return byUid.uid;

    const byCode = options.find((operator) => (operator.operatorCode || "").toLowerCase() === candidate.toLowerCase());
    if (byCode) return byCode.uid;
  }

  return currentUid;
}

/**
 * Map the local `OperatorFilterState` to the backend `AnalyticsQueryFilters` shape.
 * Empty/undefined fields are dropped so the request stays compact.
 * `promoUsage` and `paymentMethods` are NOT in `AnalyticsQueryFilters` — they are applied
 * client-side to the response (see Analytics component below).
 */
function toQuery(s: OperatorFilterState): AnalyticsQueryFilters {
  const out: AnalyticsQueryFilters = {};
  if (s.startDate) out.startDate = s.startDate;
  if (s.endDate) out.endDate = s.endDate;
  if (typeof s.minAge === "number") out.minAge = s.minAge;
  if (typeof s.maxAge === "number") out.maxAge = s.maxAge;
  if (s.genders && s.genders.length > 0) out.genders = s.genders;
  if (s.nationalities && s.nationalities.length > 0) out.nationalities = s.nationalities;
  if (typeof s.topN === "number") {
    out.topNationalities = s.topN;
    out.topEntities = s.topN;
  }
  return out;
}

const DEFAULT_FILTERS: OperatorFilterState = {};

export default function Analytics() {
  const { authState } = useAuth();
  const uid = authState.status === "authenticated" ? authState.user.uid : null;

  const [dashboard, setDashboard] = useState<AnalyticsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scopeLabel, setScopeLabel] = useState("Admin Overview");

  // Draft (in-panel) and applied (last-clicked) filter states.
  const [filters, setFilters] = useState<OperatorFilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<OperatorFilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    if (authState.status === "loading") return;

    let cancelled = false;
    const currentUser: User | null = authState.status === "authenticated" ? authState.user : null;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryExtra = toQuery(appliedFilters);
        const baseDashboard = await getAnalyticsDashboard(queryExtra);

        if (!currentUser) {
          if (!cancelled) {
            setDashboard(baseDashboard);
            setScopeLabel("Admin Overview");
          }
          return;
        }

        const userSnapshot = await getDoc(doc(firestore, "users", currentUser.uid));
        const userData = (userSnapshot.exists() ? (userSnapshot.data() as UserRecord) : {}) as UserRecord;
        const role = normalizeText(userData.role).toLowerCase();

        if (role !== "operator") {
          if (!cancelled) {
            setDashboard(baseDashboard);
            setScopeLabel("Admin Overview");
          }
          return;
        }

        const operatorUid = resolveOperatorUid(currentUser.uid, userData, baseDashboard.filters.options.operators);
        const operatorDashboard = await getAnalyticsDashboard({
          ...queryExtra,
          operators: [operatorUid],
        });

        if (!cancelled) {
          setDashboard(operatorDashboard);
          setScopeLabel("Operator Overview");
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          const message = loadError instanceof Error ? loadError.message : "Failed to fetch analytics.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.status, uid, appliedFilters]);

  const totalBookings = dashboard?.summary.totalBookings ?? 0;
  const grossRevenue = dashboard?.summary.grossRevenue ?? 0;
  const netRevenue = dashboard?.summary.netRevenue ?? 0;

  const liveAsOf = dashboard?.generatedAt
    ? new Date(dashboard.generatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const [showFilters, setShowFilters] = useState(false);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    filtersButtonRef.current?.setAttribute('aria-pressed', showFilters ? 'true' : 'false');
  }, [showFilters]);

  // Derived option lists for the controlled filter panel.
  const nationalityOptions = dashboard?.filters.options.nationalities ?? [];
  const genderOptions = dashboard?.filters.options.genders ?? [];
  const paymentMethodOptions = useMemo(
    () => Array.from(new Set((dashboard?.paymentMethods ?? []).map((p) => p.method))),
    [dashboard?.paymentMethods]
  );

  // Client-side payment method filter (backend `AnalyticsQueryFilters` doesn't expose `paymentMethods`).
  const filteredPaymentMethods = useMemo(() => {
    const all = dashboard?.paymentMethods ?? [];
    const selected = appliedFilters.paymentMethods;
    if (!selected || selected.length === 0) return all;
    return all.filter((p) => selected.includes(p.method));
  }, [dashboard?.paymentMethods, appliedFilters.paymentMethods]);

  // Client-side promo usage filter (backend `AnalyticsQueryFilters` has no such field).
  const promoStats = useMemo(() => {
    const stats = dashboard?.promoCodeStats ?? { withPromo: 0, withoutPromo: 0 };
    const usage = appliedFilters.promoUsage ?? "any";
    if (usage === "used") return { withPromo: stats.withPromo, withoutPromo: 0 };
    if (usage === "unused") return { withPromo: 0, withoutPromo: stats.withoutPromo };
    return stats;
  }, [dashboard?.promoCodeStats, appliedFilters.promoUsage]);

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const handleGranularityChange = (g: FilterGranularity) => {
    setFilters((prev) => ({ ...prev, granularity: g }));
    setAppliedFilters((prev) => ({ ...prev, granularity: g }));
  };

  const handleExportCsv = () => {
    if (!dashboard) return;
    const rows: unknown[][] = [
      ["Section", "Metric", "Value"],
      ["Summary", "Generated At", dashboard.generatedAt],
      ["Summary", "Scope", scopeLabel],
      ["Summary", "Total Bookings", dashboard.summary.totalBookings],
      ["Summary", "Paid Bookings", dashboard.summary.paidBookings],
      ["Summary", "Total Travelers", dashboard.summary.totalTravelers],
      ["Summary", "Promo Bookings", dashboard.summary.promoBookings],
      ["Summary", "Gross Revenue", dashboard.summary.grossRevenue],
      ["Summary", "Net Revenue", dashboard.summary.netRevenue],
      [],
      ["Bookings Trend", "Label", "Count"],
      ...dashboard.bookingsTrend.points.map((point) => ["Bookings Trend", point.label, point.count]),
      [],
      ["Tourist Nationalities", "Nationality", "Count"],
      ...dashboard.touristNationalities.map((point) => ["Tourist Nationalities", point.nationality, point.count]),
      [],
      ["Tourist Age Distribution", "Range", "Count"],
      ...dashboard.touristAgeDistribution.map((point) => ["Tourist Age Distribution", point.range, point.count]),
      [],
      ["Promo Usage", "State", "Count"],
      ["Promo Usage", "With Promo", promoStats.withPromo],
      ["Promo Usage", "Without Promo", promoStats.withoutPromo],
      [],
      ["Payment Methods", "Method", "Count"],
      ...filteredPaymentMethods.map((point) => ["Payment Methods", point.method, point.count]),
      [],
      ["Affiliated Entities", "Entity", "Count"],
      ...dashboard.affiliatedEntities.map((point) => ["Affiliated Entities", point.entityName, point.count]),
    ];
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`analytics-${date}.csv`, rows);
  };

  useEffect(() => {
    if (!showFilters) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowFilters(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [showFilters]);

  return (
    <div className="-m-6 min-h-[calc(100vh-0px)] bg-gray-50">
      {/* Glassy filters overlay */}
      {showFilters && (
        <div
          className="fixed inset-0 z-40 flex lg:left-[4.5rem]"
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
        >
          <style jsx>{`
            @keyframes fadeInOverlay { from { opacity: 0 } to { opacity: 1 } }
            @keyframes slideInLeft { from { transform: translateX(-12px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
            .anim-fade { animation: fadeInOverlay 180ms ease-out both }
            .anim-slide { animation: slideInLeft 220ms cubic-bezier(0.22,1,0.36,1) both }
          `}</style>
          {/* Frosted backdrop */}
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setShowFilters(false)}
            className="anim-fade absolute inset-0 bg-neutral-900/30 backdrop-blur-sm"
          />
          {/* Glassy panel */}
          <aside
            className="anim-slide relative ml-0 flex h-full w-full max-w-sm flex-col overflow-hidden border-r border-white/40 bg-white/70 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl backdrop-saturate-150"
          >
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              aria-label="Close filters"
              className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-white/70 text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-white"
            >
              <span aria-hidden className="text-base leading-none">×</span>
            </button>
            <div className="flex-1 overflow-y-auto">
              <Filters
                value={filters}
                onChange={setFilters}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                nationalityOptions={nationalityOptions}
                genderOptions={genderOptions}
                paymentMethodOptions={paymentMethodOptions}
              />
            </div>
          </aside>
        </div>
      )}

      <div className="flex flex-col md:flex-row">
        <div className="min-w-0 flex-1 p-6">
          {/* Page header */}
          <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold leading-tight text-neutral-900">
                Analytics Overview
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="flex items-center gap-2 text-xs text-gray-500">
                  {loading ? (
                    <>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400" />
                      Loading dashboard…
                    </>
                  ) : error ? (
                    <span className="inline-flex items-center gap-1.5 text-red-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      {error}
                    </span>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0F5132]" />
                      System data live as of {liveAsOf}
                      <span className="text-gray-300">·</span>
                      <span className="font-medium text-gray-600">{scopeLabel}</span>
                    </>
                  )}
                </p>
                <button
                  ref={filtersButtonRef}
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  aria-pressed="false"
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium shadow-sm transition-colors ${
                    showFilters
                      ? "border-[#0F5132] bg-[#0F5132] text-white hover:bg-[#0c4128]"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  {showFilters ? "Hide Filters" : "Filters"}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={loading || !dashboard}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F5132] px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#0c4128]"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share Report
              </button>
            </div>
          </header>

          {/* KPI cards */}
          <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label="Total Bookings"
              value={loading ? "—" : totalBookings.toLocaleString("en-PH")}
              icon={<BookOpen size={18} />}
              iconBg="bg-emerald-50 text-[#0F5132]"
            />
            <KpiCard
              label="Gross Revenue"
              value={loading ? "—" : formatPeso(grossRevenue)}
              icon={<CreditCard size={18} />}
              iconBg="bg-emerald-50 text-[#0F5132]"
            />
            <KpiCard
              label="Net Revenue"
              value={loading ? "—" : formatPeso(netRevenue)}
              icon={<Wallet size={18} />}
              iconBg="bg-emerald-50 text-[#0F5132]"
            />
          </div>

          {/* Trend */}
          <div className="mb-5">
            <ChartLineLinear
              points={dashboard?.bookingsTrend.points || []}
              granularity={appliedFilters.granularity}
              onGranularityChange={handleGranularityChange}
            />
          </div>

          {/* Donut + Age + Gauge */}
          <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <ChartPieSimple points={dashboard?.touristNationalities || []} />
            <ChartBarDefault points={dashboard?.touristAgeDistribution || []} />
            <ChartPieCodes
              withPromo={promoStats.withPromo}
              withoutPromo={promoStats.withoutPromo}
            />
          </div>

          {/* Payment + Popular Promo Codes */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <PaymentMethod data={filteredPaymentMethods} />
            <ChartBarCodesDistribution
              data={dashboard?.affiliatedEntities || []}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
}

function KpiCard({ label, value, icon, iconBg }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
          {label}
        </p>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconBg}`}
        >
          {icon}
        </div>
      </div>
      <h3 className="mt-2 text-2xl font-extrabold leading-tight text-neutral-900">
        {value}
      </h3>
    </div>
  );
}
