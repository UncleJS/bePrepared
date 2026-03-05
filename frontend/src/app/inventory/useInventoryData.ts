import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { InventoryCategory, InventoryItem } from "./types";

export function useInventoryData() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (householdId: string) => {
    setLoading(true);
    try {
      const [itemRows, categoryRows] = await Promise.all([
        apiFetch<InventoryItem[]>(`/inventory/${householdId}/items`),
        apiFetch<InventoryCategory[]>(`/inventory/${householdId}/categories`),
      ]);
      setItems(itemRows);
      setCategories(categoryRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    items,
    categories,
    loading,
    error,
    setError,
    loadData,
    setItems,
    setCategories,
  };
}
