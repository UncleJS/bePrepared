import { fmtDate } from "@/lib/api";
import { Pencil, Trash2, RotateCcw } from "lucide-react";
import { STATUS_COLORS } from "./constants";
import type { Equipment } from "./types";

export function EquipmentRow({
  item,
  categoryMap,
  onEdit,
  onArchive,
  onRestore,
  isArchived = false,
}: {
  item: Equipment;
  categoryMap: Record<string, string>;
  onEdit: (item: Equipment) => void;
  onArchive: (id: string) => void;
  onRestore?: (id: string) => void;
  isArchived?: boolean;
}) {
  return (
    <tr className={`transition-colors hover:bg-accent/30 ${isArchived ? "opacity-50" : ""}`}>
      <td className="px-4 py-2.5 font-medium">{item.name}</td>
      <td className="px-4 py-2.5 text-muted-foreground">
        {(item.categoryId && categoryMap[item.categoryId]) || item.categorySlug || "-"}
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground">
        {[item.model, item.serialNo].filter(Boolean).join(" / ") || "-"}
      </td>
      <td className="px-4 py-2.5 text-muted-foreground">{item.location ?? "-"}</td>
      <td className="px-4 py-2.5">
        <span className={`font-medium capitalize ${STATUS_COLORS[item.status]}`}>
          {item.status.replace("_", " ")}
        </span>
      </td>
      <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(item.acquiredAt)}</td>
      <td className="px-4 py-2.5 text-right">
        <div className="inline-flex gap-2">
          {isArchived ? (
            <button
              type="button"
              onClick={() => onRestore?.(item.id)}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-400/10"
            >
              <RotateCcw size={12} /> Restore
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Pencil size={12} /> Edit
              </button>
              <button
                type="button"
                onClick={() => onArchive(item.id)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={12} /> Archive
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
