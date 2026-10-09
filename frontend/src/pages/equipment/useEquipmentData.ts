import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { createLoadGates } from "./loadGates";
import type { Equipment, EquipmentCategory } from "./types";

export function useEquipmentData() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [archivedEquipment, setArchivedEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gates = useRef(createLoadGates()).current;

  const loadData = useCallback(
    async (householdId: string) => {
      const requestId = gates.beginList();
      setLoading(true);
      setError(null);
      setEquipment([]);
      setCategories([]);
      try {
        const [items, cats] = await Promise.all([
          apiFetch<Equipment[]>(`/equipment/${householdId}`),
          apiFetch<EquipmentCategory[]>(`/equipment/${householdId}/categories`),
        ]);
        if (!gates.isCurrentList(requestId)) return;
        setEquipment(items);
        setCategories(cats);
      } catch (e) {
        if (!gates.isCurrentList(requestId)) return;
        setEquipment([]);
        setCategories([]);
        setError(e instanceof Error ? e.message : "Failed to load equipment.");
      } finally {
        if (gates.isCurrentList(requestId)) setLoading(false);
      }
    },
    [gates]
  );

  const loadArchived = useCallback(
    async (householdId: string) => {
      const requestId = gates.beginArchived();
      setArchivedEquipment([]);
      try {
        const items = await apiFetch<Equipment[]>(`/equipment/${householdId}?archived=true`);
        if (!gates.isCurrentArchived(requestId)) return;
        setArchivedEquipment(items);
      } catch (e) {
        if (!gates.isCurrentArchived(requestId)) return;
        setArchivedEquipment([]);
        setError(e instanceof Error ? e.message : "Failed to load archived equipment.");
      }
    },
    [gates]
  );

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
