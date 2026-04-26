import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiError, type EquipmentTag } from "../lib/api";
import { useToast } from "../lib/toast";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";

const blank = { name: "", category: "" };

export default function Equipment() {
  const toast = useToast();
  const [items, setItems] = useState<EquipmentTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EquipmentTag | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try { setItems(await api.get<EquipmentTag[]>("/equipment")); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const g: Record<string, EquipmentTag[]> = {};
    for (const t of items) {
      const k = t.category || "Uncategorized";
      (g[k] ||= []).push(t);
    }
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  function openNew() {
    setEditing(null);
    setForm(blank);
    setError(null);
    setOpen(true);
  }
  function openEdit(t: EquipmentTag) {
    setEditing(t);
    setForm({ name: t.name, category: t.category ?? "" });
    setError(null);
    setOpen(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = { name: form.name.trim(), category: form.category.trim() || null };
    try {
      if (editing) {
        await api.patch<EquipmentTag>(`/equipment/${editing.id}`, payload);
        toast.push("success", "Tag updated");
      } else {
        await api.post<EquipmentTag>("/equipment", payload);
        toast.push("success", "Tag added");
      }
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally { setBusy(false); }
  }

  async function remove(t: EquipmentTag) {
    if (!confirm(`Remove "${t.name}"? It will be removed from any events that used it.`)) return;
    try {
      await api.delete(`/equipment/${t.id}`);
      toast.push("success", "Removed");
      await load();
    } catch (err) {
      toast.push("error", err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Equipment"
        tagline="Tag the gear used at each event — cameras, backgrounds, glam, lighting."
        actions={<button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Add tag</button>}
      />

      {loading && <div className="card text-[var(--color-ink-soft)]">Loading…</div>}

      {!loading && grouped.length === 0 && (
        <div className="card text-center text-[var(--color-ink-soft)] py-12">
          No equipment yet. Add your first tag — for example "Insta360 X4" under category "Camera".
        </div>
      )}

      <div className="space-y-6">
        {grouped.map(([cat, tags]) => (
          <div key={cat} className="card">
            <div className="eyebrow mb-3">{cat}</div>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <div key={t.id} className="group inline-flex items-center gap-2 pl-3 pr-1 py-1 rounded-full bg-[var(--color-canvas-soft)] border border-[var(--color-line)]">
                  <span className="text-sm font-semibold">{t.name}</span>
                  <button className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-white rounded-full" onClick={() => openEdit(t)} title="Edit">
                    <Pencil size={12} />
                  </button>
                  <button className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-[var(--color-coral-soft)] rounded-full text-[var(--color-coral)]" onClick={() => remove(t)} title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit tag" : "Add equipment tag"}>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Category</label>
            <input className="input" placeholder="Camera, background, lighting, glam…" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
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
