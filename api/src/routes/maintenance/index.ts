import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import {
  maintenanceSchedules,
  maintenanceEvents,
  maintenanceTemplates,
  equipmentItems,
} from "../../db/schema";
import { eq, isNull, and, lte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin, requireAuth, requireHouseholdScope } from "../../lib/routeAuth";

type MaintenanceTaskType =
  | "inspect"
  | "clean"
  | "lubricate"
  | "test"
  | "full_service"
  | "recharge"
  | "replace";

async function scheduleForHousehold(householdId: string, scheduleId: string) {
  const rows = await db
    .select({
      schedule: maintenanceSchedules,
      equipment: equipmentItems,
    })
    .from(maintenanceSchedules)
    .innerJoin(equipmentItems, eq(maintenanceSchedules.equipmentItemId, equipmentItems.id))
    .where(
      and(
        eq(maintenanceSchedules.id, scheduleId),
        eq(equipmentItems.householdId, householdId),
        isNull(maintenanceSchedules.archivedAt),
        isNull(equipmentItems.archivedAt)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

export const maintenanceRoute = new Elysia({ prefix: "/maintenance", tags: ["maintenance"] })
  .get(
    "/templates",
    async ({ request, set }) => {
      const claims = requireAuth(request, set);
      if (!claims) return { error: "Unauthorized" };

      return db.query.maintenanceTemplates.findMany({
        where: isNull(maintenanceTemplates.archivedAt),
      });
    },
    { detail: { summary: "List maintenance templates" } }
  )

  .post(
    "/templates",
    async ({ request, set, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      const id = randomUUID();
      await db.insert(maintenanceTemplates).values({
        id,
        categorySlug: body.categorySlug,
        name: body.name,
        description: body.description,
        taskType: body.taskType ? (body.taskType as MaintenanceTaskType) : undefined,
        defaultCalDays: body.defaultCalDays,
        usageMeterUnit: body.usageMeterUnit,
        defaultUsageInterval:
          body.defaultUsageInterval != null ? String(body.defaultUsageInterval) : undefined,
        graceDays: body.graceDays,
      });
      return db.query.maintenanceTemplates.findFirst({
        where: eq(maintenanceTemplates.id, id),
      });
    },
    {
      body: t.Object({
        categorySlug: t.String({ minLength: 1, maxLength: 100 }),
        name: t.String({ minLength: 1, maxLength: 500 }),
        description: t.Optional(t.String({ maxLength: 10000 })),
        taskType: t.Optional(
          t.Union([
            t.Literal("inspect"),
            t.Literal("clean"),
            t.Literal("lubricate"),
            t.Literal("test"),
            t.Literal("full_service"),
            t.Literal("recharge"),
            t.Literal("replace"),
          ])
        ),
        defaultCalDays: t.Optional(t.Number({ minimum: 1, maximum: 36500 })),
        usageMeterUnit: t.Optional(t.String({ maxLength: 50 })),
        defaultUsageInterval: t.Optional(t.Number({ minimum: 0, maximum: 1000000000 })),
        graceDays: t.Optional(t.Number({ minimum: 0, maximum: 3650 })),
      }),
      detail: { summary: "Create a maintenance template" },
    }
  )

  .get(
    "/:householdId/schedules",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const rows = await db
        .select({ schedule: maintenanceSchedules })
        .from(maintenanceSchedules)
        .innerJoin(equipmentItems, eq(maintenanceSchedules.equipmentItemId, equipmentItems.id))
        .where(
          and(
            eq(equipmentItems.householdId, params.householdId),
            isNull(equipmentItems.archivedAt),
            isNull(maintenanceSchedules.archivedAt)
          )
        );

      return rows.map((r) => r.schedule);
    },
    { detail: { summary: "List maintenance schedules for a household" } }
  )

  .post(
    "/:householdId/:equipmentItemId/schedules",
    async ({ request, set, params, body }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const equipment = await db.query.equipmentItems.findFirst({
        where: and(
          eq(equipmentItems.id, params.equipmentItemId),
          eq(equipmentItems.householdId, params.householdId),
          isNull(equipmentItems.archivedAt)
        ),
      });
      if (!equipment) {
        set.status = 404;
        return { error: "Equipment item not found" };
      }

      const id = randomUUID();
      await db.insert(maintenanceSchedules).values({
        id,
        equipmentItemId: params.equipmentItemId,
        templateId: body.templateId,
        name: body.name,
        calDays: body.calDays,
        usageMeterUnit: body.usageMeterUnit,
        usageInterval: body.usageInterval != null ? String(body.usageInterval) : undefined,
        graceDays: body.graceDays,
        lastDoneAt: body.lastDoneAt ? new Date(body.lastDoneAt) : undefined,
        nextDueAt: body.nextDueAt ? new Date(body.nextDueAt) : undefined,
      });
      return db.query.maintenanceSchedules.findFirst({
        where: eq(maintenanceSchedules.id, id),
      });
    },
    {
      body: t.Object({
        templateId: t.Optional(t.String({ minLength: 36, maxLength: 36 })),
        name: t.String({ minLength: 1, maxLength: 500 }),
        calDays: t.Optional(t.Number({ minimum: 1, maximum: 36500 })),
        usageMeterUnit: t.Optional(t.String({ maxLength: 50 })),
        usageInterval: t.Optional(t.Number({ minimum: 0, maximum: 1000000000 })),
        graceDays: t.Optional(t.Number({ minimum: 0, maximum: 3650 })),
        lastDoneAt: t.Optional(t.String({ maxLength: 64 })),
        nextDueAt: t.Optional(t.String({ maxLength: 64 })),
      }),
      detail: { summary: "Create a maintenance schedule for an equipment item" },
    }
  )

  .patch(
    "/:householdId/schedules/:scheduleId",
    async ({ request, set, params, body }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const found = await scheduleForHousehold(params.householdId, params.scheduleId);
      if (!found) {
        set.status = 404;
        return { error: "Schedule not found" };
      }

      await db
        .update(maintenanceSchedules)
        .set({
          name: body.name,
          calDays: body.calDays,
          graceDays: body.graceDays,
          lastDoneAt: body.lastDoneAt ? new Date(body.lastDoneAt) : undefined,
          nextDueAt: body.nextDueAt ? new Date(body.nextDueAt) : undefined,
          isActive: body.isActive,
        })
        .where(eq(maintenanceSchedules.id, params.scheduleId));

      return db.query.maintenanceSchedules.findFirst({
        where: eq(maintenanceSchedules.id, params.scheduleId),
      });
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String({ minLength: 1, maxLength: 500 }),
          calDays: t.Number({ minimum: 1, maximum: 36500 }),
          graceDays: t.Number({ minimum: 0, maximum: 3650 }),
          lastDoneAt: t.String({ maxLength: 64 }),
          nextDueAt: t.String({ maxLength: 64 }),
          isActive: t.Boolean(),
        })
      ),
      detail: { summary: "Update a maintenance schedule" },
    }
  )

  .delete(
    "/:householdId/schedules/:scheduleId",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const found = await scheduleForHousehold(params.householdId, params.scheduleId);
      if (!found) {
        set.status = 404;
        return { error: "Schedule not found" };
      }

      await db
        .update(maintenanceSchedules)
        .set({ archivedAt: new Date() })
        .where(eq(maintenanceSchedules.id, params.scheduleId));

      return { archived: true };
    },
    { detail: { summary: "Archive a maintenance schedule" } }
  )

  .post(
    "/:householdId/schedules/:scheduleId/events",
    async ({ request, set, params, body }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const found = await scheduleForHousehold(params.householdId, params.scheduleId);
      if (!found) {
        set.status = 404;
        return { error: "Schedule not found" };
      }

      const id = randomUUID();
      const performedDate = new Date(body.performedAt ?? new Date());
      let nextDueDate: Date | undefined;
      if (found.schedule.calDays) {
        nextDueDate = new Date(performedDate);
        nextDueDate.setDate(nextDueDate.getDate() + found.schedule.calDays);
      }

      await db.insert(maintenanceEvents).values({
        id,
        scheduleId: params.scheduleId,
        equipmentItemId: found.schedule.equipmentItemId,
        performedAt: performedDate,
        performedBy: body.performedBy,
        meterReading: body.meterReading != null ? String(body.meterReading) : undefined,
        nextDueAt: nextDueDate,
        notes: body.notes,
      });

      if (nextDueDate) {
        await db
          .update(maintenanceSchedules)
          .set({
            lastDoneAt: performedDate,
            nextDueAt: nextDueDate,
            lastMeterValue: body.meterReading != null ? String(body.meterReading) : undefined,
          })
          .where(eq(maintenanceSchedules.id, params.scheduleId));
      }

      return db.query.maintenanceEvents.findFirst({
        where: eq(maintenanceEvents.id, id),
      });
    },
    {
      body: t.Object({
        performedAt: t.Optional(t.String({ maxLength: 64 })),
        performedBy: t.Optional(t.String({ maxLength: 255 })),
        meterReading: t.Optional(t.Number({ minimum: 0, maximum: 1000000000 })),
        notes: t.Optional(t.String({ maxLength: 10000 })),
      }),
      detail: { summary: "Record a completed maintenance event and advance next due date" },
    }
  )

  .get(
    "/:householdId/schedules/:scheduleId/events",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const found = await scheduleForHousehold(params.householdId, params.scheduleId);
      if (!found) {
        set.status = 404;
        return { error: "Schedule not found" };
      }

      return db.query.maintenanceEvents.findMany({
        where: and(
          eq(maintenanceEvents.scheduleId, params.scheduleId),
          isNull(maintenanceEvents.archivedAt)
        ),
      });
    },
    { detail: { summary: "Get maintenance history for a schedule" } }
  )

  .get(
    "/:householdId/due",
    async ({ request, set, params, query }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const days = Number(query.days ?? 14);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);

      const rows = await db
        .select({ schedule: maintenanceSchedules })
        .from(maintenanceSchedules)
        .innerJoin(equipmentItems, eq(maintenanceSchedules.equipmentItemId, equipmentItems.id))
        .where(
          and(
            eq(equipmentItems.householdId, params.householdId),
            isNull(equipmentItems.archivedAt),
            isNull(maintenanceSchedules.archivedAt),
            eq(maintenanceSchedules.isActive, true),
            lte(maintenanceSchedules.nextDueAt, cutoff)
          )
        );

      return rows.map((r) => r.schedule);
    },
    {
      query: t.Object({ days: t.Optional(t.Number({ minimum: 1, maximum: 3650 })) }),
      detail: { summary: "Get maintenance schedules due within N days" },
    }
  );
