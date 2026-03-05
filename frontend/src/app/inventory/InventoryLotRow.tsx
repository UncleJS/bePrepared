import { fmtDate } from "@/lib/api";
import { Pencil, Trash2 } from "lucide-react";
import type { InventoryLot } from "./types";

export function InventoryLotRow({
  lot,
  onEdit,
  onArchive,
}: {
  lot: InventoryLot;
  onEdit: (lot: InventoryLot) => void;
  onArchive: (lotId: string) => void;
}) {
  return (
    <tr className="transition-colors hover:bg-accent/30">
      <td className="px-4 py-2.5">{lot.qty}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(lot.acquiredAt)}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(lot.expiresAt)}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{lot.replaceDays ?? "-"}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{lot.batchRef ?? "-"}</td>
      <td className="px-4 py-2.5 text-right">
        <div className="inline-flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(lot)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            type="button"
            onClick={() => onArchive(lot.id)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
          >
            <Trash2 size={12} /> Archive
          </button>
        </div>
      </td>
    </tr>
  );
}
