import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      nav("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full grid grid-cols-1 lg:grid-cols-2">
      <div className="bg-[var(--color-brand-blue)] text-white p-12 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white text-[var(--color-brand-blue)] flex items-center justify-center font-extrabold">
            360
          </div>
          <div className="font-bold text-lg">360 Events Aruba</div>
        </div>
        <div>
          <h1 className="text-5xl font-bold tracking-tight leading-tight">
            Every <span className="editorial text-[var(--color-gold)]">angle</span>,<br />
            every moment,<br />
            every <span className="editorial text-[var(--color-gold)]">celebration</span>.
          </h1>
          <p className="editorial text-white/70 mt-6 max-w-md">
            A visual identity system for Aruba's premier 360° video and photo experience company —
            capturing events from every perspective.
          </p>
        </div>
        <div className="text-xs text-white/50 tracking-widest uppercase">Brand · Operations · Crew</div>
      </div>

      <div className="flex items-center justify-center p-12 bg-[var(--color-canvas-soft)]">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <div className="eyebrow mb-2">Sign in</div>
          <h2 className="text-3xl font-bold mb-6">Welcome back.</h2>

          <label className="block text-sm font-semibold mb-1.5">Email</label>
          <input
            className="input mb-4"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />

          <label className="block text-sm font-semibold mb-1.5">Password</label>
          <input
            className="input mb-6"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="mb-4 text-sm text-[var(--color-coral)] bg-[var(--color-coral-soft)] px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-xs text-[var(--color-ink-soft)] mt-6 leading-relaxed">
            First-time setup uses the credentials in <code>backend/.env</code>. Change them after first sign-in.
          </p>
        </form>
      </div>
    </div>
  );
}
