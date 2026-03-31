import { expect, test } from "@playwright/test";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("navigates through the primary application sections", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  const navCases = [
    { href: "/modules", heading: "Preparedness Modules" },
    { href: "/tasks", heading: "Ticksheets" },
    { href: "/supplies", heading: "Supplies" },
    { href: "/maintenance", heading: "Maintenance" },
    { href: "/alerts", heading: "Alerts" },
  ];

  for (const navCase of navCases) {
    await page.locator(`nav a[href="${navCase.href}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${escapeRegex(navCase.href)}(?:\\?.*)?$`));
    await expect(
      page.getByRole("heading", { name: navCase.heading, exact: true, level: 1 })
    ).toBeVisible();
  }

  await page.getByRole("button", { name: /settings/i }).click();
  await page.locator('nav a[href="/settings/household"]').click();
  await expect(page).toHaveURL(/\/settings\/household$/);
  await expect(
    page.getByRole("heading", { name: "Household", exact: true, level: 1 })
  ).toBeVisible();
});
