import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

export default function ChangePassword() {
  const { changePassword, mustChangePassword, logout } = useAuth();
  const nav = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirmNext) {
      setError("New passwords don't match.");
      return;
    }
    if (next === current) {
      setError("New password must be different from the current one.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      nav("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-[var(--color-canvas-soft)]">
      <form onSubmit={onSubmit} className="card w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-blue)] text-white flex items-center justify-center">
            <KeyRound size={18} />
          </div>
          <div>
            <div className="eyebrow">Account</div>
            <h1 className="text-2xl font-bold leading-tight">
              {mustChangePassword ? "Set a new password" : "Change password"}
            </h1>
          </div>
        </div>

        {mustChangePassword && (
          <p className="editorial text-[var(--color-ink-soft)] mb-6">
            Welcome — let's set a real password before you go any further.
          </p>
        )}

        <label className="block text-sm font-semibold mb-1.5">Current password</label>
        <input
          type="password"
          className="input mb-4"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          autoFocus
          required
        />

        <label className="block text-sm font-semibold mb-1.5">New password</label>
        <input
          type="password"
          className="input mb-1"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-xs text-[var(--color-ink-soft)] mb-4">At least 8 characters.</p>

        <label className="block text-sm font-semibold mb-1.5">Confirm new password</label>
        <input
          type="password"
          className="input mb-6"
          value={confirmNext}
          onChange={(e) => setConfirmNext(e.target.value)}
          autoComplete="new-password"
          required
        />

        {error && (
          <div className="mb-4 text-sm text-[var(--color-coral)] bg-[var(--color-coral-soft)] px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Saving…" : "Save new password"}
        </button>

        {!mustChangePassword && (
          <button
            type="button"
            className="btn btn-ghost w-full mt-3"
            onClick={() => nav(-1)}
            disabled={busy}
          >
            Cancel
          </button>
        )}

        {mustChangePassword && (
          <button
            type="button"
            className="text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-coral)] mt-6 mx-auto block"
            onClick={() => { logout(); nav("/login", { replace: true }); }}
          >
            Sign out instead
          </button>
        )}
      </form>
    </div>
  );
}
