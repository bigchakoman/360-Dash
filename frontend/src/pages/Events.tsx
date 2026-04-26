import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { api, ApiError, type EventListItem, type EventStatus } from "../lib/api";
import { useToast } from "../lib/toast";
import PageHeader from "../components/PageHeader";
import StatusPill from "../components/StatusPill";
import Modal from "../components/Modal";
import { fmtRange, toLocalInputValue } from "../lib/format";

const STATUSES: EventStatus[] = ["upcoming", "completed", "cancelled"];

const blankEvent = () => {
  const start = new Date(); start.setMinutes(0, 0, 0); start.setHours(start.getHours() + 24);
  const end = new Date(start); end.setHours(end.getHours() + 3);
  return {
    title: "",
    client_name: "",
    location: "",
    start_at: toLocalInputValue(start),
    end_at: toLocalInputValue(end),
    description: "",
    status: "upcoming" as EventStatus,
    price_cents: "",
  };
};

export default function Events() {
  const toast = useToast();
  const [items, setItems] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blankEvent());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const q = statusFilter ? `?status=${statusFilter}` : "";
      setItems(await api.get<EventListItem[]>(`/events${q}`));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [statusFilter]);

  function openNew() {
    setForm(blankEvent());
    setError(null);
    setOpen(true);
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      title: form.title.trim(),
      client_name: form.client_name.trim() || null,
      location: form.location.trim() || null,
      start_at: new Date(form.start_at).toISOString(),
      end_at: new Date(form.end_at).toISOString(),
      description: form.description.trim() || null,
      status: form.status,
      price_cents: form.price_cents ? Math.round(parseFloat(form.price_cents) * 100) : null,
    };
    try {
      const created = await api.post<{ id: number }>("/events", payload);
      toast.push("success", "Event created");
      setOpen(false);
      window.location.assign(`/events/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader
        eyebrow="Schedule"
        title="Events"
        tagline="Every booking, in one place."
        actions={<button className="btn btn-primary" onClick={openNew}><Plus size={16} /> New event</button>}
      />

      <div className="flex gap-2 mb-4">
        <button
          className={"btn " + (statusFilter === "" ? "btn-primary" : "btn-ghost")}
          onClick={() => setStatusFilter("")}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            className={"btn " + (statusFilter === s ? "btn-primary" : "btn-ghost")}
            onClick={() => setStatusFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-canvas-soft)] text-left">
            <tr className="text-[11px] uppercase tracking-wider text-[var(--color-ink-soft)]">
              <th className="px-5 py-3">Event</th>
              <th className="px-5 py-3">Client</th>
              <th className="px-5 py-3">When</th>
              <th className="px-5 py-3">Where</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="px-5 py-6 text-[var(--color-ink-soft)]" colSpan={5}>Loading…</td></tr>}
            {!loading && items.length === 0 && (
              <tr><td className="px-5 py-10 text-center text-[var(--color-ink-soft)]" colSpan={5}>
                No events here yet.
              </td></tr>
            )}
            {items.map((e) => (
              <tr key={e.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-canvas-soft)] transition">
                <td className="px-5 py-3 font-semibold">
                  <Link to={`/events/${e.id}`} className="hover:text-[var(--color-brand-blue)]">{e.title}</Link>
                </td>
                <td className="px-5 py-3 text-[var(--color-ink-soft)]">{e.client_name ?? "—"}</td>
                <td className="px-5 py-3 text-[var(--color-ink-soft)] text-xs">{fmtRange(e.start_at, e.end_at)}</td>
                <td className="px-5 py-3 text-[var(--color-ink-soft)] text-xs">{e.location ?? "—"}</td>
                <td className="px-5 py-3"><StatusPill status={e.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New event" width={620}>
        <form onSubmit={create} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Client</label>
              <input className="input" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Location</label>
              <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Start</label>
              <input type="datetime-local" className="input" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">End</label>
              <input type="datetime-local" className="input" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Price (USD, optional)</label>
              <input className="input" inputMode="decimal" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: e.target.value })} placeholder="e.g. 850" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Description</label>
            <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief, sent verbatim to crew on assignment." />
          </div>
          {error && <div className="text-sm text-[var(--color-coral)]">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create event"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
