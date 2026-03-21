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

    const createSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Define Maintenance Schedule", level: 2 }),
    });

    await createSection
      .locator('label:has-text("Equipment Item") + select')
      .selectOption(equipment.id);
    await createSection.locator('label:has-text("Schedule Name") + input').fill(scheduleName);
    await createSection.locator('label:has-text("Interval (days)") + input').fill("45");
    await createSection.locator('label:has-text("Grace Period (days)") + input').fill("5");
    await createSection.locator('label:has-text("Next Due Date") + input').fill("2026-05-01");
    await createSection.getByRole("button", { name: "Create Schedule" }).click();

    await expect(page.getByText("Maintenance schedule created.")).toBeVisible();

    const row = page.locator("tr", { hasText: scheduleName }).first();
    await expect(row).toBeVisible();
    await expect(row.getByText(equipmentName, { exact: true })).toBeVisible();

    await row.getByRole("button", { name: "Edit" }).click();

    const editSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Edit Maintenance Schedule", level: 2 }),
    });
    await editSection.locator('label:has-text("Schedule Name") + input').fill(updatedScheduleName);
    await editSection.locator('label:has-text("Interval (days)") + input').fill("60");
    await editSection.locator('label:has-text("Last Done Date") + input').fill("2026-03-20");
    await editSection.locator('label:has-text("Next Due Date") + input').fill("2026-05-19");
    await editSection.getByRole("switch").click();
    await editSection.getByRole("button", { name: "Save" }).click();

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
