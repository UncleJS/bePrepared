const API_BASE_SERVER =
  process.env.NEXTAUTH_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const ACTIVE_HOUSEHOLD_COOKIE = "bp_active_household_id";
const ACTIVE_HOUSEHOLD_EVENT = "bp:active-household-changed";

function readActiveHouseholdCookie(): string | null {
  if (typeof window === "undefined") return null;
  const cookieId = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${ACTIVE_HOUSEHOLD_COOKIE}=`))
    ?.split("=")[1];
  return cookieId ? decodeURIComponent(cookieId) : null;
}

async function resolveApiToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    const { auth } = await import("@/auth");
    const session = await auth();
    return (session?.user as { apiToken?: string } | undefined)?.apiToken ?? null;
  }

  const { getSession } = await import("next-auth/react");
  const session = await getSession();
  return (session?.user as { apiToken?: string } | undefined)?.apiToken ?? null;
}

export async function getSessionHouseholdId(): Promise<string | null> {
  if (typeof window === "undefined") {
    const { auth } = await import("@/auth");
    const { cookies } = await import("next/headers");
    const session = await auth();
    const user = session?.user as { householdId?: string; isAdmin?: boolean } | undefined;
    const cookieStore = await cookies();
    const cookieId = cookieStore.get(ACTIVE_HOUSEHOLD_COOKIE)?.value;
    if (user?.isAdmin && cookieId) return cookieId;
    return user?.householdId ?? null;
  }

  const { getSession } = await import("next-auth/react");
  const session = await getSession();
  const user = session?.user as { householdId?: string; isAdmin?: boolean } | undefined;
  const cookieId = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${ACTIVE_HOUSEHOLD_COOKIE}=`))
    ?.split("=")[1];
  if (user?.isAdmin && cookieId) return decodeURIComponent(cookieId);
  return user?.householdId ?? null;
}

export function setActiveHouseholdId(householdId: string) {
  document.cookie = `${ACTIVE_HOUSEHOLD_COOKIE}=${encodeURIComponent(householdId)}; path=/; max-age=2592000; samesite=lax`;
  window.dispatchEvent(new CustomEvent<string>(ACTIVE_HOUSEHOLD_EVENT, { detail: householdId }));
}

export function onActiveHouseholdChange(callback: (householdId: string) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<string>;
    if (custom.detail) callback(custom.detail);
  };
  window.addEventListener(ACTIVE_HOUSEHOLD_EVENT, handler);
  return () => window.removeEventListener(ACTIVE_HOUSEHOLD_EVENT, handler);
}

export function resolveClientHouseholdId(user?: { householdId?: string; isAdmin?: boolean }): string | null {
  if (!user) return null;
  if (user.isAdmin) {
    const cookieId = readActiveHouseholdCookie();
    if (cookieId) return cookieId;
  }
  return user.householdId ?? null;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = typeof window === "undefined" ? API_BASE_SERVER : "/api";
  const url = path.startsWith("http") ? path : `${base}${path}`;

  const token = await resolveApiToken();
  const headers = new Headers(options?.headers ?? undefined);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, {
    cache: "no-store",
    headers,
    ...options,
  });
  if (!res.ok) {
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
