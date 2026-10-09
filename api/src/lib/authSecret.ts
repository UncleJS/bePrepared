const PLACEHOLDER_SECRETS = new Set([
  "replace-with-a-random-secret",
  "changeme",
  "secret",
  "password",
]);

const TEST_ONLY_SECRETS = new Set(["e2e-auth-secret"]);

const MIN_SECRET_LENGTH = 32;

export function assertAcceptableAuthSecret(secret: string | undefined, nodeEnv: string): void {
  if (!secret || !secret.trim()) {
    throw new Error("API auth is enabled but API_AUTH_SECRET/AUTH_SECRET is not set.");
  }

  if (nodeEnv.toLowerCase() === "test") return;

  const normalized = secret.trim().toLowerCase();
  if (PLACEHOLDER_SECRETS.has(normalized) || TEST_ONLY_SECRETS.has(normalized)) {
    throw new Error(
      "API_AUTH_SECRET/AUTH_SECRET is a known placeholder and cannot be used outside test."
    );
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `API_AUTH_SECRET/AUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`
    );
  }
}
