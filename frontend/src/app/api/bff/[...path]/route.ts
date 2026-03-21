import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const API_BASE = (
  process.env.NEXTAUTH_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001"
).replace(/\/$/, "");

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "cookie",
]);

const ALLOWED_PREFIXES = [
  "users",
  "households",
  "modules",
  "tasks",
  "inventory",
  "equipment",
  "maintenance",
  "alerts",
  "admin",
  "planning",
  "settings",
] as const;

function isAllowedPath(path: string[]): boolean {
  const prefix = path[0];
  return (
    typeof prefix === "string" &&
    ALLOWED_PREFIXES.includes(prefix as (typeof ALLOWED_PREFIXES)[number])
  );
}

function upstreamUrl(path: string[], request: NextRequest): string {
  const suffix = path.join("/");
  const query = request.nextUrl.search;
  return `${API_BASE}/${suffix}${query}`;
}

function passThroughHeaders(request: NextRequest, apiToken: string): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
    if (key.toLowerCase() === "authorization") return;
    headers.set(key, value);
  });
  headers.set("authorization", `Bearer ${apiToken}`);
  return headers;
}

function responseHeaders(headers: Headers): Headers {
  const out = new Headers();
  headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
    out.set(key, value);
  });
  return out;
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  const apiToken = typeof token?.apiToken === "string" ? token.apiToken : null;
  if (!apiToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const { path } = await context.params;
  if (!isAllowedPath(path)) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const target = upstreamUrl(path, request);
  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  const upstream = await fetch(target, {
    method,
    headers: passThroughHeaders(request, apiToken),
    body,
    cache: "no-store",
    redirect: "manual",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders(upstream.headers),
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
