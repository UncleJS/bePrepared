import { expect, test } from "@playwright/test";
import { createApiClient } from "../fixtures/api";

test("creates an inventory item and adds a lot from the UI", async ({ page }) => {
  const api = await createApiClient();
  const itemName = api.uniqueName("E2E water");
  const batchRef = api.uniqueName("batch");

  try {
    await page.goto("/inventory");

    const createSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Add Inventory Item", level: 2 }),
    });

    await createSection.locator('label:has-text("Item Name *") + input').fill(itemName);
    await createSection.locator('label:has-text("Unit") + input').fill("liters");
    await createSection.locator('label:has-text("Storage Location") + input').fill("E2E pantry");
    await page.getByRole("button", { name: "Add Item" }).click();

    await expect(page.getByText("Inventory item added.")).toBeVisible();

    const itemRow = page.locator("tr", { hasText: itemName }).first();
    await expect(itemRow).toBeVisible();
    await itemRow.getByRole("button", { name: "Lots" }).click();

    const lotSection = page.locator("section").filter({ hasText: `Lot Management: ${itemName}` });
    await lotSection.locator('label:has-text("Lot Quantity *") + input').fill("4");
    await lotSection.locator('label:has-text("Lot Acquired Date") + input').fill("2026-03-20");
    await lotSection.locator('label:has-text("Lot Expiry Date") + input').fill("2026-09-20");
    await lotSection.locator('label:has-text("Batch Reference") + input').fill(batchRef);
    await lotSection.getByRole("button", { name: "Add Lot" }).click();

    await expect(page.locator("tr", { hasText: batchRef }).first()).toBeVisible();
  } finally {
    const items = await api.listInventoryItems();
    const item = items.find((row) => row.name === itemName);
    if (item) {
      for (const lot of item.lots) {
        await api.archiveInventoryLot(item.id, lot.id);
      }
      await api.archiveInventoryItem(item.id);
    }

    await api.dispose();
  }
});
