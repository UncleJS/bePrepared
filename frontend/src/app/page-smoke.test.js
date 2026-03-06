import { describe, expect, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("page smoke", () => {
  it("renders login page shell", async () => {
    mock.module("next/navigation", () => ({
      redirect: (url) => {
        throw Object.assign(new Error("NEXT_REDIRECT"), {
          digest: `NEXT_REDIRECT;replace;${url};307;`,
        });
      },
      notFound: () => {
        throw new Error("NEXT_NOT_FOUND");
      },
      useRouter: () => ({ push: () => {}, refresh: () => {} }),
      useSearchParams: () => ({ get: () => null }),
      usePathname: () => "/",
    }));
    mock.module("next-auth/react", () => ({
      signIn: async () => ({ ok: true }),
    }));
    mock.module("next-auth", () => ({
      default: () => ({
        handlers: {},
        signIn: async () => {},
        signOut: async () => {},
        auth: async () => null,
      }),
      AuthError: class AuthError extends Error {},
    }));
    mock.module("@/auth", () => ({
      signIn: async () => {},
      signOut: async () => {},
      auth: async () => null,
      handlers: {},
    }));

    const { default: LoginPage } = await import("./(auth)/login/page");
    // LoginPage is an async Server Component — call it directly and await the JSX
    const jsx = await LoginPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(jsx);

    expect(html).toContain("bePrepared");
    expect(html).toContain("Sign in");
  });

  it("renders dashboard page shell with client component placeholders", async () => {
    const realApi = await import("../lib/api");
    mock.module("@/lib/api", () => ({
      ...realApi,
      getSessionHouseholdId: async () => "household-1",
      apiFetch: async () => ({}),
    }));

    mock.module("next-auth/react", () => ({
      useSession: () => ({
        data: { user: { householdId: "household-1" } },
        status: "authenticated",
      }),
      getSession: async () => ({ user: { householdId: "household-1" } }),
    }));

    const { default: DashboardPage } = await import("./dashboard/page");
    const html = renderToStaticMarkup(await DashboardPage());

    // Server component renders the page heading; planning + alerts are client
    // components that show skeleton loaders in SSR (no useEffect/data in static render)
    expect(html).toContain("Dashboard");
    expect(html).toContain("Household readiness overview");
    // Skeleton placeholders confirm both client sections are mounted
    expect(html).toContain("animate-pulse");
  });

  it("renders tasks route loading shell", async () => {
    mock.module("@/lib/useActiveHouseholdId", () => ({
      useActiveHouseholdId: () => ({
        householdId: null,
        status: "loading",
        user: null,
      }),
    }));

    const { default: TasksPage } = await import("./tasks/page");
    const html = renderToStaticMarkup(createElement(TasksPage));

    expect(html).toContain("Loading session");
  });
});
