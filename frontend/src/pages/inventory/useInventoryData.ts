import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { InventoryCategory, InventoryItem } from "./types";

export function useInventoryData() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const loadData = useCallback(async (householdId: string) => {
    const requestId = ++generation.current;
    setLoading(true);
    setError(null);
    setItems([]);
    setCategories([]);
    try {
      const [itemRows, categoryRows] = await Promise.all([
        apiFetch<InventoryItem[]>(`/inventory/${householdId}/items`),
        apiFetch<InventoryCategory[]>(`/inventory/${householdId}/categories`),
      ]);
      if (requestId !== generation.current) return;
      setItems(itemRows);
      setCategories(categoryRows);
    } catch (e) {
      if (requestId !== generation.current) return;
      setItems([]);
      setCategories([]);
      setError(e instanceof Error ? e.message : "Failed to load inventory.");
    } finally {
      if (requestId === generation.current) setLoading(false);
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
