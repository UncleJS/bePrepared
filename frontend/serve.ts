/**
 * serve.ts — bePrepared frontend static server
 * Serves Vite's dist/ output with SPA fallback for client-side routing.
 * Used by the prod container (deploy/Containerfile.frontend).
 */
import { join } from "node:path";

const PORT = Number(process.env.PORT ?? 9999);
const DIST = join(import.meta.dir, "dist");

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http: https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
};

function withSecurity(body: BodyInit | null, status = 200, extra?: HeadersInit): Response {
  const headers = new Headers(extra);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  return new Response(body, { status, headers });
}

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(req) {
    const pathname = new URL(req.url).pathname;
    const file = Bun.file(join(DIST, pathname));

    if (await file.exists()) {
      return withSecurity(file);
    }

    return withSecurity(Bun.file(join(DIST, "index.html")));
  },
});

console.log(`bePrepared frontend serving on http://0.0.0.0:${server.port}`);
