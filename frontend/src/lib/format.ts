export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export const fmtDateTime = (iso: string) => `${fmtDate(iso)} · ${fmtTime(iso)}`;

export const fmtRange = (startIso: string, endIso: string) => {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) return `${fmtDate(startIso)} · ${fmtTime(startIso)} – ${fmtTime(endIso)}`;
  return `${fmtDateTime(startIso)} → ${fmtDateTime(endIso)}`;
};

export const fmtMoney = (cents: number | null | undefined) => {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
};

export const monthName = (m: number) =>
  new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" });

export const toLocalInputValue = (iso: string | Date) => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
