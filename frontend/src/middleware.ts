/**
 * middleware.ts — protect all app routes except auth/static internals.
 */
import { auth } from "@/auth";
import { shouldRedirectToLogin } from "@/lib/authGuard";
import { isProtectedPath } from "@/lib/routeProtection";
import { NextResponse } from "next/server";

export default auth((req) => {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-bp-pathname", req.nextUrl.pathname);
  requestHeaders.set("x-bp-shell", isProtectedPath(req.nextUrl.pathname) ? "app" : "auth");

  if (!isProtectedPath(req.nextUrl.pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (shouldRedirectToLogin(req.auth)) {
    const loginUrl = new URL("/login", req.nextUrl);
    const callbackUrl = `${req.nextUrl.pathname}${req.nextUrl.search}`;
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    /*
     * Match everything except:
     *  - _next/static  (static assets)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - /api/auth/*   (NextAuth route handler)
     *  - /auth/*       (Auth.js internals)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth|auth).*)",
  ],
};
