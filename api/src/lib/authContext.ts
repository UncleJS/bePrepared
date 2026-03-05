import type { ApiTokenClaims } from "./authToken";

const requestClaims = new WeakMap<Request, ApiTokenClaims | null>();

export function setRequestClaims(request: Request, claims: ApiTokenClaims | null): void {
  requestClaims.set(request, claims);
}

export function getRequestClaims(request: Request): ApiTokenClaims | null | undefined {
  return requestClaims.get(request);
}
