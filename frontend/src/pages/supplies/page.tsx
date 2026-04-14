"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { InventoryPanel } from "./inventory/InventoryPanel";
import { EquipmentPanel } from "./equipment/EquipmentPanel";

type Tab = "inventory" | "equipment";

const TABS: Array<{ id: Tab; label: string; description: string }> = [
  {
    id: "inventory",
    label: "Inventory",
    description: "Consumables, lots, expiry, and replacement cycles.",
  },
  {
    id: "equipment",
    label: "Equipment",
    description: "Operational gear, status, location, and archived restore flows.",
  },
];

function SuppliesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = useMemo<Tab>(() => {
    const tab = searchParams.get("tab");
    return tab === "equipment" ? "equipment" : "inventory";
  }, [searchParams]);

  function setTab(tab: Tab) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    router.replace(`${pathname}?${next.toString()}`);
  }

  const current = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Supplies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inventory and equipment organized in one working area.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-1">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={clsx(
                "rounded-md px-4 py-3 text-left transition-colors",
                activeTab === tab.id
                  ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className="text-sm font-semibold">{tab.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{tab.description}</div>
            </button>
          ))}
        </div>
      </div>

      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold">{current.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{current.description}</p>
        </div>

        {activeTab === "inventory" ? <InventoryPanel /> : <EquipmentPanel />}
      </section>
    </div>
  );
}

export default function SuppliesPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading supplies…" />}>
      <SuppliesPageContent />
    </Suspense>
  );
}
