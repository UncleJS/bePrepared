import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export type SortDir = "asc" | "desc";
export type SortState<K extends string> = { key: K | null; dir: SortDir };

interface SortableHeaderProps<K extends string> {
  label: string;
  colKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  className?: string;
}

export function SortableHeader<K extends string>({
  label,
  colKey,
  sort,
  onSort,
  className = "",
}: SortableHeaderProps<K>) {
  const active = sort.key === colKey;

  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(colKey)}
        className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {label}
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp size={13} className="text-foreground" />
          ) : (
            <ArrowDown size={13} className="text-foreground" />
          )
        ) : (
          <ArrowUpDown size={13} className="opacity-40" />
        )}
      </button>
    </th>
  );
}

/** Toggles sort: new key → asc; same key → flip dir */
export function nextSort<K extends string>(current: SortState<K>, key: K): SortState<K> {
  if (current.key === key) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { key, dir: "asc" };
}

/** Generic string comparator — nulls/empty last */
function cmpStr(a: string, b: string, dir: SortDir): number {
  const emptyA = a === "";
  const emptyB = b === "";
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;
  const r = a.localeCompare(b, undefined, { sensitivity: "base" });
  return dir === "asc" ? r : -r;
}

/** Generic number comparator */
function cmpNum(a: number, b: number, dir: SortDir): number {
  const r = a - b;
  return dir === "asc" ? r : -r;
}

export const sortHelpers = { cmpStr, cmpNum };
