import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Equipment, EquipmentCategory } from "./types";

export function useEquipmentData() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [archivedEquipment, setArchivedEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const loadData = useCallback(async (householdId: string) => {
    const requestId = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const [items, cats] = await Promise.all([
        apiFetch<Equipment[]>(`/equipment/${householdId}`),
        apiFetch<EquipmentCategory[]>(`/equipment/${householdId}/categories`),
      ]);
      if (requestId !== generation.current) return;
      setEquipment(items);
      setCategories(cats);
    } catch (e) {
      if (requestId !== generation.current) return;
      setError(e instanceof Error ? e.message : "Failed to load equipment.");
    } finally {
      if (requestId === generation.current) setLoading(false);
    }
  }, []);

  const loadArchived = useCallback(async (householdId: string) => {
    const requestId = ++generation.current;
    try {
      const items = await apiFetch<Equipment[]>(`/equipment/${householdId}?archived=true`);
      if (requestId !== generation.current) return;
      setArchivedEquipment(items);
    } catch (e) {
      if (requestId !== generation.current) return;
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
