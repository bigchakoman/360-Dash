import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { api, ApiError, type CrewMember } from "../lib/api";
import { useToast } from "../lib/toast";
import { useConfirm } from "../lib/confirm";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import { fmtDate } from "../lib/format";

const blank = { name: "", phone: "", role: "", notes: "", active: true };

export default function Crew() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CrewMember | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setItems(await api.get<CrewMember[]>("/crew"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm(blank);
    setError(null);
    setOpen(true);
  }
  function openEdit(c: CrewMember) {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone,
      role: c.role ?? "",
      notes: c.notes ?? "",
      active: c.active,
    });
    setError(null);
    setOpen(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      role: form.role.trim() || null,
      notes: form.notes.trim() || null,
      active: form.active,
    };
    try {
      if (editing) {
        await api.patch<CrewMember>(`/crew/${editing.id}`, payload);
        toast.push("success", "Crew member updated");
      } else {
        await api.post<CrewMember>("/crew", payload);
        toast.push("success", "Crew member added");
      }
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: CrewMember) {
    const ok = await confirm({
      title: `Remove ${c.name}?`,
      body: "They'll be unassigned from any events that include them. This can't be undone.",
      confirmLabel: "Remove",
      kind: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/crew/${c.id}`);
      toast.push("success", "Removed");
      await load();
    } catch (err) {
      toast.push("error", err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Crew"
        tagline="Photographers, videographers, and the team that brings the moment to life."
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Add crew
          </button>
        }
      />

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-canvas-soft)] text-left">
            <tr className="text-[11px] uppercase tracking-wider text-[var(--color-ink-soft)]">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">WhatsApp</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Added</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="px-5 py-6 text-[var(--color-ink-soft)]" colSpan={6}>Loading…</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td className="px-5 py-10 text-center text-[var(--color-ink-soft)]" colSpan={6}>
                No crew yet. Add your first teammate.
              </td></tr>
            )}
            {items.map((c) => (
              <tr key={c.id} className="border-t border-[var(--color-line)]">
                <td className="px-5 py-3 font-semibold">{c.name}</td>
                <td className="px-5 py-3 text-[var(--color-ink-soft)]">{c.role ?? "—"}</td>
                <td className="px-5 py-3 font-mono text-xs">{c.phone}</td>
                <td className="px-5 py-3">
                  {c.active ? (
                    <span className="inline-flex items-center gap-1 text-[var(--color-brand-blue)] text-xs font-semibold">
                      <UserCheck size={14} /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[var(--color-ink-soft)] text-xs font-semibold">
                      <UserX size={14} /> Inactive
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-[var(--color-ink-soft)] text-xs">{fmtDate(c.created_at)}</td>
                <td className="px-5 py-3 text-right">
                  <button className="btn btn-ghost mr-2" onClick={() => openEdit(c)}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button className="btn btn-danger" onClick={() => remove(c)}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit crew member" : "Add crew member"}>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">WhatsApp number (E.164)</label>
            <input
              className="input"
              placeholder="+13055551234"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
            <p className="text-xs text-[var(--color-ink-soft)] mt-1">Include country code, e.g. +297 for Aruba.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Role</label>
            <input className="input" placeholder="Photographer, videographer, glam-bot operator…" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Notes</label>
            <textarea className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active
          </label>
          {error && <div className="text-sm text-[var(--color-coral)]">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
