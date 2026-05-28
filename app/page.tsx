"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FeedbackPanel from "./components/FeedbackPanel";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DASHBOARD_SUBTITLE =
  "Live Neon counts, asset trends, and site health from Network Snapshot data.";

type DashboardPayload = {
  total_clients: number;
  total_sites: number;
  total_assets: number;
  assets_this_week: number;
  assets_last_week: number;
  assets_daily: { date: string; count: number }[];
  recent_assets: {
    id: number;
    name: string;
    type: string;
    serial_number: string;
    site_name: string;
    client_name: string;
    created_at: string | null;
  }[];
  site_health: {
    site_id: number;
    site_name: string;
    client_name: string;
    ap_total: number | null;
    ap_online: number | null;
    device_count: number | null;
    last_speed_down: number | null;
    last_speed_up: number | null;
    open_followups: number;
    health: "green" | "yellow" | "red" | "gray";
  }[];
};

const statCards = [
  { key: "total_clients" as const, title: "Total Clients", href: "/clients" },
  { key: "total_sites" as const, title: "Total Sites", href: "/clients" },
  { key: "total_assets" as const, title: "Total Assets", href: "/assets" },
  { key: "assets_this_week" as const, title: "Assets This Week", href: "/assets" },
];

function formatCreatedAt(value: string | null): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function formatChartDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatSpeed(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Speed not set";
  return `${value} Mbps down`;
}

function formatApSummary(apOnline: number | null, apTotal: number | null): string {
  if (apOnline == null && apTotal == null) return "APs not set";
  if (apOnline != null && apTotal != null) return `APs ${apOnline}/${apTotal} online`;
  if (apTotal != null) return `APs ${apTotal} total`;
  if (apOnline != null) return `APs ${apOnline} online`;
  return "APs not set";
}

function formatDeviceSummary(count: number | null): string {
  if (count == null) return "Devices not set";
  return `Devices ${count}`;
}

function formatSiteHealthMeta(site: DashboardPayload["site_health"][number]): string {
  return [
    formatApSummary(site.ap_online, site.ap_total),
    formatDeviceSummary(site.device_count),
    formatSpeed(site.last_speed_down),
  ].join(" · ");
}

function healthLabel(health: DashboardPayload["site_health"][number]["health"]): string {
  if (health === "green") return "Normal";
  if (health === "yellow") return "Open follow-ups";
  if (health === "red") return "Needs attention";
  return "No snapshot";
}

