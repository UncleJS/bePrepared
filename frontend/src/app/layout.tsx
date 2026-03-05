import type { Metadata } from "next";
import "./globals.css";
import { SideNav } from "@/components/layout/SideNav";
import { TopBar } from "@/components/layout/TopBar";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "bePrepared",
  description: "Household disaster preparedness — 72h to 90-day self-sufficiency",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <Providers>
          <TopBar />
          <div className="flex flex-1">
            <SideNav />
            <main className="flex-1 p-6 overflow-auto">
              {children}
            </main>
          </div>
          <footer className="border-t border-border px-6 py-2 text-xs text-muted-foreground text-center">
            Content licensed under CC BY-NC-SA 4.0
          </footer>
        </Providers>
      </body>
    </html>
  );
}
