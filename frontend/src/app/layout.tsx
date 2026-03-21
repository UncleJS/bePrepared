import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { SideNav } from "@/components/layout/SideNav";
import { TopBar } from "@/components/layout/TopBar";
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
            <>
              <TopBar />
              <div className="flex flex-1">
                <SideNav />
                <main className="flex-1 overflow-auto p-6">{children}</main>
              </div>
              <footer className="border-t border-border px-6 py-2 text-center text-xs text-muted-foreground">
                Content licensed under CC BY-NC-SA 4.0
              </footer>
            </>
          )}
        </Providers>
      </body>
    </html>
  );
}
