import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarCheck, CalendarX, Check, Clock, Mail, Trash2, X } from "lucide-react";
import { api, ApiError, type EventDetail, type CrewMember, type EquipmentTag } from "../lib/api";
import { useToast } from "../lib/toast";
import { useConfirm } from "../lib/confirm";
import PageHeader from "../components/PageHeader";
import StatusPill from "../components/StatusPill";
import { fmtRange, toLocalInputValue, fmtMoney } from "../lib/format";

function CalStatus({ invited_at, cal_invite_status, calendar_error, email }: {
  invited_at: string | null;
  cal_invite_status: string | null;
  calendar_error: string | null;
  email: string | null;
}) {
  if (!email) {
    return <span className="text-[var(--color-ink-soft)] italic">No email — add one to invite</span>;
  }
  if (calendar_error) {
    return (
      <span className="text-[var(--color-coral)] inline-flex items-center gap-1">
        <CalendarX size={12} /> {calendar_error}
      </span>
    );
  }
  if (invited_at) {
    return (
      <span className="text-[var(--color-brand-blue)] inline-flex items-center gap-1">
        <CalendarCheck size={12} /> Invite sent
        {cal_invite_status && cal_invite_status !== "invite_sent" && (
          <span className="ml-1 opacity-70">· {cal_invite_status}</span>
        )}
      </span>
    );
  }
  return (
    <span className="text-[var(--color-ink-soft)] inline-flex items-center gap-1">
      <Clock size={12} /> Pending calendar sync
    </span>
  );
}

