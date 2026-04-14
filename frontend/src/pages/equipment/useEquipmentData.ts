import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Equipment, EquipmentCategory } from "./types";

export function useEquipmentData() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [archivedEquipment, setArchivedEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [loading, setLoading] = useState(false);
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

  const loadArchived = useCallback(async (householdId: string) => {
    try {
      const items = await apiFetch<Equipment[]>(`/equipment/${householdId}?archived=true`);
      setArchivedEquipment(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load archived equipment.");
    }
  }, []);

  return {
    equipment,
    archivedEquipment,
    categories,
    loading,
    error,
    setError,
    loadData,
    loadArchived,
    setEquipment,
    setArchivedEquipment,
    setCategories,
  };
}
