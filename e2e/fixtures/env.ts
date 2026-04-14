import path from "node:path";

export const FRONTEND_PORT = process.env.FRONTEND_PORT ?? "9998";
export const API_PORT = process.env.API_PORT ?? "3002";
export const E2E_BASE_URL = process.env.FRONTEND_URL ?? `http://127.0.0.1:${FRONTEND_PORT}`;
export const API_BASE_URL = process.env.VITE_API_URL ?? `http://127.0.0.1:${API_PORT}`;
export const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "admin";
export const AUTH_STATE_PATH = path.resolve(process.cwd(), ".auth/admin.json");

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for E2E tests.`);
  }
  return value;
}

export function getAdminPassword(): string {
  return requiredEnv("SEED_ADMIN_PASSWORD");
}

export async function waitForUrl(url: string, label: string, timeoutMs = 120_000): Promise<void> {
  const startedAt = Date.now();
  let lastError = "unknown error";

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.ok || (response.status >= 300 && response.status < 400)) {
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for ${label} at ${url}: ${lastError}`);
}
