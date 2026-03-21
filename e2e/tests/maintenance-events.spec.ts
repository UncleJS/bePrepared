import { expect, test } from "@playwright/test";
import { createApiClient } from "../fixtures/api";

test("records maintenance event history and refreshes schedule dates", async ({ page }) => {
  const api = await createApiClient();
  const equipmentName = api.uniqueName("E2E pump");
  const scheduleName = api.uniqueName("Filter service");

  let equipmentId: string | null = null;
  let scheduleId: string | null = null;

  try {
    const equipment = await api.createEquipmentItem({
      name: equipmentName,
      location: "Workshop",
      status: "operational",
    });
    equipmentId = equipment.id;

    const schedule = await api.createMaintenanceSchedule(equipment.id, {
      name: scheduleName,
      calDays: 30,
      graceDays: 3,
      nextDueAt: "2026-03-15",
    });
    scheduleId = schedule.id;

    const event = await api.createMaintenanceEvent(schedule.id, {
      performedAt: "2026-03-20",
      performedBy: "E2E Runner",
      notes: "Verified pressure output",
    });

    const events = await api.listMaintenanceEvents(schedule.id);
    expect(events.some((row) => row.id === event.id)).toBe(true);

    await page.goto("/maintenance");
    const row = page.locator("tr", { hasText: scheduleName }).first();

    await expect(row).toBeVisible();
    await expect(row.getByText(equipmentName, { exact: true })).toBeVisible();
    await expect(row.getByText("2026-03-20", { exact: true })).toBeVisible();
    await expect(row.getByText("2026-04-19", { exact: true })).toBeVisible();
  } finally {
    if (scheduleId) {
      await api.archiveMaintenanceSchedule(scheduleId);
    }
    if (equipmentId) {
      await api.archiveEquipmentItem(equipmentId);
    }
    await api.dispose();
  }
});
