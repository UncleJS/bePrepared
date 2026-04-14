import { getStoredToken } from "@/contexts/AuthContext";

const ACTIVE_HOUSEHOLD_COOKIE = "bp_active_household_id";
const ACTIVE_HOUSEHOLD_EVENT = "bp:active-household-changed";

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:9996").replace(/\/$/, "");

export function readActiveHouseholdCookie(): string | null {
  const cookieId = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${ACTIVE_HOUSEHOLD_COOKIE}=`))
    ?.split("=")[1];
  return cookieId ? decodeURIComponent(cookieId) : null;
}

export function setActiveHouseholdId(householdId: string) {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${ACTIVE_HOUSEHOLD_COOKIE}=${encodeURIComponent(householdId)}; path=/; max-age=2592000; samesite=lax${secure}`;
  window.dispatchEvent(new CustomEvent<string>(ACTIVE_HOUSEHOLD_EVENT, { detail: householdId }));
}

export function clearActiveHouseholdCookie() {
  document.cookie = `${ACTIVE_HOUSEHOLD_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function onActiveHouseholdChange(callback: (householdId: string) => void): () => void {
  const handler = (event: Event) => {
    const custom = event as CustomEvent<string>;
    if (custom.detail) callback(custom.detail);
  };
  window.addEventListener(ACTIVE_HOUSEHOLD_EVENT, handler);
  return () => window.removeEventListener(ACTIVE_HOUSEHOLD_EVENT, handler);
}

export function resolveClientHouseholdId(user?: {
  householdId?: string;
  isAdmin?: boolean;
}): string | null {
  if (!user) return null;
  if (user.isAdmin) {
    const cookieId = readActiveHouseholdCookie();
    if (cookieId) return cookieId;
  }
  return user.householdId ?? null;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = new Headers(options?.headers ?? undefined);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const token = getStoredToken();
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, {
    cache: "no-store",
    headers,
    ...options,
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Clear all stored auth state and redirect to login
      localStorage.removeItem("bp_token");
      localStorage.removeItem("bp_user");
      clearActiveHouseholdCookie();
      const callbackUrl = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    }
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

/** Format a UTC ISO-8601 string as local YYYY-MM-DD HH:mm:ss */
export function fmtTs(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/** Format a date string (YYYY-MM-DD) for display */
export function fmtDate(date: string | null | undefined): string {
  if (!date) return "—";
  return date.slice(0, 10);
}

/** Days until a date (negative = overdue) */
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}
