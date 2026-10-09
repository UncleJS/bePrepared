import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { clearActiveHouseholdCookie, setActiveHouseholdId } from "@/lib/api";
import { API_BASE } from "@/lib/apiBase";

const ACTIVE_HOUSEHOLD_COOKIE = "bp_active_household_id";

const TOKEN_KEY = "bp_token";
const USER_KEY = "bp_user";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  householdId: string;
  isAdmin: boolean;
};

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: AuthUser; token: string }
  | { status: "unauthenticated" };

type AuthContextValue = {
  state: AuthState;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  replaceToken: (token: string, user?: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = getStoredToken();
      if (!token) {
        if (!cancelled) setState({ status: "unauthenticated" });
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/users/me`, {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("session");
        const data = (await res.json()) as AuthUser;
        if (cancelled) return;
        const user: AuthUser = {
          id: data.id,
          username: data.username,
          email: data.email,
          householdId: data.householdId,
          isAdmin: data.isAdmin,
        };
        if (!user.isAdmin) clearActiveHouseholdCookie();
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        setState({ status: "authenticated", user, token });
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        clearActiveHouseholdCookie();
        if (!cancelled) setState({ status: "unauthenticated" });
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(username: string, password: string): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "Login failed");
      throw new Error(text);
    }
    const data = (await res.json()) as {
      token: string;
      id: string;
      username: string;
      email: string;
      householdId: string;
      isAdmin: boolean;
    };
    const user: AuthUser = {
      id: data.id,
      username: data.username,
      email: data.email,
      householdId: data.householdId,
      isAdmin: data.isAdmin,
    };
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (user.isAdmin) setActiveHouseholdId(user.householdId);
    else clearActiveHouseholdCookie();
    setState({ status: "authenticated", user, token: data.token });
  }

  function replaceToken(token: string, user?: Partial<AuthUser>) {
    localStorage.setItem(TOKEN_KEY, token);
    setState((prev) => {
      if (prev.status !== "authenticated") return prev;
      const nextUser = user ? { ...prev.user, ...user } : prev.user;
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      if (!nextUser.isAdmin) clearActiveHouseholdCookie();
      else if (user?.householdId) setActiveHouseholdId(nextUser.householdId);
      return { status: "authenticated", user: nextUser, token };
    });
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = `${ACTIVE_HOUSEHOLD_COOKIE}=; path=/; max-age=0; samesite=lax`;
    setState({ status: "unauthenticated" });
  }

  return (
    <AuthContext.Provider value={{ state, login, logout, replaceToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
