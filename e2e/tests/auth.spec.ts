import { expect, request, test } from "@playwright/test";
import { loginViaUi } from "../fixtures/auth";
import { ADMIN_USERNAME, API_BASE_URL } from "../fixtures/env";

test.use({ storageState: { cookies: [], origins: [] } });

test("redirects unauthenticated dashboard visits to login", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard$/);
  await expect(page.locator("#username")).toBeVisible();
});

test("rejects invalid credentials at the API boundary", async () => {
  const api = await request.newContext({ baseURL: API_BASE_URL });

  try {
    const response = await api.post("/auth/login", {
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "10.0.0.254",
      },
      data: {
        username: ADMIN_USERNAME,
        password: "incorrect-password",
      },
    });

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "Invalid credentials" });
  } finally {
    await api.dispose();
  }
});

test("signs in and out with the seeded admin user", async ({ page }) => {
  await loginViaUi(page);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.locator('button[title="Sign out"]').click();

  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(page.locator("#username")).toBeVisible();
});
