import { useState } from "react";
import { Outlet } from "react-router-dom";
import { SideNav } from "./SideNav";
import { TopBar } from "./TopBar";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <TopBar onOpenNav={() => setMobileNavOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <SideNav className="w-56" />
        </div>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            className="w-[280px] border-r border-border p-0 sm:max-w-[280px]"
          >
            <SideNav className="w-full" onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      <footer className="border-t border-border px-6 py-2 text-center text-xs text-muted-foreground">
        Content licensed under CC BY-NC-SA 4.0
      </footer>
    </>
  );
}
