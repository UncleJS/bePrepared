import { chromium, expect, type FullConfig } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { loginViaUi } from "./fixtures/auth";
import {
  API_BASE_URL,
  AUTH_STATE_PATH,
  E2E_BASE_URL,
  getAdminPassword,
  requiredEnv,
  waitForUrl,
} from "./fixtures/env";

export default async function globalSetup(_config: FullConfig) {
  requiredEnv("DB_USER");
  requiredEnv("DB_PASSWORD");
  requiredEnv("DB_NAME");
  requiredEnv("AUTH_SECRET");
  getAdminPassword();

  await waitForUrl(`${API_BASE_URL}/health`, "API health endpoint");
  await waitForUrl(`${E2E_BASE_URL}/login`, "frontend login page");

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: E2E_BASE_URL });
  const page = await context.newPage();

  await loginViaUi(page);
  await expect(page).toHaveURL(/\/dashboard$/);

  await mkdir(dirname(AUTH_STATE_PATH), { recursive: true });
  await context.storageState({ path: AUTH_STATE_PATH });

  await browser.close();
}
