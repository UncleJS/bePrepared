import { expect, test } from "@playwright/test";
import { createApiClient } from "../fixtures/api";

test("renders planning totals for shelter in place and evacuation", async ({ page }) => {
  const api = await createApiClient();

  try {
    const [shelter, evacuation] = await Promise.all([
      api.getPlanning("shelter_in_place"),
      api.getPlanning("evacuation"),
    ]);

    await page.goto("/planning");
    await expect(page.getByRole("heading", { name: "Planning Targets", level: 1 })).toBeVisible();

    const shelterSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Shelter in Place", level: 2 }),
    });
    await expect(
      shelterSection.getByText(`${shelter.people.count} people`, { exact: true })
    ).toBeVisible();
    await expect(
      shelterSection.getByText(`${shelter.policy.waterLitersPerPersonPerDay} L/p/day`, {
        exact: false,
      })
    ).toBeVisible();

    const evacuationSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Evacuation", level: 2 }),
    });
    await expect(
      evacuationSection.getByText(`${evacuation.people.count} people`, { exact: true })
    ).toBeVisible();
    await expect(
      evacuationSection.getByText(`${evacuation.policy.caloriesKcalPerPersonPerDay} kcal/p/day`, {
        exact: false,
      })
    ).toBeVisible();

    for (const label of ["72 Hours", "14 Days", "30 Days", "90 Days"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  } finally {
    await api.dispose();
  }
});
