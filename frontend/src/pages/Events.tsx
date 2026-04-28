import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, List, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, ApiError, type CrewMember, type EquipmentTag, type EventDetail, type EventListItem, type EventStatus } from "../lib/api";
import { useToast } from "../lib/toast";
import { useConfirm } from "../lib/confirm";
import PageHeader from "../components/PageHeader";
import StatusPill from "../components/StatusPill";
import Modal from "../components/Modal";
import { fmtRange, fmtTime, monthName, toLocalInputValue } from "../lib/format";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarView({ year, month, events, onPrev, onNext, onEventClick }: {
  year: number; month: number; events: EventListItem[];
  onPrev: () => void; onNext: () => void; onEventClick: (id: number) => void;
}) {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const tod = new Date();
  const isToday = (d: number) => tod.getFullYear() === year && tod.getMonth() + 1 === month && tod.getDate() === d;
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const byDay: Record<number, EventListItem[]> = {};
  for (const ev of events) {
    const d = new Date(ev.start_at);
    if (d.getFullYear() === year && d.getMonth() + 1 === month) (byDay[d.getDate()] ??= []).push(ev);
  }
  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-line)]">
        <button className="btn btn-ghost p-1.5" onClick={onPrev}><ChevronLeft size={18} /></button>
        <span className="font-bold text-base">{monthName(month)} {year}</span>
        <button className="btn btn-ghost p-1.5" onClick={onNext}><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 border-b border-[var(--color-line)]">
        {DOW.map((d) => <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-soft)] py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => (
          <div key={i} className={"min-h-[88px] p-1 border-b border-[var(--color-line)] " + (i % 7 !== 6 ? "border-r " : "") + (day === null ? "bg-[var(--color-canvas-soft)]" : "")}>
            {day !== null && (
              <>
                <div className={"text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 " + (isToday(day) ? "bg-[var(--color-brand-blue)] text-white" : "text-[var(--color-ink-soft)]")}>{day}</div>
                <div className="space-y-0.5">
                  {(byDay[day] ?? []).map((ev) => (
                    <button key={ev.id} onClick={() => onEventClick(ev.id)} title={`${ev.title}${ev.client_name ? ` — ${ev.client_name}` : ""} · ${fmtTime(ev.start_at)}`}
                      className={"w-full text-left text-[11px] font-semibold px-1.5 py-0.5 rounded truncate block " + (ev.status === "upcoming" ? "bg-[var(--color-brand-blue)]/10 text-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue)]/20" : "bg-[var(--color-ink-soft)]/10 text-[var(--color-ink-soft)] hover:bg-[var(--color-ink-soft)]/20")}>
                      {ev.title}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUSES: EventStatus[] = ["upcoming", "completed"];

const blankForm = () => {
  const start = new Date(); start.setMinutes(0, 0, 0); start.setHours(start.getHours() + 24);
  return {
    title: "",
    client_name: "",
    location: "",
    start_at: toLocalInputValue(start),
    duration_hours: "3",
    description: "",
    status: "upcoming" as EventStatus,
    price_cents: "",
  };
};

export default function Events() {
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const today = new Date();

  const [items, setItems] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [calEvents, setCalEvents] = useState<EventListItem[]>([]);

  const [crewOptions, setCrewOptions] = useState<CrewMember[]>([]);
  const [tagOptions, setTagOptions] = useState<EquipmentTag[]>([]);

  // Modal state
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blankForm());
  const [selectedCrew, setSelectedCrew] = useState<number[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const q = statusFilter ? `?status=${statusFilter}` : "";
      setItems(await api.get<EventListItem[]>(`/events${q}`));
    } finally { setLoading(false); }
  }

  async function loadCalEvents() {
    try { setCalEvents(await api.get<EventListItem[]>(`/events?year=${calYear}&month=${calMonth}`)); } catch {}
  }

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => { loadCalEvents(); }, [calYear, calMonth]);
  useEffect(() => {
    api.get<CrewMember[]>("/crew?active_only=true").then(setCrewOptions).catch(() => {});
    api.get<EquipmentTag[]>("/equipment").then(setTagOptions).catch(() => {});
  }, []);

  function prevMonth() {
    if (calMonth === 1) { setCalMonth(12); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1);
  }
  function nextMonth() {
    if (calMonth === 12) { setCalMonth(1); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1);
  }

  function openNew() {
    setModalMode("create");
    setEditingId(null);
    setForm(blankForm());
    setSelectedCrew([]);
    setSelectedTagNames([]);
    setTagInput("");
    setError(null);
    setOpen(true);
  }

  async function openEdit(e: EventListItem) {
    setModalMode("edit");
    setEditingId(e.id);
    setError(null);
    setSelectedTagNames([]);
    setTagInput("");
    // Load full event to get description + price
    try {
      const full = await api.get<EventDetail>(`/events/${e.id}`);
      const durationHours = Math.round(
        (new Date(full.end_at).getTime() - new Date(full.start_at).getTime()) / 36000
      ) / 100;
      setForm({
        title: full.title,
        client_name: full.client_name ?? "",
        location: full.location ?? "",
        start_at: toLocalInputValue(full.start_at),
        duration_hours: String(durationHours),
        description: full.description ?? "",
        status: full.status,
        price_cents: full.price_cents != null ? (full.price_cents / 100).toString() : "",
      });
    } catch {
      setForm({ ...blankForm(), title: e.title, status: e.status });
    }
    setOpen(true);
  }

  function toggleCrew(id: number) {
    setSelectedCrew((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function addTagFromInput() {
    const name = tagInput.trim();
    if (!name) return;
    if (!selectedTagNames.map((t) => t.toLowerCase()).includes(name.toLowerCase()))
      setSelectedTagNames((prev) => [...prev, name]);
    setTagInput("");
  }

  function computeEndAt(startValue: string, durationHours: string): string {
    const start = new Date(startValue).getTime();
    const hours = parseFloat(durationHours) || 1;
    return new Date(start + hours * 3600 * 1000).toISOString();
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
      end_at: computeEndAt(form.start_at, form.duration_hours),
      description: form.description.trim() || null,
      status: form.status,
      price_cents: form.price_cents ? Math.round(parseFloat(form.price_cents) * 100) : null,
    };
    try {
      const created = await api.post<{ id: number }>("/events", payload);
      // Assign selected crew sequentially
      for (const crewId of selectedCrew) {
        try { await api.post(`/events/${created.id}/crew`, { crew_member_id: crewId }); } catch {}
      }
      for (const tagName of selectedTagNames) {
        try {
          let tag = tagOptions.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
          if (!tag) { tag = await api.post<EquipmentTag>("/equipment", { name: tagName, category: null }); setTagOptions((p) => [...p, tag!]); }
          await api.post(`/events/${created.id}/equipment/${tag.id}`);
        } catch {}
      }
      toast.push("success", "Event created");
      setOpen(false);
      navigate(`/events/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally { setBusy(false); }
  }

  async function update(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setBusy(true);
    setError(null);
    const payload = {
      title: form.title.trim(),
      client_name: form.client_name.trim() || null,
      location: form.location.trim() || null,
      start_at: new Date(form.start_at).toISOString(),
      end_at: computeEndAt(form.start_at, form.duration_hours),
      description: form.description.trim() || null,
      status: form.status,
      price_cents: form.price_cents ? Math.round(parseFloat(form.price_cents) * 100) : null,
    };
    try {
      await api.patch(`/events/${editingId}`, payload);
      toast.push("success", "Event updated");
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally { setBusy(false); }
  }

  async function remove(ev: EventListItem) {
    const ok = await confirm({
      title: `Delete "${ev.title}"?`,
      body: "This removes the event and cancels the Google Calendar invite. Cannot be undone.",
      confirmLabel: "Delete",
      kind: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/events/${ev.id}`);
      toast.push("success", "Event deleted");
      await load();
    } catch (err) {
      toast.push("error", err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Schedule"
        title="Events"
        tagline="Every booking, in one place."
        actions={<button className="btn btn-primary" onClick={openNew}><Plus size={16} /> New event</button>}
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-2">
          <button className={"btn " + (statusFilter === "" ? "btn-primary" : "btn-ghost")} onClick={() => setStatusFilter("")}>All</button>
          {STATUSES.map((s) => (
            <button key={s} className={"btn " + (statusFilter === s ? "btn-primary" : "btn-ghost")} onClick={() => setStatusFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5 ml-auto border border-[var(--color-line)] rounded-lg p-0.5">
          <button className={"btn px-2.5 py-1.5 " + (viewMode === "list" ? "btn-primary" : "btn-ghost")} onClick={() => setViewMode("list")} title="List view"><List size={15} /></button>
          <button className={"btn px-2.5 py-1.5 " + (viewMode === "calendar" ? "btn-primary" : "btn-ghost")} onClick={() => setViewMode("calendar")} title="Calendar view"><CalendarDays size={15} /></button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <CalendarView year={calYear} month={calMonth} events={calEvents} onPrev={prevMonth} onNext={nextMonth} onEventClick={(id) => navigate(`/events/${id}`)} />
      ) : (
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-canvas-soft)] text-left">
            <tr className="text-[11px] uppercase tracking-wider text-[var(--color-ink-soft)]">
              <th className="px-5 py-3">Event</th>
              <th className="px-5 py-3">Client</th>
              <th className="px-5 py-3">When</th>
              <th className="px-5 py-3">Where</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="px-5 py-6 text-[var(--color-ink-soft)]" colSpan={6}>Loading…</td></tr>}
            {!loading && items.length === 0 && (
              <tr><td className="px-5 py-10 text-center text-[var(--color-ink-soft)]" colSpan={6}>No events here yet.</td></tr>
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
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button className="btn btn-ghost mr-2" onClick={() => openEdit(e)} title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-danger" onClick={() => remove(e)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={modalMode === "edit" ? "Edit event" : "New event"} width={640}>
        <form onSubmit={modalMode === "edit" ? update : create} className="space-y-3">
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
              <label className="block text-sm font-semibold mb-1">Duration (hours)</label>
              <input type="number" className="input" min="0.5" max="24" step="0.5" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} placeholder="e.g. 4" required />
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
              <label className="block text-sm font-semibold mb-1">Price (USD)</label>
              <input className="input" inputMode="decimal" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: e.target.value })} placeholder="e.g. 850" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Equipment</label>
            {selectedTagNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedTagNames.map((name) => (
                  <span key={name} className="chip group cursor-default">
                    {name}
                    <button type="button" className="opacity-60 group-hover:opacity-100" onClick={() => setSelectedTagNames((p) => p.filter((t) => t !== name))}><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input className="input" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTagFromInput(); } }}
                placeholder="Type a tag and press Enter" list="modal-tag-suggestions" />
              <datalist id="modal-tag-suggestions">{tagOptions.map((t) => <option key={t.id} value={t.name} />)}</datalist>
              <button type="button" className="btn btn-ghost" onClick={addTagFromInput}>Add</button>
            </div>
          </div>

          {crewOptions.length > 0 && (
            <div>
              <label className="block text-sm font-semibold mb-2">Assign crew</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                {crewOptions.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-[var(--color-canvas-soft)] cursor-pointer">
                    <input type="checkbox" checked={selectedCrew.includes(c.id)} onChange={() => toggleCrew(c.id)} />
                    <span className="font-semibold truncate">{c.name}</span>
                    {c.role && <span className="text-[var(--color-ink-soft)] text-xs truncate">· {c.role}</span>}
                  </label>
                ))}
              </div>
              {selectedCrew.length > 0 && (
                <p className="text-xs text-[var(--color-brand-blue)] mt-1">
                  {selectedCrew.length} crew member{selectedCrew.length > 1 ? "s" : ""} will receive a calendar invite.
                </p>
              )}
            </div>
          )}

          {error && <div className="text-sm text-[var(--color-coral)]">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? (modalMode === "edit" ? "Saving…" : "Creating…") : (modalMode === "edit" ? "Save changes" : "Create event")}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
