"use client";

import { useEffect, useState } from "react";
import { apiFetch, fmtDate, HOUSEHOLD_ID } from "@/lib/api";
import { ShieldCheck, AlertTriangle } from "lucide-react";

type Equipment = {
  id: string;
  name: string;
  model?: string;
  serialNo?: string;
  categorySlug: string;
  status: "operational" | "needs_service" | "unserviceable" | "retired";
  location?: string;
  acquiredAt?: string;
};

const STATUS_COLORS: Record<string, string> = {
  operational:    "text-primary",
  needs_service:  "text-yellow-400",
  unserviceable:  "text-destructive",
  retired:        "text-muted-foreground",
};

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    apiFetch<Equipment[]>(`/equipment/${HOUSEHOLD_ID}`)
      .then(setEquipment)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted-foreground text-sm">Loading equipment…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Equipment</h1>
        <p className="text-muted-foreground text-sm mt-1">{equipment.length} items registered</p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Category</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Model / Serial</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Location</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Acquired</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {equipment.map((eq) => (
              <tr key={eq.id} className="hover:bg-accent/30 transition-colors">
                <td className="px-4 py-2.5 font-medium">{eq.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground capitalize">{eq.categorySlug}</td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">
                  {[eq.model, eq.serialNo].filter(Boolean).join(" / ") || "—"}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{eq.location ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`font-medium capitalize ${STATUS_COLORS[eq.status]}`}>
                    {eq.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(eq.acquiredAt)}</td>
              </tr>
            ))}
            {equipment.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No equipment registered.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
