import { defineConfig } from "@playwright/test";
import {
  API_BASE_URL,
  API_PORT,
  AUTH_STATE_PATH,
  E2E_BASE_URL,
  FRONTEND_PORT,
  requiredEnv,
} from "./fixtures/env";

requiredEnv("DB_USER");
requiredEnv("DB_PASSWORD");
requiredEnv("DB_NAME");
requiredEnv("AUTH_SECRET");
requiredEnv("SEED_ADMIN_PASSWORD");

const sharedEnv = {
  ...process.env,
  DB_HOST: process.env.DB_HOST ?? "127.0.0.1",
  DB_PORT: process.env.DB_PORT ?? "3306",
  DB_USER: requiredEnv("DB_USER"),
  DB_PASSWORD: requiredEnv("DB_PASSWORD"),
  DB_NAME: requiredEnv("DB_NAME"),
  PORT: API_PORT,
  API_PORT,
  FRONTEND_PORT,
  AUTH_ENABLED: "true",
  AUTH_SECRET: requiredEnv("AUTH_SECRET"),
  API_AUTH_SECRET: process.env.API_AUTH_SECRET ?? requiredEnv("AUTH_SECRET"),
  SEED_ADMIN_PASSWORD: requiredEnv("SEED_ADMIN_PASSWORD"),
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? E2E_BASE_URL,
  NEXTAUTH_API_URL: process.env.NEXTAUTH_API_URL ?? API_BASE_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? API_BASE_URL,
  CORS_ORIGINS: process.env.CORS_ORIGINS ?? E2E_BASE_URL,
  NODE_ENV: process.env.NODE_ENV ?? "test",
};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html"]],
  globalSetup: "./global.setup.ts",
  use: {
    baseURL: E2E_BASE_URL,
    storageState: AUTH_STATE_PATH,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1440, height: 960 },
  },
  webServer: [
    {
      command: "bun run --cwd ../api dev",
      url: `${API_BASE_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: sharedEnv,
    },
    {
      command: "bun run --cwd ../frontend dev:e2e",
      url: `${E2E_BASE_URL}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: sharedEnv,
    },
  ],
});
