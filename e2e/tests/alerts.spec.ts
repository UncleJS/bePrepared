import { expect, test } from "@playwright/test";
import { createApiClient } from "../fixtures/api";

function isoDateDaysFromToday(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

test("surfaces an expiry alert and lets an admin read and resolve it", async ({ page }) => {
  const api = await createApiClient();
  const itemName = api.uniqueName("E2E alert water");

  let itemId: string | null = null;
  let lotId: string | null = null;

  try {
    const item = await api.createInventoryItem({
      name: itemName,
      unit: "liters",
      location: "E2E shelf",
      isTrackedByExpiry: true,
    });
    itemId = item.id;

    const lot = await api.createInventoryLot(item.id, {
      qty: 4,
      acquiredAt: isoDateDaysFromToday(-2),
      expiresAt: isoDateDaysFromToday(-1),
      batchRef: api.uniqueName("batch"),
    });
    lotId = lot.id;

    await api.runAlertJob();

    const alertTitle = `Lot expiring: ${itemName}`;

    await page.goto("/alerts");
    await expect(page.getByRole("heading", { name: "Alerts" })).toBeVisible();

    const alertCard = page
      .locator("div", {
        has: page.getByText(alertTitle, { exact: true }),
      })
      .filter({ has: page.getByRole("button", { name: "Resolve" }) })
      .first();

    await expect(alertCard).toBeVisible();
    await alertCard.getByRole("button", { name: "Read" }).click();
    await expect(alertCard.getByText("read", { exact: true })).toBeVisible();

    await alertCard.getByRole("button", { name: "Resolve" }).click();
    await expect(
      page
        .locator("div", {
          has: page.getByText(alertTitle, { exact: true }),
        })
        .filter({ has: page.getByRole("button", { name: "Resolve" }) })
    ).toHaveCount(0);
    await expect(
      page.locator("section", { has: page.getByRole("heading", { name: "Resolved" }) })
    ).toContainText(alertTitle);

    const alerts = await api.listAlerts();
    const matchingAlert = alerts.find((row) => row.entityId === lot.id);
    if (matchingAlert) {
      await api.archiveAlert(matchingAlert.id);
    }
  } finally {
    if (itemId && lotId) {
      await api.archiveInventoryLot(itemId, lotId);
    }
    if (itemId) {
      await api.archiveInventoryItem(itemId);
    }
    await api.dispose();
  }
});
