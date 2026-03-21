/**
 * auth.ts — NextAuth v5 configuration (App Router)
 *
 * Strategy: CredentialsProvider → POST /auth/login on the API.
 * The API holds the DB and does the bcrypt comparison.
 * We store { id, username, email, householdId, isAdmin, apiToken } in the JWT token.
 * The API token stays server-side and is not exposed to client session payloads.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const API_BASE =
  process.env.NEXTAUTH_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  basePath: "/api/auth",
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
          });

          if (!res.ok) return null;

          const user = (await res.json()) as {
            token: string;
            id: string;
            username: string;
            email: string | null;
            householdId: string;
            isAdmin: boolean;
          };

          return {
            id: user.id,
            name: user.username,
            email: user.email ?? undefined,
            householdId: user.householdId,
            isAdmin: user.isAdmin,
            apiToken: user.token,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      // Persist extra fields from user → token on initial sign-in
      if (user) {
        token.householdId = (user as { householdId?: string }).householdId;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin;
        token.apiToken = (user as { apiToken?: string }).apiToken;
      }
      return token;
    },
    session({ session, token }) {
      // Expose non-sensitive fields to the client session
      if (session.user) {
        (session.user as { householdId?: string }).householdId = token.householdId as string;
        (session.user as { isAdmin?: boolean }).isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12, // 12 hours (matches API token TTL)
  },
});
