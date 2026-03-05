import { describe, expect, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("page smoke", () => {
  it("renders login page shell", async () => {
    mock.module("next/navigation", () => ({
      useRouter: () => ({ push: () => {}, refresh: () => {} }),
      useSearchParams: () => ({ get: () => null }),
    }));
    mock.module("next-auth/react", () => ({
      signIn: async () => ({ ok: true }),
    }));

    const { default: LoginPage } = await import("./(auth)/login/page");
    const html = renderToStaticMarkup(createElement(LoginPage));

    expect(html).toContain("bePrepared");
    expect(html).toContain("Sign in");
  });

  it("renders dashboard page with fetched planning + alerts", async () => {
    const realApi = await import("../lib/api");
    mock.module("@/lib/api", () => ({
      ...realApi,
      getSessionHouseholdId: async () => "household-1",
      apiFetch: async (path) => {
        if (String(path).includes("/alerts/")) {
          return [
            { id: "a1", title: "Generator service due", severity: "due", isResolved: false },
            { id: "a2", title: "Water rotation overdue", severity: "overdue", isResolved: false },
          ];
        }
        return {
          people: { count: 4 },
          policy: {
            waterLitersPerPersonPerDay: 4,
            caloriesKcalPerPersonPerDay: 2200,
          },
          totals: {
            h72: { water: 48, calories: 26400 },
            d14: { water: 224, calories: 123200 },
            d30: { water: 480, calories: 264000 },
            d90: { water: 1440, calories: 792000 },
          },
        };
      },
    }));

    const { default: DashboardPage } = await import("./dashboard/page");
    const html = renderToStaticMarkup(await DashboardPage());

    expect(html).toContain("Dashboard");
    expect(html).toContain("Overdue Alerts");
    expect(html).toContain("Planning Targets");
    expect(html).toContain("Active Alerts");
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
