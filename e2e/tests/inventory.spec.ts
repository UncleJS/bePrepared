import { expect, test } from "@playwright/test";
import { createApiClient } from "../fixtures/api";

test("creates an inventory item and adds a lot from the UI", async ({ page }) => {
  const api = await createApiClient();
  const itemName = api.uniqueName("E2E water");
  const batchRef = api.uniqueName("batch");

  try {
    await page.goto("/inventory");
    await page.getByRole("button", { name: "Add item" }).click();

    const createDialog = page.getByRole("dialog");
    await expect(createDialog.getByRole("heading", { name: "Add inventory item" })).toBeVisible();

    await createDialog.locator('label:has-text("Item Name *") + input').fill(itemName);
    await createDialog.locator('label:has-text("Unit") + input').fill("liters");
    await createDialog.locator('label:has-text("Storage Location") + input').fill("E2E pantry");
    await createDialog.getByRole("button", { name: "Add item" }).click();

    await expect(page.getByText("Inventory item added.")).toBeVisible();

    const itemRow = page.locator("tr", { hasText: itemName }).first();
    await expect(itemRow).toBeVisible();
    await itemRow.getByRole("button", { name: "Lots" }).click();

    await page.getByRole("button", { name: "Add lot" }).first().click();

    const lotDialog = page.getByRole("dialog");
    await expect(lotDialog.getByRole("heading", { name: "Add lot" })).toBeVisible();
    await lotDialog.locator('label:has-text("Lot Quantity *") + input').fill("4");
    await lotDialog.locator('label:has-text("Lot Acquired Date") + input').fill("2026-03-20");
    await lotDialog.locator('label:has-text("Lot Expiry Date") + input').fill("2026-09-20");
    await lotDialog.locator('label:has-text("Batch Reference") + input').fill(batchRef);
    await lotDialog.getByRole("button", { name: "Add lot" }).click();

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
