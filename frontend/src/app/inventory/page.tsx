"use client";

import { useEffect, useState } from "react";
import { apiFetch, fmtDate, daysUntil, HOUSEHOLD_ID } from "@/lib/api";
import { Package, AlertTriangle, Plus } from "lucide-react";

type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  location?: string;
  targetQty?: number;
  lowStockThreshold?: number;
  isTrackedByExpiry: boolean;
  lots: InventoryLot[];
};

type InventoryLot = {
  id: string;
  qty: number;
  acquiredAt?: string;
  expiresAt?: string;
  nextReplaceAt?: string;
  batchRef?: string;
};

export default function InventoryPage() {
  const [items, setItems]   = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<InventoryItem[]>(`/inventory/${HOUSEHOLD_ID}/items`)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted-foreground text-sm">Loading inventory…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} items tracked</p>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Item</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Location</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">Qty</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">Target</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Expiry / Replace</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const totalQty = item.lots.reduce((s, l) => s + Number(l.qty), 0);
              const belowTarget = item.targetQty && totalQty < (item.lowStockThreshold ?? item.targetQty);
              const earliestExpiry = item.lots
                .map((l) => l.expiresAt)
                .filter(Boolean)
                .sort()[0];
              const earliestReplace = item.lots
                .map((l) => l.nextReplaceAt)
                .filter(Boolean)
                .sort()[0];
              const dueDays = daysUntil(earliestExpiry ?? earliestReplace);

              return (
                <tr key={item.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {belowTarget && <AlertTriangle size={13} className="text-yellow-400 shrink-0" />}
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground text-xs">({item.unit})</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{item.location ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    <span className={belowTarget ? "text-yellow-400" : ""}>{totalQty}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                    {item.targetQty ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {dueDays === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : dueDays < 0 ? (
                      <span className="text-destructive font-medium">Overdue</span>
                    ) : dueDays <= 30 ? (
                      <span className="text-yellow-400">
                        {earliestExpiry ? fmtDate(earliestExpiry) : fmtDate(earliestReplace)} ({dueDays}d)
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {earliestExpiry ? fmtDate(earliestExpiry) : fmtDate(earliestReplace)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No inventory items. Add items via the API or Swagger UI.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
