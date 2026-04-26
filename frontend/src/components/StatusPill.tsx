import type { EventStatus } from "../lib/api";

export default function StatusPill({ status }: { status: EventStatus }) {
  return <span className={`pill pill-${status}`}>{status}</span>;
}
