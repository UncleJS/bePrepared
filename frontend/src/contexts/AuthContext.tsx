import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:9996").replace(/\/$/, "");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const token = getStoredToken();
    const user = getStoredUser();
    if (token && user) {
      setState({ status: "authenticated", user, token });
    } else {
      setState({ status: "unauthenticated" });
    }
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
    setState({ status: "authenticated", user, token: data.token });
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = `${ACTIVE_HOUSEHOLD_COOKIE}=; path=/; max-age=0; samesite=lax`;
    setState({ status: "unauthenticated" });
  }

  return <AuthContext.Provider value={{ state, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
