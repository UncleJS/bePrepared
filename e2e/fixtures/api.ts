import { request, type APIResponse } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { ADMIN_USERNAME, API_BASE_URL, getAdminPassword } from "./env";

type LoginResponse = {
  token: string;
  householdId: string;
  id: string;
  username: string;
  email: string | null;
  isAdmin: boolean;
};

type Household = {
  id: string;
  name: string;
  targetPeople: number;
  notes?: string | null;
};

type InventoryItem = {
  id: string;
  name: string;
  location?: string | null;
  unit?: string | null;
};

type InventoryLot = {
  id: string;
  itemId: string;
  expiresAt?: string | null;
  batchRef?: string | null;
};

type AlertRow = {
  id: string;
  title: string;
  entityId: string;
  isResolved: boolean;
  isRead: boolean;
};

type EquipmentItem = {
  id: string;
  name: string;
  status: "operational" | "needs_service" | "unserviceable" | "retired";
  archivedAt?: string | null;
};

type MaintenanceSchedule = {
  id: string;
  equipmentItemId: string;
  name: string;
  calDays?: number | null;
  graceDays: number;
  lastDoneAt?: string | null;
  nextDueAt?: string | null;
  isActive: boolean;
};

type MaintenanceEvent = {
  id: string;
  scheduleId: string;
  equipmentItemId: string;
  performedAt: string;
  nextDueAt?: string | null;
  performedBy?: string | null;
  notes?: string | null;
};

type ModuleSummary = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  sections: Array<{ id: string; title: string }>;
};

type ModuleDetail = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  category: string;
  sections: Array<{
    id: string;
    title: string;
    guidanceDocs: Array<{ id: string; title: string; body: string }>;
  }>;
};

type PlanningResult = {
  people: {
    count: number;
  };
  policy: {
    waterLitersPerPersonPerDay: number;
    caloriesKcalPerPersonPerDay: number;
  };
  totals: Record<string, { water: number; calories: number }>;
};

type TaskRow = {
  id: string;
  moduleId: string;
  title: string;
  readinessLevel: string;
  scenario: string;
};

type TaskDependency = {
  id: string;
  dependsOnTaskId: string;
};

type TaskProgress = {
  id: string;
  taskId: string;
  status: "pending" | "in_progress" | "completed" | "overdue";
  completedAt?: string | null;
};

async function expectOk(response: APIResponse, label: string): Promise<void> {
  if (response.ok()) return;

  const body = await response.text().catch(() => String(response.status()));
  throw new Error(`${label} failed: HTTP ${response.status()} ${body}`);
}