export default function DashboardHomePage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) {
          throw new Error("Failed to load dashboard");
        }
        const payload = (await response.json()) as DashboardPayload;
        if (!cancelled) setData(payload);
      } catch {
        if (!cancelled) {
          setData(null);
          setError("We couldn't load dashboard data. Check your connection and try again.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const weekTrend =
    data && data.assets_last_week > 0
      ? Math.round(
          ((data.assets_this_week - data.assets_last_week) / data.assets_last_week) * 100
        )
      : null;

  return (
    <main className="page dashboard-page mobile-safe-page">
      <header className="dashboard-hero">
        <div className="dashboard-hero__row">
          <div>
            <h1 className="page__title">Dashboard</h1>
            <p className="page__subtitle page__subtle">{DASHBOARD_SUBTITLE}</p>
          </div>
          <div className="dashboard-hero__actions">
            <Link href="/clients" className="btn">
              Open Clients
            </Link>
            <Link href="/assets" className="btn--ghost">
              View Inventory
            </Link>
            <Link href="/scan" className="btn-secondary">
              Run Network Scan
            </Link>
          </div>
        </div>
      </header>

      {isLoading ? (
        <>
          <section className="dashboard-stat-grid dashboard-stat-grid--four" aria-label="Loading metrics">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="card dashboard-stat-card dashboard-stat-card--skeleton">
                <div className="skeleton-line skeleton-line--title" />
                <div className="skeleton-line skeleton-line--metric" />
              </div>
            ))}
          </section>
          <section className="dashboard-split">
            <div className="card">
              <div className="skeleton-line skeleton-line--title" />
              <div className="skeleton-chart" />
            </div>
            <div className="dashboard-split__bottom">
              <div className="card">
                <div className="skeleton-line skeleton-line--title" />
                <div className="skeleton-table">
                  <div className="skeleton-table__row" />
                  <div className="skeleton-table__row" />
                </div>
              </div>
              <div className="card">
                <div className="skeleton-line skeleton-line--title" />
                <div className="skeleton-table">
                  <div className="skeleton-table__row" />
                  <div className="skeleton-table__row" />
                </div>
              </div>
            </div>
          </section>
        </>
      ) : error ? (
        <FeedbackPanel
          title="Dashboard unavailable"
          message={error}
          tone="error"
          actionLabel="Try again"
          onAction={() => setReloadKey((key) => key + 1)}
        />
      ) : data ? (
        <>
          <section className="dashboard-stat-grid dashboard-stat-grid--four" aria-label="Summary statistics">
            {statCards.map((card) => (
              <Link key={card.key} href={card.href} className="dashboard-stat-card">
                <span className="dashboard-stat-card__eyebrow">{card.title}</span>
                <span className="dashboard-stat-card__value">{data[card.key]}</span>
                {card.key === "assets_this_week" && weekTrend != null ? (
                  <span className="dashboard-stat-card__hint">
                    {weekTrend >= 0 ? "+" : ""}
                    {weekTrend}% vs last week
                  </span>
                ) : (
                  <span className="dashboard-stat-card__hint">Live from Neon</span>
                )}
              </Link>
            ))}
          </section>

          <section className="dashboard-split">
            <section className="card dashboard-chart-card" aria-labelledby="asset-trend-title">
              <header className="dashboard-section__header">
                <p className="dashboard-section__kicker">Trend</p>
                <h2 id="asset-trend-title" className="dashboard-section__title">
                  Assets added — last 30 days
                </h2>
              </header>
              <div className="dashboard-chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.assets_daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="assetAreaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                    />
                    <Tooltip
                      labelFormatter={(label) => formatChartDate(String(label))}
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid rgba(148,163,184,0.25)",
                        borderRadius: 10,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Assets"
                      stroke="#60a5fa"
                      fill="url(#assetAreaFill)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <div className="dashboard-split__bottom">
              <section className="card" aria-labelledby="recent-assets-heading">
                <header className="dashboard-section__header">
                  <p className="dashboard-section__kicker">Recent</p>
                  <h2 id="recent-assets-heading" className="dashboard-section__title">
                    Latest assets
                  </h2>
                </header>
                {data.recent_assets.length === 0 ? (
                  <div className="empty-state">
                    <p className="status">No assets yet. Add inventory from a site or scan.</p>
                    <Link href="/assets" className="btn-secondary mobile-touch-btn">
                      View inventory
                    </Link>
                  </div>
                ) : (
                  <ul className="dashboard-recent-list">
                    {data.recent_assets.map((asset) => (
                      <li key={asset.id}>
                        <Link href={`/assets/${asset.id}`} className="dashboard-recent-list__item">
                          <span className="dashboard-recent-list__name">{asset.name}</span>
                          <span className="dashboard-recent-list__meta">
                            {asset.type} · {asset.site_name}
                          </span>
                          <span className="dashboard-recent-list__time">
                            {formatCreatedAt(asset.created_at)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card" aria-labelledby="site-health-heading">
                <header className="dashboard-section__header">
                  <p className="dashboard-section__kicker">Network Snapshot</p>
                  <h2 id="site-health-heading" className="dashboard-section__title">
                    Site health
                  </h2>
                </header>
                {data.site_health.length === 0 ? (
                  <div className="empty-state">
                    <p className="status">No sites yet. Add a client and site to see health data.</p>
                    <Link href="/clients" className="btn-secondary mobile-touch-btn">
                      Open clients
                    </Link>
                  </div>
                ) : (
                  <ul className="site-health-list">
                    {data.site_health.map((site) => (
                      <li key={site.site_id}>
                        <Link
                          href={`/sites/${site.site_id}`}
                          className="site-health-list__item"
                        >
                          <span
                            className={`health-dot health-dot--${site.health}`}
                            aria-label={healthLabel(site.health)}
                          />
                          <div className="site-health-list__body">
                            <span className="site-health-list__name">{site.site_name}</span>
                            <span className="site-health-list__client">{site.client_name}</span>
                            <span className="site-health-list__meta">
                              {formatSiteHealthMeta(site)}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
