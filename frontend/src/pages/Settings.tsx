import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarCheck, CalendarX, ExternalLink, Link2Off } from "lucide-react";
import { api, ApiError, type GoogleCalendarStatus } from "../lib/api";
import { useToast } from "../lib/toast";
import { useConfirm } from "../lib/confirm";
import PageHeader from "../components/PageHeader";

export default function Settings() {
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function load() {
    try {
      setStatus(await api.googleStatus());
    } catch {
      setStatus({ connected: false, owner_email: null, calendar_id: null });
    }
  }

  useEffect(() => {
    load();
    // Show success toast after OAuth redirect
    if (params.get("connected") === "1") {
      toast.push("success", "Google Calendar connected!");
      setParams({}, { replace: true });
    }
  }, []);

  async function connect() {
    setConnecting(true);
    try {
      const { auth_url } = await api.googleConnect();
      window.location.href = auth_url;
    } catch (err) {
      toast.push("error", err instanceof ApiError ? err.message : "Could not start Google auth");
      setConnecting(false);
    }
  }

  async function disconnect() {
    const ok = await confirm({
      title: "Disconnect Google Calendar?",
      body: "New events won't be synced. Existing calendar events won't be deleted.",
      confirmLabel: "Disconnect",
      kind: "danger",
    });
    if (!ok) return;
    setDisconnecting(true);
    try {
      await api.googleDisconnect();
      toast.push("success", "Disconnected");
      await load();
    } catch (err) {
      toast.push("error", err instanceof ApiError ? err.message : "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        tagline="Integrations and account configuration."
      />

      <div className="max-w-2xl space-y-6">
        {/* Google Calendar card */}
        <div className="card">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="eyebrow mb-1">Integration</div>
              <h2 className="text-lg font-bold">Google Calendar</h2>
              <p className="text-sm text-[var(--color-ink-soft)] mt-1">
                When connected, every event you create in this dashboard automatically appears
                in the owner's Google Calendar. Adding crew sends them a calendar invite with
                all the details — no more manual emails.
              </p>
            </div>
            <div className="shrink-0 mt-1">
              {status?.connected ? (
                <CalendarCheck size={32} className="text-[var(--color-brand-blue)]" />
              ) : (
                <CalendarX size={32} className="text-[var(--color-ink-soft)]" />
              )}
            </div>
          </div>

          {status === null && (
            <div className="text-sm text-[var(--color-ink-soft)]">Loading…</div>
          )}

          {status !== null && !status.connected && (
            <div>
              <p className="text-sm text-[var(--color-ink-soft)] mb-4">
                <strong>Before you connect</strong>, make sure you've set{" "}
                <code className="bg-[var(--color-canvas-soft)] px-1 rounded text-xs">GOOGLE_CLIENT_ID</code> and{" "}
                <code className="bg-[var(--color-canvas-soft)] px-1 rounded text-xs">GOOGLE_CLIENT_SECRET</code>{" "}
                in your <code className="bg-[var(--color-canvas-soft)] px-1 rounded text-xs">.env</code> file (from Google Cloud Console).
              </p>
              <button
                className="btn btn-primary"
                onClick={connect}
                disabled={connecting}
              >
                <ExternalLink size={15} />
                {connecting ? "Opening Google…" : "Connect Google Calendar"}
              </button>
            </div>
          )}

          {status !== null && status.connected && (
            <div className="space-y-3">
              <div className="flex flex-col gap-1 text-sm p-3 rounded-lg bg-[var(--color-canvas-soft)]">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-ink-soft)]">Connected as</span>
                  <span className="font-semibold">{status.owner_email ?? "unknown"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-ink-soft)]">Calendar</span>
                  <span className="font-semibold">{status.calendar_id ?? "primary"}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  className="btn btn-ghost"
                  onClick={connect}
                  disabled={connecting}
                >
                  <ExternalLink size={14} />
                  {connecting ? "Opening Google…" : "Reconnect / change account"}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={disconnect}
                  disabled={disconnecting}
                >
                  <Link2Off size={14} />
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Setup guide */}
        {status !== null && !status.connected && (
          <div className="card bg-[var(--color-canvas-soft)]">
            <div className="eyebrow mb-2">Setup guide</div>
            <ol className="text-sm space-y-2 text-[var(--color-ink)] list-decimal list-inside">
              <li>Go to <strong>Google Cloud Console</strong> → create a project (or use an existing one).</li>
              <li>Enable the <strong>Google Calendar API</strong> for the project.</li>
              <li>Under <strong>OAuth consent screen</strong>, add your email as a test user.</li>
              <li>Under <strong>Credentials</strong>, create an <strong>OAuth 2.0 Client ID</strong> (Web application).</li>
              <li>
                Add your authorized redirect URI:
                <br />
                <code className="block mt-1 bg-white px-2 py-1 rounded text-xs border border-[var(--color-line)]">
                  https://dash.360eventsaruba.com/api/auth/google/callback
                </code>
                <span className="text-xs text-[var(--color-ink-soft)]">(or <code>http://localhost:8000/auth/google/callback</code> for local dev)</span>
              </li>
              <li>Copy the Client ID and Client Secret into your <code>.env</code> file.</li>
              <li>Restart the backend, then click <strong>Connect Google Calendar</strong> above.</li>
            </ol>
          </div>
        )}
      </div>
    </>
  );
}
