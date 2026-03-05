/**
 * middleware.ts — protect all routes except /login and NextAuth internals.
 *
 * Uses NextAuth v5's built-in middleware helper.
 * Unauthenticated requests → redirect to /login.
 */
export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    /*
     * Match everything except:
     *  - _next/static  (static assets)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - /login        (the sign-in page itself)
     *  - /api/auth/*   (NextAuth route handler)
     */
    "/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)",
  ],
};
