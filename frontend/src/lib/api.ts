const TOKEN_KEY = "360dash.token";

// In dev, Vite proxies /api → http://127.0.0.1:8000 (see vite.config.ts).
// In prod, set VITE_API_BASE to the absolute backend URL (e.g. https://api.360events.app).
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: { auth?: boolean } = { auth: true }
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth !== false) {
    const t = tokenStore.get();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && opts.auth !== false) {
    tokenStore.clear();
    if (!location.pathname.startsWith("/login")) location.href = "/login";
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const detail = (data && (data.detail || data.message)) || res.statusText;
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail), data);
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>("GET", p),
  post: <T>(p: string, b?: unknown) => request<T>("POST", p, b),
  patch: <T>(p: string, b?: unknown) => request<T>("PATCH", p, b),
  delete: <T = void>(p: string) => request<T>("DELETE", p),

  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>(
      "POST",
      "/auth/login",
      { email, password },
      { auth: false }
    ),
};

// --- Domain types (mirror backend Pydantic schemas) ---
export type EventStatus = "upcoming" | "completed" | "cancelled";
export type ConfirmationStatus = "pending" | "confirmed" | "declined";

export interface CrewMember {
  id: number;
  name: string;
  phone: string;
  role: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface EquipmentTag {
  id: number;
  name: string;
  category: string | null;
  created_at: string;
}

export interface CrewAssignment {
  crew_member: CrewMember;
  assigned_at: string;
  notified_at: string | null;
  notification_sid: string | null;
  notification_error: string | null;
  confirmation_status: ConfirmationStatus;
}

export interface EquipmentLink {
  tag: EquipmentTag;
}

export interface EventListItem {
  id: number;
  title: string;
  client_name: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  status: EventStatus;
}

export interface EventDetail extends EventListItem {
  description: string | null;
  price_cents: number | null;
  created_at: string;
  updated_at: string;
  crew_assignments: CrewAssignment[];
  equipment_links: EquipmentLink[];
}

export interface TopItem { id: number; name: string; count: number; }

export interface MonthSummary {
  year: number;
  month: number;
  event_count: number;
  total_hours: number;
  revenue_cents: number;
  avg_event_hours: number;
  top_crew: TopItem[];
  top_equipment: TopItem[];
}

export interface YearMonthBreakdown {
  month: number;
  event_count: number;
  total_hours: number;
  revenue_cents: number;
}

export interface YearSummary {
  year: number;
  event_count: number;
  total_hours: number;
  revenue_cents: number;
  by_month: YearMonthBreakdown[];
  top_crew: TopItem[];
  top_equipment: TopItem[];
}
