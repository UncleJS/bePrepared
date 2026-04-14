/**
 * shouldRedirectToLogin — pure helper used by RequireAuth and tests.
 *
 * Returns true when the auth state has no authenticated user and the app
 * should redirect to /login, false when the user is present and the route
 * should be allowed through.
 *
 * Accepts `unknown` so callers don't need to cast before calling — the
 * function is the narrow-guard.
 */
export function shouldRedirectToLogin(authState: unknown): boolean {
  if (authState === null || authState === undefined) return true;
  if (typeof authState !== "object") return true;
  const state = authState as Record<string, unknown>;
  return !state.user || typeof state.user !== "object" || state.user === null;
}