export default function EventDetailPage() {
  const { id } = useParams();
  const eventId = Number(id);
  const toast = useToast();
  const confirm = useConfirm();
  const [ev, setEv] = useState<EventDetail | null>(null);
  const [crewOptions, setCrewOptions] = useState<CrewMember[]>([]);
  const [tagOptions, setTagOptions] = useState<EquipmentTag[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [crewToAdd, setCrewToAdd] = useState<string>("");
  const [editForm, setEditForm] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    const [e, crew, tags] = await Promise.all([
      api.get<EventDetail>(`/events/${eventId}`),
      api.get<CrewMember[]>("/crew?active_only=true"),
      api.get<EquipmentTag[]>("/equipment"),
    ]);
    setEv(e);
    setCrewOptions(crew);
    setTagOptions(tags);
    setEditForm({
      title: e.title,
      client_name: e.client_name ?? "",
      location: e.location ?? "",
      start_at: toLocalInputValue(e.start_at),
      end_at: toLocalInputValue(e.end_at),
      description: e.description ?? "",
      status: e.status,
      price_cents: e.price_cents != null ? (e.price_cents / 100).toString() : "",
    });
  }
  useEffect(() => { if (!Number.isNaN(eventId)) load(); }, [eventId]);

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await api.patch<EventDetail>(`/events/${eventId}`, {
        title: editForm.title,
        client_name: editForm.client_name || null,
        location: editForm.location || null,
        start_at: new Date(editForm.start_at).toISOString(),
        end_at: new Date(editForm.end_at).toISOString(),
        description: editForm.description || null,
        status: editForm.status,
        price_cents: editForm.price_cents ? Math.round(parseFloat(editForm.price_cents) * 100) : null,
      });
      toast.push("success", "Event updated — calendar invite updated");
      await load();
    } catch (err) {
      toast.push("error", err instanceof ApiError ? err.message : "Save failed");
    } finally { setSavingEdit(false); }
  }

  async function assignCrew() {
    if (!crewToAdd) return;
    try {
      await api.post(`/events/${eventId}/crew`, { crew_member_id: Number(crewToAdd) });
      toast.push("success", "Crew assigned — Google Calendar invite sent");
      setCrewToAdd("");
      await load();
    } catch (err) {
      toast.push("error", err instanceof ApiError ? err.message : "Assign failed");
    }
  }

  async function unassignCrew(cid: number) {
    const ok = await confirm({
      title: "Remove from this event?",
      body: "They'll be unassigned and removed from the Google Calendar event.",
      confirmLabel: "Remove",
      kind: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/events/${eventId}/crew/${cid}`);
      toast.push("success", "Removed from event and calendar");
      await load();
    } catch (err) {
      toast.push("error", err instanceof ApiError ? err.message : "Remove failed");
    }
  }

  async function addTag() {
    const name = tagInput.trim();
    if (!name) return;
    let tag = tagOptions.find((t) => t.name.toLowerCase() === name.toLowerCase());
    try {
      if (!tag) {
        tag = await api.post<EquipmentTag>("/equipment", { name, category: null });
        setTagOptions([...tagOptions, tag]);
      }
      await api.post(`/events/${eventId}/equipment/${tag.id}`);
      setTagInput("");
      await load();
    } catch (err) {
      toast.push("error", err instanceof ApiError ? err.message : "Tag failed");
    }
  }

  async function removeTag(tagId: number) {
    try {
      await api.delete(`/events/${eventId}/equipment/${tagId}`);
      await load();
    } catch (err) {
      toast.push("error", err instanceof ApiError ? err.message : "Remove failed");
    }
  }

  if (!ev || !editForm) return <div className="card text-[var(--color-ink-soft)]">Loading…</div>;

  const assignedIds = new Set(ev.crew_assignments.map((a) => a.crew_member.id));
  const availableCrew = crewOptions.filter((c) => !assignedIds.has(c.id));

  return (
    <>
      <Link to="/events" className="inline-flex items-center gap-1 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-brand-blue)] mb-3">
        <ArrowLeft size={14} /> All events
      </Link>
      <PageHeader
        eyebrow={ev.client_name ?? "Event"}
        title={ev.title}
        tagline={fmtRange(ev.start_at, ev.end_at)}
        actions={
          <div className="flex items-center gap-3">
            {ev.google_calendar_event_id ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-brand-blue)]">
                <Check size={14} /> On Google Calendar
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-soft)]">
                Calendar not synced
              </span>
            )}
            <StatusPill status={ev.status} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details (col 1-2) */}
        <form onSubmit={saveEdit} className="card lg:col-span-2 space-y-3">
          <div className="eyebrow mb-2">Event details</div>
          <div>
            <label className="block text-sm font-semibold mb-1">Title</label>
            <input className="input" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Client</label>
              <input className="input" value={editForm.client_name} onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Location</label>
              <input className="input" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Start</label>
              <input type="datetime-local" className="input" value={editForm.start_at} onChange={(e) => setEditForm({ ...editForm, start_at: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">End</label>
              <input type="datetime-local" className="input" value={editForm.end_at} onChange={(e) => setEditForm({ ...editForm, end_at: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Status</label>
              <select className="input" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="upcoming">upcoming</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Price (USD)</label>
              <input className="input" inputMode="decimal" value={editForm.price_cents} onChange={(e) => setEditForm({ ...editForm, price_cents: e.target.value })} />
              <p className="text-xs text-[var(--color-ink-soft)] mt-1">Currently: {fmtMoney(ev.price_cents)}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Description</label>
            <textarea className="input" rows={4} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </div>
          <div className="flex justify-end pt-1">
            <button className="btn btn-primary" disabled={savingEdit}>{savingEdit ? "Saving…" : "Save changes"}</button>
          </div>
        </form>

        {/* Crew + Equipment (col 3) */}
        <div className="space-y-6">
          <div className="card">
            <div className="eyebrow mb-3">Crew</div>

            <div className="flex gap-2 mb-4">
              <select className="input" value={crewToAdd} onChange={(e) => setCrewToAdd(e.target.value)}>
                <option value="">Add crew…</option>
                {availableCrew.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.role ? ` · ${c.role}` : ""}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={assignCrew} disabled={!crewToAdd}>
                <Mail size={14} /> Invite
              </button>
            </div>

            {ev.crew_assignments.length === 0 && (
              <p className="text-sm text-[var(--color-ink-soft)]">No crew assigned yet.</p>
            )}

            <ul className="space-y-2">
              {ev.crew_assignments.map((a) => (
                <li key={a.crew_member.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-[var(--color-canvas-soft)]">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{a.crew_member.name}</div>
                    {a.crew_member.email && (
                      <div className="text-xs text-[var(--color-ink-soft)]">{a.crew_member.email}</div>
                    )}
                    <div className="text-[11px] mt-1">
                      <CalStatus
                        invited_at={a.invited_at}
                        cal_invite_status={a.cal_invite_status}
                        calendar_error={a.calendar_error}
                        email={a.crew_member.email}
                      />
                    </div>
                  </div>
                  <button className="btn btn-danger text-xs px-2 py-1 shrink-0" onClick={() => unassignCrew(a.crew_member.id)} title="Remove">
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <div className="eyebrow mb-3">Equipment used</div>

            <form onSubmit={(e) => { e.preventDefault(); addTag(); }} className="flex gap-2 mb-3">
              <input
                className="input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Type a tag and press Enter"
                list="equipment-suggestions"
              />
              <datalist id="equipment-suggestions">
                {tagOptions.map((t) => <option key={t.id} value={t.name} />)}
              </datalist>
              <button className="btn btn-primary" type="submit">Add</button>
            </form>

            {ev.equipment_links.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-soft)]">No equipment tagged.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ev.equipment_links.map((l) => (
                  <span key={l.tag.id} className="chip group cursor-default">
                    {l.tag.name}
                    <button className="opacity-60 group-hover:opacity-100" onClick={() => removeTag(l.tag.id)} title="Remove">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
