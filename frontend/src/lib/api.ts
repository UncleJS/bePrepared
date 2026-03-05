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

async function resolveServerOrigin(): Promise<string> {
  const configured = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");

  const { headers } = await import("next/headers");
  const incoming = await headers();
  const proto = incoming.get("x-forwarded-proto") ?? "http";
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:9999";
  return `${proto}://${host}`;
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
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${ACTIVE_HOUSEHOLD_COOKIE}=${encodeURIComponent(householdId)}; path=/; max-age=2592000; samesite=lax${secure}`;
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
  const base = typeof window === "undefined"
    ? `${await resolveServerOrigin()}/api/bff`
    : "/api/bff";
  const url = path.startsWith("http") ? path : `${base}${path}`;

  const headers = new Headers(options?.headers ?? undefined);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (typeof window === "undefined" && !headers.has("cookie")) {
    const { headers: nextHeaders } = await import("next/headers");
    const incoming = await nextHeaders();
    const cookie = incoming.get("cookie");
    if (cookie) headers.set("cookie", cookie);
  }

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
