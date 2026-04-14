import { daysUntil, fmtDate } from "@/lib/api";
import { AlertTriangle, Pencil, Trash2 } from "lucide-react";
import type { InventoryItem } from "./types";

export function InventoryItemRow({
  item,
  alertItemIds,
  onEdit,
  onOpenLots,
  onArchive,
}: {
  item: InventoryItem;
  alertItemIds: Set<string>;
  onEdit: (item: InventoryItem) => void;
  onOpenLots: (itemId: string) => void;
  onArchive: (itemId: string) => void;
}) {
  const totalQty = item.lots.reduce((sum, lot) => sum + Number(lot.qty), 0);
  const earliestExpiry = item.lots
    .map((lot) => lot.expiresAt)
    .filter(Boolean)
    .sort()[0];
  const earliestReplace = item.lots
    .map((lot) => lot.nextReplaceAt)
    .filter(Boolean)
    .sort()[0];
  const dueDays = daysUntil(earliestExpiry ?? earliestReplace);
  const hasAlert = alertItemIds.has(item.id);

  return (
    <tr
      className={`transition-colors hover:bg-accent/30 ${
        hasAlert ? "border-l-2 border-yellow-500 bg-yellow-900/20" : ""
      }`}
    >
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          {hasAlert && <AlertTriangle size={13} className="shrink-0 text-yellow-400" />}
          <span className="font-medium">{item.name}</span>
          <span className="text-xs text-muted-foreground">({item.unit || "each"})</span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-muted-foreground">{item.location ?? "-"}</td>
      <td className="px-4 py-2.5 text-right font-mono">{totalQty}</td>
      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
        {item.targetQty ?? "-"}
      </td>
      <td className="px-4 py-2.5 text-xs">
        {dueDays == null ? (
          <span className="text-muted-foreground">-</span>
        ) : dueDays < 0 ? (
          <span className="font-medium text-destructive">Overdue</span>
        ) : (
          <span className={dueDays <= 30 ? "text-yellow-400" : "text-muted-foreground"}>
            {earliestExpiry ? fmtDate(earliestExpiry) : fmtDate(earliestReplace)}
            {dueDays <= 30 ? ` (${dueDays}d)` : ""}
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            type="button"
            onClick={() => onOpenLots(item.id)}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Lots
          </button>
          <button
            type="button"
            onClick={() => onArchive(item.id)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
          >
            <Trash2 size={12} /> Archive
          </button>
        </div>
      </td>
    </tr>
  );
}
