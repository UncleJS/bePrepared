import { expect, test } from "@playwright/test";
import { createApiClient } from "../fixtures/api";

test("opens a module detail page and shows seeded guidance content", async ({ page }) => {
  const api = await createApiClient();

  try {
    const modules = await api.listModules();
    const firstModule = modules[0];
    if (!firstModule) throw new Error("No seeded modules were returned by the API.");

    const detail = await api.getModuleDetail(firstModule.slug);
    const firstSection = detail.sections[0];
    if (!firstSection) throw new Error(`Module ${detail.slug} does not contain any sections.`);

    const firstDoc = firstSection.guidanceDocs[0];
    if (!firstDoc)
      throw new Error(`Module ${detail.slug} section ${firstSection.title} has no guidance docs.`);

    await page.goto("/modules");
    await expect(
      page.getByRole("heading", { name: "Preparedness Modules", level: 1 })
    ).toBeVisible();
    await page.getByRole("link", { name: new RegExp(firstModule.title) }).click();

    await expect(page).toHaveURL(new RegExp(`/modules/${detail.slug}$`));
    await expect(page.getByRole("heading", { name: detail.title, level: 1 })).toBeVisible();
    await expect(
      page.getByText(
        `${detail.sections.length} section${detail.sections.length !== 1 ? "s" : ""}`,
        {
          exact: false,
        }
      )
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: firstSection.title, level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: firstDoc.title, level: 3 })).toBeVisible();
    await expect(
      page
        .locator("pre")
        .filter({ hasText: firstDoc.body.slice(0, 40) })
        .first()
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to all modules" })).toBeVisible();
  } finally {
    await api.dispose();
  }
});
