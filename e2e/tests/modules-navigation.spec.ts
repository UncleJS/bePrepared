import { expect, test } from "@playwright/test";
import { createApiClient } from "../fixtures/api";

test("handles module back navigation and missing module slugs", async ({ page }) => {
  const api = await createApiClient();

  try {
    const modules = await api.listModules();
    const firstModule = modules[0];
    if (!firstModule) throw new Error("No seeded modules were returned by the API.");

    await page.goto(`/modules/${firstModule.slug}`);
    await expect(page.getByRole("heading", { name: firstModule.title, level: 1 })).toBeVisible();

    await page.getByRole("link", { name: "Back to all modules" }).click();
    await expect(page).toHaveURL(/\/modules$/);
    await expect(
      page.getByRole("heading", { name: "Preparedness Modules", level: 1 })
    ).toBeVisible();

    const response = await page.goto(`/modules/${api.uniqueName("missing-module")}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByText("This page could not be found.", { exact: true })).toBeVisible();
  } finally {
    await api.dispose();
  }
});
