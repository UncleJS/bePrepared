/**
 * isProtectedPath — pure helper that decides whether a URL pathname requires
 * authentication.
 *
 * Rules (evaluated in order):
 *  1. Exact public paths (e.g. /favicon.ico) → not protected.
 *  2. Paths that start with a known public prefix → not protected.
 *  3. Everything else → protected.
 *
 * Legacy /_next/* prefixes are kept in the public list so that any cached
 * middleware configuration from older deployments continues to behave
 * correctly and tests remain stable across the Next.js → Vite migration.
 */

const PUBLIC_PREFIXES: readonly string[] = [
  "/login",
  "/api/",
  "/auth/",
  "/_next/", // retained for legacy compatibility
];

const PUBLIC_EXACT: readonly string[] = ["/favicon.ico"];

export function isProtectedPath(pathname: string): boolean {
  if (PUBLIC_EXACT.includes(pathname)) return false;
  return !PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
