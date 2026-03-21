import { expect, type Page } from "@playwright/test";
import { ADMIN_USERNAME, E2E_BASE_URL, getAdminPassword } from "./env";

type LoginOptions = {
  username?: string;
  password?: string;
  callbackUrl?: string;
};

export async function loginViaUi(page: Page, options: LoginOptions = {}) {
  const username = options.username ?? ADMIN_USERNAME;
  const password = options.password ?? getAdminPassword();
  const callbackUrl = options.callbackUrl;
  const loginUrl = callbackUrl
    ? `${E2E_BASE_URL}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : `${E2E_BASE_URL}/login`;

  await page.goto(loginUrl);
  await expect(page.locator("#username")).toBeVisible();
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}
