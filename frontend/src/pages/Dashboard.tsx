import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { api, type EventListItem, type MonthSummary } from "../lib/api";
import PageHeader from "../components/PageHeader";
import StatusPill from "../components/StatusPill";
import { fmtRange } from "../lib/format";

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-sm">
            <div className="card flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 bg-[var(--color-brand-blue)]">
                <CalendarDays size={20} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-[var(--color-ink-soft)] font-semibold">Events this month</div>
                <div className="text-2xl font-bold mt-0.5">{summary?.event_count ?? 0}</div>
              </div>
            </div>
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
