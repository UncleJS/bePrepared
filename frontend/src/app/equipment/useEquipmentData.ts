import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Equipment, EquipmentCategory } from "./types";

export function useEquipmentData() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (householdId: string) => {
    setLoading(true);
    try {
      const [items, cats] = await Promise.all([
        apiFetch<Equipment[]>(`/equipment/${householdId}`),
        apiFetch<EquipmentCategory[]>(`/equipment/${householdId}/categories`),
      ]);
      setEquipment(items);
      setCategories(cats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load equipment.");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    equipment,
    categories,
    loading,
    error,
    setError,
    loadData,
    setEquipment,
    setCategories,
  };
}
