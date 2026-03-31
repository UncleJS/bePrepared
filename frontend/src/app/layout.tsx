import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "bePrepared",
  description: "Household disaster preparedness — 72h to 90-day self-sufficiency",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const shell = (await headers()).get("x-bp-shell") ?? "app";

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <Providers>
          {shell === "auth" ? (
            <main className="flex-1">{children}</main>
          ) : (
            <AppShell>{children}</AppShell>
          )}
        </Providers>
      </body>
    </html>
  );
}
