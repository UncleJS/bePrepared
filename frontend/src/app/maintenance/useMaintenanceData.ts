import { useCallback, useMemo, useState } from "react";
import { apiFetch, daysUntil } from "@/lib/api";
import type { EquipmentItem, Schedule, Template } from "./types";

export function useMaintenanceData() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (householdId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [scheduleRows, equipmentRows, templateRows] = await Promise.all([
        apiFetch<Schedule[]>(`/maintenance/${householdId}/schedules`),
        apiFetch<EquipmentItem[]>(`/equipment/${householdId}`),
        apiFetch<Template[]>(`/maintenance/templates`),
      ]);
      setSchedules(scheduleRows);
      setEquipment(equipmentRows);
      setTemplates(templateRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load maintenance data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSchedules = useCallback(async (householdId: string) => {
    const rows = await apiFetch<Schedule[]>(`/maintenance/${householdId}/schedules`);
    setSchedules(rows);
  }, []);

  const equipmentMap = useMemo(
    () => Object.fromEntries(equipment.map((item) => [item.id, item.name])),
    [equipment]
  );

  const sortedSchedules = useMemo(
    () =>
      [...schedules].sort((a, b) => {
        const daysA = daysUntil(a.nextDueAt) ?? 9999;
        const daysB = daysUntil(b.nextDueAt) ?? 9999;
        return daysA - daysB;
      }),
    [schedules]
  );

  return {
    schedules,
    equipment,
    templates,
    loading,
    error,
    setError,
    loadData,
    loadSchedules,
    equipmentMap,
    sortedSchedules,
  };
}
