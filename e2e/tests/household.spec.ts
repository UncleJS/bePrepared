import { expect, test } from "@playwright/test";
import { createApiClient } from "../fixtures/api";

test("updates household settings and persists the family size", async ({ page }) => {
  const api = await createApiClient();
  const household = await api.getHousehold();
  const originalTargetPeople = household.targetPeople;
  const nextTargetPeople = originalTargetPeople === 9 ? 8 : originalTargetPeople + 1;

  try {
    await page.goto("/settings/household");

    const familySizeInput = page.getByLabel("Family Size (People)");
    await familySizeInput.fill(String(nextTargetPeople));
    await page.getByRole("button", { name: "Save Household" }).click();

    await expect(page.getByText("Household settings updated.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Family Size (People)")).toHaveValue(String(nextTargetPeople));
  } finally {
    await api.updateHousehold({ targetPeople: originalTargetPeople });
    await api.dispose();
  }
});
