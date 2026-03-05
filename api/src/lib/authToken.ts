import { createHmac, timingSafeEqual } from "crypto";

export type ApiTokenClaims = {
  sub: string;
  username: string;
  householdId: string;
  isAdmin: boolean;
  iat: number;
  exp: number;
};

const encoder = new TextEncoder();

function b64urlEncode(input: string | Uint8Array): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input);
  return buf.toString("base64url");
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signRaw(data: string, secret: string): string {
  return createHmac("sha256", secret).update(encoder.encode(data)).digest("base64url");
}

export function issueApiToken(
  payload: Pick<ApiTokenClaims, "sub" | "username" | "householdId" | "isAdmin">,
  secret: string,
  ttlSeconds: number
): string {
  const now = Math.floor(Date.now() / 1000);
  const claims: ApiTokenClaims = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };
  const header = { alg: "HS256", typ: "JWT" };
  const h = b64urlEncode(JSON.stringify(header));
  const p = b64urlEncode(JSON.stringify(claims));
  const s = signRaw(`${h}.${p}`, secret);
  return `${h}.${p}.${s}`;
}

export function verifyApiToken(token: string, secret: string): ApiTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = signRaw(`${h}.${p}`, secret);
  const lhs = Buffer.from(s);
  const rhs = Buffer.from(expected);
  if (lhs.length !== rhs.length || !timingSafeEqual(lhs, rhs)) return null;

  try {
    const parsed = JSON.parse(b64urlDecode(p)) as ApiTokenClaims;
    if (!parsed.sub || !parsed.householdId || typeof parsed.isAdmin !== "boolean") return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function bearerFromHeader(authorization: string | null): string | null {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return token;
}
