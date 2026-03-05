import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { tasks, taskDependencies, taskProgress } from "../../db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin, requireHouseholdScope } from "../../lib/routeAuth";

type TaskClass = "acquire" | "prepare" | "test" | "maintain" | "document";
type ReadinessLevel = "l1_72h" | "l2_14d" | "l3_30d" | "l4_90d";
type TaskScenario = "both" | "shelter_in_place" | "evacuation";
type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";

export const tasksRoute = new Elysia({ prefix: "/tasks", tags: ["tasks"] })

  .get("/", async ({ query }) => {
    const rows = await db.query.tasks.findMany({
      where: isNull(tasks.archivedAt),
      orderBy: tasks.sortOrder,
    });

    const deduped = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const key = [
        row.moduleId,
        row.readinessLevel,
        row.scenario,
        row.taskClass,
        row.title.trim().toLowerCase(),
      ].join(":");
      if (!deduped.has(key)) deduped.set(key, row);
    }

    return Array.from(deduped.values());
  }, { detail: { summary: "List all tasks" } })

  .get("/by-id/:id", async ({ params, set }) => {
    const row = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, params.id), isNull(tasks.archivedAt)),
    });
    if (!row) {
      set.status = 404;
      return { error: "Task not found" };
    }
    return row;
  }, { detail: { summary: "Get a task by ID" } })

  .post("/", async ({ request, set, body }) => {
    const claims = requireAdmin(request, set);
    if (!claims) return { error: "Admin access required" };

    const id = randomUUID();
    await db.insert(tasks).values({
      id,
      moduleId:       body.moduleId,
      sectionId:      body.sectionId,
      title:          body.title,
      description:    body.description,
      taskClass:      body.taskClass      ? (body.taskClass      as TaskClass)      : undefined,
      readinessLevel: body.readinessLevel ? (body.readinessLevel as ReadinessLevel) : undefined,
      scenario:       body.scenario       ? (body.scenario       as TaskScenario)   : undefined,
      isRecurring:    body.isRecurring,
      recurDays:      body.recurDays,
      sortOrder:      body.sortOrder,
      evidencePrompt: body.evidencePrompt,
    });
    return db.query.tasks.findFirst({ where: eq(tasks.id, id) });
  }, {
    body: t.Object({
      moduleId:       t.String(),
      sectionId:      t.Optional(t.String()),
      title:          t.String({ minLength: 1 }),
      description:    t.Optional(t.String()),
      taskClass:      t.Optional(t.String()),
      readinessLevel: t.Optional(t.String()),
      scenario:       t.Optional(t.String()),
      isRecurring:    t.Optional(t.Boolean()),
      recurDays:      t.Optional(t.Number()),
      sortOrder:      t.Optional(t.Number()),
      evidencePrompt: t.Optional(t.String()),
    }),
    detail: { summary: "Create a task" },
  })

  .patch("/:id", async ({ request, set, params, body }) => {
    const claims = requireAdmin(request, set);
    if (!claims) return { error: "Admin access required" };

    await db.update(tasks).set({
      moduleId:       body.moduleId,
      sectionId:      body.sectionId,
      title:          body.title,
      description:    body.description,
      taskClass:      body.taskClass      ? (body.taskClass      as TaskClass)      : undefined,
      readinessLevel: body.readinessLevel ? (body.readinessLevel as ReadinessLevel) : undefined,
      scenario:       body.scenario       ? (body.scenario       as TaskScenario)    : undefined,
      isRecurring:    body.isRecurring,
      recurDays:      body.recurDays,
      sortOrder:      body.sortOrder,
      evidencePrompt: body.evidencePrompt,
    }).where(and(eq(tasks.id, params.id), isNull(tasks.archivedAt)));

    const row = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, params.id), isNull(tasks.archivedAt)),
    });
    if (!row) {
      set.status = 404;
      return { error: "Task not found" };
    }
    return row;
  }, {
    body: t.Partial(t.Object({
      moduleId:       t.String(),
      sectionId:      t.String(),
      title:          t.String({ minLength: 1 }),
      description:    t.String(),
      taskClass:      t.String(),
      readinessLevel: t.String(),
      scenario:       t.String(),
      isRecurring:    t.Boolean(),
      recurDays:      t.Number(),
      sortOrder:      t.Number(),
      evidencePrompt: t.String(),
    })),
    detail: { summary: "Update a task" },
  })

  // Task progress (ticksheet)
  .get("/:householdId/progress", async ({ request, set, params }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    return db.query.taskProgress.findMany({
      where: and(
        eq(taskProgress.householdId, params.householdId),
        isNull(taskProgress.archivedAt)
      ),
    });
  }, { detail: { summary: "Get all task progress for a household" } })

  .post("/:householdId/progress", async ({ request, set, params, body }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    const existing = await db.query.taskProgress.findFirst({
      where: and(
        eq(taskProgress.householdId, params.householdId),
        eq(taskProgress.taskId, body.taskId),
        isNull(taskProgress.archivedAt)
      ),
    });

    if (existing) {
      const nextStatus = body.status ? (body.status as TaskStatus) : existing.status;
      const now = new Date();
      const nextCompletedAt = body.completedAt
        ? new Date(body.completedAt)
        : nextStatus === "completed"
          ? (existing.completedAt ?? now)
          : null;

      await db.update(taskProgress).set({
        status: nextStatus,
        completedAt: nextCompletedAt,
        nextDueAt: body.nextDueAt ? new Date(body.nextDueAt) : existing.nextDueAt,
        evidenceNote: body.evidenceNote ?? existing.evidenceNote,
        completedBy: body.completedBy ?? existing.completedBy,
      }).where(and(
        eq(taskProgress.id, existing.id),
        eq(taskProgress.householdId, params.householdId),
        isNull(taskProgress.archivedAt)
      ));

      return db.query.taskProgress.findFirst({
        where: and(
          eq(taskProgress.id, existing.id),
          eq(taskProgress.householdId, params.householdId),
          isNull(taskProgress.archivedAt)
        ),
      });
    }

    const id = randomUUID();
    await db.insert(taskProgress).values({
      id,
      householdId:  params.householdId,
      taskId:       body.taskId,
      status:       body.status      ? (body.status as TaskStatus) : undefined,
      completedAt:  body.completedAt ? new Date(body.completedAt)  : undefined,
      nextDueAt:    body.nextDueAt   ? new Date(body.nextDueAt)    : undefined,
      evidenceNote: body.evidenceNote,
      completedBy:  body.completedBy,
    });
    return db.query.taskProgress.findFirst({ where: eq(taskProgress.id, id) });
  }, {
    body: t.Object({
      taskId:       t.String(),
      status:       t.Optional(t.String()),
      completedAt:  t.Optional(t.String()),
      nextDueAt:    t.Optional(t.String()),
      evidenceNote: t.Optional(t.String()),
      completedBy:  t.Optional(t.String()),
    }),
    detail: { summary: "Create or update task progress entry" },
  })

  .patch("/:householdId/progress/:id", async ({ request, set, params, body }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    const now = new Date();
    await db.update(taskProgress).set({
      status:       body.status      ? (body.status as TaskStatus) : undefined,
      completedAt:  body.status === "completed" && !body.completedAt ? now
                  : body.completedAt ? new Date(body.completedAt) : undefined,
      nextDueAt:    body.nextDueAt   ? new Date(body.nextDueAt)   : undefined,
      evidenceNote: body.evidenceNote,
      completedBy:  body.completedBy,
    }).where(and(
      eq(taskProgress.id, params.id),
      eq(taskProgress.householdId, params.householdId),
      isNull(taskProgress.archivedAt)
    ));
    return db.query.taskProgress.findFirst({
      where: and(
        eq(taskProgress.id, params.id),
        eq(taskProgress.householdId, params.householdId),
        isNull(taskProgress.archivedAt)
      ),
    });
  }, {
    body: t.Partial(t.Object({
      status:       t.String(),
      completedAt:  t.String(),
      nextDueAt:    t.String(),
      evidenceNote: t.String(),
      completedBy:  t.String(),
    })),
    detail: { summary: "Update task progress (check/uncheck)" },
  });
