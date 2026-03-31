import { expect, test } from "@playwright/test";
import { createApiClient } from "../fixtures/api";

test("creates and updates a maintenance schedule for an equipment item", async ({ page }) => {
  const api = await createApiClient();
  const equipmentName = api.uniqueName("E2E generator");
  const scheduleName = api.uniqueName("Oil change");
  const updatedScheduleName = `${scheduleName} updated`;

  let equipmentId: string | null = null;

  try {
    const equipment = await api.createEquipmentItem({
      name: equipmentName,
      location: "Garage bay",
      status: "operational",
    });
    equipmentId = equipment.id;

    await page.goto("/maintenance");
    await expect(page.getByRole("heading", { name: "Maintenance", level: 1 })).toBeVisible();

    await page.getByRole("button", { name: "Add schedule" }).first().click();

    const createDialog = page.getByRole("dialog");
    await expect(
      createDialog.getByRole("heading", { name: "Define maintenance schedule" })
    ).toBeVisible();

    await createDialog
      .locator('label:has-text("Equipment Item") + select')
      .selectOption(equipment.id);
    await createDialog.locator('label:has-text("Schedule Name") + input').fill(scheduleName);
    await createDialog.locator('label:has-text("Interval (days)") + input').fill("45");
    await createDialog.locator('label:has-text("Grace Period (days)") + input').fill("5");
    await createDialog.locator('label:has-text("Next Due Date") + input').fill("2026-05-01");
    await createDialog.getByRole("button", { name: "Create schedule" }).click();

    await expect(page.getByText("Maintenance schedule created.")).toBeVisible();

    const row = page.locator("tr", { hasText: scheduleName }).first();
    await expect(row).toBeVisible();
    await expect(row.getByText(equipmentName, { exact: true })).toBeVisible();

    await row.getByRole("button", { name: "Edit" }).click();

    const editDialog = page.getByRole("dialog");
    await expect(
      editDialog.getByRole("heading", { name: "Edit maintenance schedule" })
    ).toBeVisible();
    await editDialog.locator('label:has-text("Schedule Name") + input').fill(updatedScheduleName);
    await editDialog.locator('label:has-text("Interval (days)") + input').fill("60");
    await editDialog.locator('label:has-text("Last Done Date") + input').fill("2026-03-20");
    await editDialog.locator('label:has-text("Next Due Date") + input').fill("2026-05-19");
    await editDialog.getByRole("switch").click();
    await editDialog.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Maintenance schedule updated.")).toBeVisible();
    const updatedRow = page.locator("tr", { hasText: updatedScheduleName }).first();
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow.getByText("Inactive", { exact: true })).toBeVisible();
  } finally {
    const schedules = await api.listMaintenanceSchedules();
    const matching = schedules.filter(
      (row) => row.name === scheduleName || row.name === updatedScheduleName
    );
    for (const schedule of matching) {
      await api.archiveMaintenanceSchedule(schedule.id);
    }

    if (equipmentId) {
      await api.archiveEquipmentItem(equipmentId);
    }

    await api.dispose();
  }
});
