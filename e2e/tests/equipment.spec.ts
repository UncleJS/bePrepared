import { expect, test } from "@playwright/test";
import { createApiClient } from "../fixtures/api";

test("creates, archives, and restores an equipment item", async ({ page }) => {
  const api = await createApiClient();
  const itemName = api.uniqueName("E2E radio");

  try {
    await page.goto("/equipment");

    const createSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Add Equipment Item", level: 2 }),
    });

    await createSection.locator('label:has-text("Equipment Name *") + input').fill(itemName);
    await createSection.locator('label:has-text("Model") + input').fill("FRS-1");
    await createSection.locator('label:has-text("Storage Location") + input').fill("E2E shelf");
    await createSection
      .locator('label:has-text("Operational Status") + select')
      .selectOption("needs_service");
    await createSection.locator('label:has-text("Acquired Date") + input').fill("2026-03-20");
    await page.getByRole("button", { name: "Add Item" }).click();

    await expect(page.getByText("Equipment item added.")).toBeVisible();

    const activeRow = page.locator("tr", { hasText: itemName }).first();
    await expect(activeRow).toBeVisible();
    await expect(activeRow.getByText("needs service", { exact: true })).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await activeRow.getByRole("button", { name: "Archive" }).click();
    await expect(page.getByText("Equipment item archived.")).toBeVisible();

    await page.getByRole("button", { name: "Show archived" }).click();
    const archivedRow = page.locator("tr", { hasText: itemName }).first();
    await expect(archivedRow).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await archivedRow.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByText("Equipment item restored.")).toBeVisible();
    await expect(page.locator("tr", { hasText: itemName }).first()).toBeVisible();
  } finally {
    const archivedRows = await api.listEquipmentItems(true);
    const archivedItem = archivedRows.find((row) => row.name === itemName);
    if (archivedItem) {
      await api.restoreEquipmentItem(archivedItem.id);
    }

    const activeRows = await api.listEquipmentItems(false);
    const activeItem = activeRows.find((row) => row.name === itemName);
    if (activeItem) {
      await api.archiveEquipmentItem(activeItem.id);
    }

    await api.dispose();
  }
});
