/**
 * (auth)/layout.tsx — standalone layout for auth pages.
 * No sidebar or topbar — just a clean centered page.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
