/**
 * serve.ts — bePrepared frontend static server
 * Serves Vite's dist/ output with SPA fallback for client-side routing.
 * Used by the prod container (deploy/Containerfile.frontend).
 */
import { join } from "node:path";

const PORT = Number(process.env.PORT ?? 9999);
const DIST = join(import.meta.dir, "dist");

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(req) {
    const pathname = new URL(req.url).pathname;
    const file = Bun.file(join(DIST, pathname));

    if (await file.exists()) {
      return new Response(file);
    }

    // SPA fallback — let React Router handle the route
    return new Response(Bun.file(join(DIST, "index.html")));
  },
});

console.log(`bePrepared frontend serving on http://0.0.0.0:${server.port}`);
