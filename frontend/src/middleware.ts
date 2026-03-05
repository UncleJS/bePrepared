/**
 * middleware.ts — protect all app routes except auth/static internals.
 */
import { auth } from "@/auth";
import { shouldRedirectToLogin } from "@/lib/authGuard";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (shouldRedirectToLogin(req.auth)) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match everything except:
     *  - _next/static  (static assets)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - /login        (the sign-in page itself)
     *  - /api/auth/*   (NextAuth route handler)
     *  - /auth/*       (Auth.js internals)
     */
    "/((?!_next/static|_next/image|favicon.ico|login|api/auth|auth).*)",
  ],
};
