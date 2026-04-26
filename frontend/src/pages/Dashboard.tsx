import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock, DollarSign, Users } from "lucide-react";
import { api, type EventListItem, type MonthSummary } from "../lib/api";
import PageHeader from "../components/PageHeader";
import StatusPill from "../components/StatusPill";
import { fmtMoney, fmtRange } from "../lib/format";

function StatCard({
  icon: Icon,
  label,
  value,
  accent = "blue",
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  accent?: "blue" | "gold" | "coral";
}) {
  const accentColor = accent === "gold"
    ? "var(--color-gold)"
    : accent === "coral"
    ? "var(--color-coral)"
    : "var(--color-brand-blue)";
  return (
    <div className="card flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: accentColor }}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-[var(--color-ink-soft)] font-semibold">{label}</div>
        <div className="text-2xl font-bold mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const now = new Date();
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [upcoming, setUpcoming] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, evs] = await Promise.all([
          api.get<MonthSummary>(`/summary/month?year=${now.getFullYear()}&month=${now.getMonth() + 1}`),
          api.get<EventListItem[]>(`/events?status=upcoming`),
        ]);
        setSummary(s);
        setUpcoming(evs.slice(0, 6));
      } finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Welcome back."
        tagline="Every angle, every moment, every celebration — at a glance."
      />

      {loading ? (
        <div className="card text-[var(--color-ink-soft)]">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={CalendarDays} label="Events this month" value={String(summary?.event_count ?? 0)} />
            <StatCard icon={Clock} label="Hours booked" value={(summary?.total_hours ?? 0).toFixed(1)} accent="gold" />
            <StatCard icon={DollarSign} label="Revenue" value={fmtMoney(summary?.revenue_cents ?? 0)} />
            <StatCard
              icon={Users}
              label="Top crew"
              value={summary?.top_crew[0]?.name ?? "—"}
              accent="coral"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="eyebrow">Upcoming</div>
                <Link to="/events" className="text-xs font-semibold text-[var(--color-brand-blue)] hover:underline">See all</Link>
              </div>
              {upcoming.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-soft)]">No upcoming events. Time to book one.</p>
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((e) => (
                    <li key={e.id}>
                      <Link to={`/events/${e.id}`} className="flex items-start justify-between gap-3 p-3 rounded-lg hover:bg-[var(--color-canvas-soft)] transition">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{e.title}</div>
                          <div className="text-xs text-[var(--color-ink-soft)] mt-0.5">{fmtRange(e.start_at, e.end_at)}</div>
                          {e.location && <div className="text-xs text-[var(--color-ink-soft)]">{e.location}</div>}
                        </div>
                        <StatusPill status={e.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <div className="eyebrow mb-4">Top equipment this month</div>
              {(summary?.top_equipment.length ?? 0) === 0 ? (
                <p className="text-sm text-[var(--color-ink-soft)]">Nothing tagged yet this month.</p>
              ) : (
                <ul className="space-y-2">
                  {summary?.top_equipment.map((t) => (
                    <li key={t.id} className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{t.name}</span>
                      <span className="text-[var(--color-ink-soft)]">{t.count} {t.count === 1 ? "event" : "events"}</span>
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