export async function createApiClient() {
  const loginContext = await request.newContext({ baseURL: API_BASE_URL });
  const loginResponse = await loginContext.post("/auth/login", {
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 200) + 10}`,
    },
    data: {
      username: ADMIN_USERNAME,
      password: getAdminPassword(),
    },
  });
  await expectOk(loginResponse, "API login");

  const session = (await loginResponse.json()) as LoginResponse;
  await loginContext.dispose();

  const api = await request.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: {
      authorization: `Bearer ${session.token}`,
      "content-type": "application/json",
    },
  });

  return {
    householdId: session.householdId,
    async dispose() {
      await api.dispose();
    },
    async getHousehold(): Promise<Household> {
      const response = await api.get(`/households/${session.householdId}`);
      await expectOk(response, "Get household");
      return (await response.json()) as Household;
    },
    async updateHousehold(body: Partial<Household>): Promise<Household> {
      const response = await api.patch(`/households/${session.householdId}`, { data: body });
      await expectOk(response, "Update household");
      return (await response.json()) as Household;
    },
    async createInventoryItem(body: {
      name: string;
      unit?: string;
      location?: string;
      isTrackedByExpiry?: boolean;
      targetQty?: number;
      lowStockThreshold?: number;
      notes?: string;
    }): Promise<InventoryItem> {
      const response = await api.post(`/inventory/${session.householdId}/items`, { data: body });
      await expectOk(response, "Create inventory item");
      return (await response.json()) as InventoryItem;
    },
    async archiveInventoryItem(itemId: string): Promise<void> {
      const response = await api.delete(`/inventory/${session.householdId}/items/${itemId}`);
      await expectOk(response, "Archive inventory item");
    },
    async createInventoryLot(
      itemId: string,
      body: {
        qty: number;
        acquiredAt?: string;
        expiresAt?: string;
        replaceDays?: number;
        batchRef?: string;
        notes?: string;
      }
    ): Promise<InventoryLot> {
      const response = await api.post(`/inventory/${session.householdId}/items/${itemId}/lots`, {
        data: body,
      });
      await expectOk(response, "Create inventory lot");
      return (await response.json()) as InventoryLot;
    },
    async archiveInventoryLot(itemId: string, lotId: string): Promise<void> {
      const response = await api.delete(
        `/inventory/${session.householdId}/items/${itemId}/lots/${lotId}`
      );
      await expectOk(response, "Archive inventory lot");
    },
    async runAlertJob(): Promise<void> {
      const response = await api.post("/admin/alerts/run-job");
      await expectOk(response, "Run alert job");
    },
    async listAlerts(): Promise<AlertRow[]> {
      const response = await api.get(`/alerts/${session.householdId}`);
      await expectOk(response, "List alerts");
      return (await response.json()) as AlertRow[];
    },
    async archiveAlert(alertId: string): Promise<void> {
      const response = await api.delete(`/alerts/${session.householdId}/${alertId}`);
      await expectOk(response, "Archive alert");
    },
    async listInventoryItems(): Promise<Array<InventoryItem & { lots: InventoryLot[] }>> {
      const response = await api.get(`/inventory/${session.householdId}/items`);
      await expectOk(response, "List inventory items");
      return (await response.json()) as Array<InventoryItem & { lots: InventoryLot[] }>;
    },
    async listEquipmentItems(archived = false): Promise<EquipmentItem[]> {
      const suffix = archived ? "?archived=true" : "";
      const response = await api.get(`/equipment/${session.householdId}${suffix}`);
      await expectOk(response, "List equipment items");
      return (await response.json()) as EquipmentItem[];
    },
    async createEquipmentItem(body: {
      name: string;
      categoryId?: string;
      categorySlug?: string;
      model?: string;
      serialNo?: string;
      location?: string;
      status?: EquipmentItem["status"];
      acquiredAt?: string;
      notes?: string;
    }): Promise<EquipmentItem> {
      const response = await api.post(`/equipment/${session.householdId}`, { data: body });
      await expectOk(response, "Create equipment item");
      return (await response.json()) as EquipmentItem;
    },
    async archiveEquipmentItem(itemId: string): Promise<void> {
      const response = await api.delete(`/equipment/${session.householdId}/${itemId}`);
      await expectOk(response, "Archive equipment item");
    },
    async restoreEquipmentItem(itemId: string): Promise<void> {
      const response = await api.post(`/equipment/${session.householdId}/${itemId}/restore`);
      await expectOk(response, "Restore equipment item");
    },
    async getPlanning(scenario: "shelter_in_place" | "evacuation"): Promise<PlanningResult> {
      const response = await api.get(`/planning/${session.householdId}/${scenario}`);
      await expectOk(response, "Get planning totals");
      return (await response.json()) as PlanningResult;
    },
    async listMaintenanceSchedules(): Promise<MaintenanceSchedule[]> {
      const response = await api.get(`/maintenance/${session.householdId}/schedules`);
      await expectOk(response, "List maintenance schedules");
      return (await response.json()) as MaintenanceSchedule[];
    },
    async createMaintenanceSchedule(
      equipmentItemId: string,
      body: {
        templateId?: string;
        name: string;
        calDays?: number;
        graceDays?: number;
        lastDoneAt?: string;
        nextDueAt?: string;
      }
    ): Promise<MaintenanceSchedule> {
      const response = await api.post(
        `/maintenance/${session.householdId}/${equipmentItemId}/schedules`,
        {
          data: body,
        }
      );
      await expectOk(response, "Create maintenance schedule");
      return (await response.json()) as MaintenanceSchedule;
    },
    async archiveMaintenanceSchedule(scheduleId: string): Promise<void> {
      const response = await api.delete(
        `/maintenance/${session.householdId}/schedules/${scheduleId}`
      );
      await expectOk(response, "Archive maintenance schedule");
    },
    async createMaintenanceEvent(
      scheduleId: string,
      body: {
        performedAt?: string;
        performedBy?: string;
        meterReading?: number;
        notes?: string;
      }
    ): Promise<MaintenanceEvent> {
      const response = await api.post(
        `/maintenance/${session.householdId}/schedules/${scheduleId}/events`,
        {
          data: body,
        }
      );
      await expectOk(response, "Create maintenance event");
      return (await response.json()) as MaintenanceEvent;
    },
    async listMaintenanceEvents(scheduleId: string): Promise<MaintenanceEvent[]> {
      const response = await api.get(
        `/maintenance/${session.householdId}/schedules/${scheduleId}/events`
      );
      await expectOk(response, "List maintenance events");
      return (await response.json()) as MaintenanceEvent[];
    },
    async listModules(): Promise<ModuleSummary[]> {
      const response = await api.get("/modules");
      await expectOk(response, "List modules");
      return (await response.json()) as ModuleSummary[];
    },
    async getModuleDetail(slug: string): Promise<ModuleDetail> {
      const response = await api.get(`/modules/${slug}`);
      await expectOk(response, "Get module detail");
      return (await response.json()) as ModuleDetail;
    },
    async listTasks(): Promise<TaskRow[]> {
      const response = await api.get("/tasks");
      await expectOk(response, "List tasks");
      return (await response.json()) as TaskRow[];
    },
    async listTaskDependencies(taskId: string): Promise<TaskDependency[]> {
      const response = await api.get(`/tasks/by-id/${taskId}/dependencies`);
      await expectOk(response, "List task dependencies");
      return (await response.json()) as TaskDependency[];
    },
    async listTaskProgress(): Promise<TaskProgress[]> {
      const response = await api.get(`/tasks/${session.householdId}/progress`);
      await expectOk(response, "List task progress");
      return (await response.json()) as TaskProgress[];
    },
    async upsertTaskProgress(body: {
      taskId: string;
      status?: TaskProgress["status"];
      completedAt?: string;
    }): Promise<TaskProgress> {
      const response = await api.post(`/tasks/${session.householdId}/progress`, { data: body });
      await expectOk(response, "Upsert task progress");
      return (await response.json()) as TaskProgress;
    },
    async updateTaskProgress(
      progressId: string,
      body: {
        status?: TaskProgress["status"];
        completedAt?: string;
      }
    ): Promise<TaskProgress> {
      const response = await api.patch(`/tasks/${session.householdId}/progress/${progressId}`, {
        data: body,
      });
      await expectOk(response, "Update task progress");
      return (await response.json()) as TaskProgress;
    },
    uniqueName(prefix: string): string {
      return `${prefix}-${randomUUID().slice(0, 8)}`;
    },
  };
}
