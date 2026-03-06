import { signIn } from "@/auth";
import { ShieldCheck, LogIn } from "lucide-react";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const destination = callbackUrl ?? "/dashboard";

  async function doLogin(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        username: formData.get("username") as string,
        password: formData.get("password") as string,
        redirectTo: destination,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=CredentialsSignin&callbackUrl=${encodeURIComponent(destination)}`);
      }
      // signIn throws a NEXT_REDIRECT on success — re-throw it
      throw err;
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2">
          <ShieldCheck size={40} className="text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">bePrepared</h1>
          <p className="text-sm text-muted-foreground text-center">
            Sign in to manage your household preparedness
          </p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <form action={doLogin} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="username"
                className="block text-xs font-bold uppercase tracking-wide text-primary"
              >
                Account Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="admin"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wide text-primary"
              >
                Account Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>

            {error === "CredentialsSignin" && (
              <p className="text-sm text-destructive">Invalid username or password.</p>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <LogIn size={16} />
              Sign in
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Content licensed under CC BY-NC-SA 4.0
        </p>
      </div>
    </div>
  );
}
