import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type YearSummary, type MonthSummary } from "../lib/api";
import PageHeader from "../components/PageHeader";
import { monthName } from "../lib/format";

const BLUE = "#134896";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wider text-[var(--color-ink-soft)] font-semibold mb-1">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

export default function Reports() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [yearSummary, setYearSummary] = useState<YearSummary | null>(null);
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<YearSummary>(`/summary/year?year=${year}`),
      api.get<MonthSummary>(`/summary/month?year=${year}&month=${month}`),
    ])
      .then(([y, m]) => { setYearSummary(y); setMonthSummary(m); })
      .finally(() => setLoading(false));
  }, [year, month]);

  const chartData = (yearSummary?.by_month ?? []).map((m) => ({
    month: monthName(m.month).slice(0, 3),
    events: m.event_count,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Reports"
        tagline="Look back across the season — events, crew, and equipment."
      />

      <div className="card mb-6 flex items-center gap-3 flex-wrap">
        <label className="text-sm font-semibold">Year</label>
        <input
          type="number"
          className="input"
          style={{ width: 110 }}
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value || `${today.getFullYear()}`, 10))}
        />
        <label className="text-sm font-semibold ml-3">Month</label>
        <select className="input" style={{ width: 160 }} value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{monthName(m)}</option>
          ))}
        </select>
      </div>

      {loading && <div className="card text-[var(--color-ink-soft)]">Loading…</div>}

      {!loading && yearSummary && monthSummary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard label={`${year} events`} value={String(yearSummary.event_count)} />
            <StatCard label={`${monthName(month)} events`} value={String(monthSummary.event_count)} />
          </div>

          <div className="card mb-6">
            <div className="eyebrow mb-4">{year} — events per month</div>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e1d8" />
                  <XAxis dataKey="month" stroke="#4a5063" fontSize={12} />
                  <YAxis stroke="#4a5063" fontSize={12} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "#eef3fb" }} contentStyle={{ borderRadius: 10, border: "1px solid #e4e1d8" }} />
                  <Bar dataKey="events" fill={BLUE} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="eyebrow mb-3">{year} — top crew</div>
              {yearSummary.top_crew.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-soft)]">No crew assignments this year.</p>
              ) : (
                <ul className="space-y-2">
                  {yearSummary.top_crew.map((c) => (
                    <li key={c.id} className="flex justify-between text-sm">
                      <span className="font-semibold">{c.name}</span>
                      <span className="text-[var(--color-ink-soft)]">{c.count} events</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card">
              <div className="eyebrow mb-3">{year} — top equipment</div>
              {yearSummary.top_equipment.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-soft)]">No equipment tagged this year.</p>
              ) : (
                <ul className="space-y-2">
                  {yearSummary.top_equipment.map((t) => (
                    <li key={t.id} className="flex justify-between text-sm">
                      <span className="font-semibold">{t.name}</span>
                      <span className="text-[var(--color-ink-soft)]">{t.count} events</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
