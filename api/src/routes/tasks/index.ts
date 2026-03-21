import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { tasks, taskDependencies, taskProgress } from "../../db/schema";
import { eq, isNull, and, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin, requireAuth, requireHouseholdScope } from "../../lib/routeAuth";

// ISO-8601 datetime / date validation (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss[.sss]Z)
const ISO8601_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z)?$/;
function parseISODate(value: string, fieldName: string): Date {
  if (!ISO8601_RE.test(value)) {
    throw new Error(`${fieldName} must be ISO-8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)`);
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new Error(`${fieldName} is not a valid date`);
  }
  return d;
}

async function unresolvedTaskDependencies(householdId: string, taskId: string) {
  const dependencies = await db.query.taskDependencies.findMany({
    where: eq(taskDependencies.taskId, taskId),
  });
  if (dependencies.length === 0) return [];

  const dependencyIds = [...new Set(dependencies.map((d) => d.dependsOnTaskId))];

  const progressRows = await db.query.taskProgress.findMany({
    where: and(
      eq(taskProgress.householdId, householdId),
      isNull(taskProgress.archivedAt),
      inArray(taskProgress.taskId, dependencyIds)
    ),
  });

  const completedIds = new Set(
    progressRows.filter((row) => row.status === "completed").map((row) => row.taskId)
  );

  const unresolvedIds = dependencyIds.filter((id) => !completedIds.has(id));
  if (unresolvedIds.length === 0) return [];

  const unresolvedTasks = await db.query.tasks.findMany({
    where: and(isNull(tasks.archivedAt), inArray(tasks.id, unresolvedIds)),
  });

  const titleById = new Map(unresolvedTasks.map((row) => [row.id, row.title]));
  return unresolvedIds.map((id) => ({ id, title: titleById.get(id) ?? "Unknown task" }));
}

export const tasksRoute = new Elysia({ prefix: "/tasks", tags: ["tasks"] })

  .get(
    "/",
    async ({ request, set, query }) => {
      const claims = requireAuth(request, set);
      if (!claims) return { error: "Unauthorized" };

      const conditions: ReturnType<typeof eq>[] = [isNull(tasks.archivedAt)];

      if (query.moduleId) {
        conditions.push(eq(tasks.moduleId, query.moduleId));
      }
      if (query.readinessLevel) {
        conditions.push(eq(tasks.readinessLevel, query.readinessLevel!));
      }
      if (query.scenario) {
        conditions.push(eq(tasks.scenario, query.scenario!));
      }

      const rows = await db.query.tasks.findMany({
        where: and(...conditions),
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
    },
    {
      query: t.Object({
        moduleId: t.Optional(t.String({ minLength: 36, maxLength: 36 })),
        readinessLevel: t.Optional(
          t.Union([
            t.Literal("l1_72h"),
            t.Literal("l2_14d"),
            t.Literal("l3_30d"),
            t.Literal("l4_90d"),
          ])
        ),
        scenario: t.Optional(
          t.Union([t.Literal("both"), t.Literal("shelter_in_place"), t.Literal("evacuation")])
        ),
      }),
      detail: { summary: "List all tasks" },
    }
  )

  .get(
    "/by-id/:id",
    async ({ request, params, set }) => {
      const claims = requireAuth(request, set);
      if (!claims) return { error: "Unauthorized" };

      const row = await db.query.tasks.findFirst({
        where: and(eq(tasks.id, params.id), isNull(tasks.archivedAt)),
      });
      if (!row) {
        set.status = 404;
        return { error: "Task not found" };
      }
      return row;
    },
    { detail: { summary: "Get a task by ID" } }
  )

  .get(
    "/by-id/:id/dependencies",
    async ({ request, set, params }) => {
      const claims = requireAuth(request, set);
      if (!claims) return { error: "Unauthorized" };

      const dependencyRows = await db.query.taskDependencies.findMany({
        where: eq(taskDependencies.taskId, params.id),
      });
      if (dependencyRows.length === 0) return [];

      const dependencyIds = [...new Set(dependencyRows.map((row) => row.dependsOnTaskId))];
      const dependencyTasks = await db.query.tasks.findMany({
        where: and(isNull(tasks.archivedAt), inArray(tasks.id, dependencyIds)),
      });
      const taskById = new Map(dependencyTasks.map((row) => [row.id, row]));

      return dependencyRows.map((row) => ({
        ...row,
        dependsOnTask: taskById.get(row.dependsOnTaskId) ?? null,
      }));
    },
    { detail: { summary: "List dependencies for a task" } }
  )

  .post(
    "/by-id/:id/dependencies",
    async ({ request, set, params, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      if (params.id === body.dependsOnTaskId) {
        set.status = 400;
        return { error: "Task cannot depend on itself" };
      }

      const [task, dependsOn] = await Promise.all([
        db.query.tasks.findFirst({ where: and(eq(tasks.id, params.id), isNull(tasks.archivedAt)) }),
        db.query.tasks.findFirst({
          where: and(eq(tasks.id, body.dependsOnTaskId), isNull(tasks.archivedAt)),
        }),
      ]);

      if (!task || !dependsOn) {
        set.status = 404;
        return { error: "Task or dependency task not found" };
      }

      const existing = await db.query.taskDependencies.findFirst({
        where: and(
          eq(taskDependencies.taskId, params.id),
          eq(taskDependencies.dependsOnTaskId, body.dependsOnTaskId)
        ),
      });
      if (existing) {
        set.status = 409;
        return { error: "Dependency already exists" };
      }

      const id = randomUUID();
      await db.insert(taskDependencies).values({
        id,
        taskId: params.id,
        dependsOnTaskId: body.dependsOnTaskId,
      });
      return db.query.taskDependencies.findFirst({ where: eq(taskDependencies.id, id) });
    },
    {
      body: t.Object({
        dependsOnTaskId: t.String({ minLength: 36, maxLength: 36 }),
      }),
      detail: { summary: "Add a dependency edge for a task" },
    }
  )

  .post(
    "/",
    async ({ request, set, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      const id = randomUUID();
      await db.insert(tasks).values({
        id,
        moduleId: body.moduleId,
        sectionId: body.sectionId,
        title: body.title,
        description: body.description,
        taskClass: body.taskClass,
        readinessLevel: body.readinessLevel,
        scenario: body.scenario,
        isRecurring: body.isRecurring,
        recurDays: body.recurDays,
        sortOrder: body.sortOrder,
        evidencePrompt: body.evidencePrompt,
      });
      return db.query.tasks.findFirst({ where: eq(tasks.id, id) });
    },
    {
      body: t.Object({
        moduleId: t.String({ minLength: 36, maxLength: 36 }),
        sectionId: t.Optional(t.String({ minLength: 36, maxLength: 36 })),
        title: t.String({ minLength: 1, maxLength: 500 }),
        description: t.Optional(t.String({ maxLength: 10000 })),
        taskClass: t.Optional(
          t.Union([
            t.Literal("acquire"),
            t.Literal("prepare"),
            t.Literal("test"),
            t.Literal("maintain"),
            t.Literal("document"),
          ])
        ),
        readinessLevel: t.Optional(
          t.Union([
            t.Literal("l1_72h"),
            t.Literal("l2_14d"),
            t.Literal("l3_30d"),
            t.Literal("l4_90d"),
          ])
        ),
        scenario: t.Optional(
          t.Union([t.Literal("both"), t.Literal("shelter_in_place"), t.Literal("evacuation")])
        ),
        isRecurring: t.Optional(t.Boolean()),
        recurDays: t.Optional(t.Number({ minimum: 1, maximum: 3650 })),
        sortOrder: t.Optional(t.Number({ minimum: -10000, maximum: 10000 })),
        evidencePrompt: t.Optional(t.String({ maxLength: 500 })),
      }),
      detail: { summary: "Create a task" },
    }
  )

  .patch(
    "/by-id/:id",
    async ({ request, set, params, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      const row = await db.transaction(async (tx) => {
        const existing = await tx.query.tasks.findFirst({
          where: and(eq(tasks.id, params.id), isNull(tasks.archivedAt)),
        });
        if (!existing) return null;

        await tx
          .update(tasks)
          .set({
            moduleId: body.moduleId,
            sectionId: body.sectionId,
            title: body.title,
            description: body.description,
            taskClass: body.taskClass,
            readinessLevel: body.readinessLevel,
            scenario: body.scenario,
            isRecurring: body.isRecurring,
            recurDays: body.recurDays,
            sortOrder: body.sortOrder,
            evidencePrompt: body.evidencePrompt,
          })
          .where(and(eq(tasks.id, params.id), isNull(tasks.archivedAt)));

        return tx.query.tasks.findFirst({
          where: and(eq(tasks.id, params.id), isNull(tasks.archivedAt)),
        });
      });

      if (!row) {
        set.status = 404;
        return { error: "Task not found" };
      }
      return row;
    },
    {
      body: t.Partial(
        t.Object({
          moduleId: t.String({ minLength: 36, maxLength: 36 }),
          sectionId: t.String({ minLength: 36, maxLength: 36 }),
          title: t.String({ minLength: 1, maxLength: 500 }),
          description: t.String({ maxLength: 10000 }),
          taskClass: t.Union([
            t.Literal("acquire"),
            t.Literal("prepare"),
            t.Literal("test"),
            t.Literal("maintain"),
            t.Literal("document"),
          ]),
          readinessLevel: t.Union([
            t.Literal("l1_72h"),
            t.Literal("l2_14d"),
            t.Literal("l3_30d"),
            t.Literal("l4_90d"),
          ]),
          scenario: t.Union([
            t.Literal("both"),
            t.Literal("shelter_in_place"),
            t.Literal("evacuation"),
          ]),
          isRecurring: t.Boolean(),
          recurDays: t.Number({ minimum: 1, maximum: 3650 }),
          sortOrder: t.Number({ minimum: -10000, maximum: 10000 }),
          evidencePrompt: t.String({ maxLength: 500 }),
        })
      ),
      detail: { summary: "Update a task" },
    }
  )

  // Task progress (ticksheet)
  .get(
    "/:householdId/progress",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      return db.query.taskProgress.findMany({
        where: and(
          eq(taskProgress.householdId, params.householdId),
          isNull(taskProgress.archivedAt)
        ),
      });
    },
    { detail: { summary: "Get all task progress for a household" } }
  )

  .post(
    "/:householdId/progress",
    async ({ request, set, params, body }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      // Validate date strings before any DB work
      let parsedCompletedAt: Date | undefined;
      let parsedNextDueAt: Date | undefined;
      try {
        if (body.completedAt) parsedCompletedAt = parseISODate(body.completedAt, "completedAt");
        if (body.nextDueAt) parsedNextDueAt = parseISODate(body.nextDueAt, "nextDueAt");
      } catch (err: any) {
        set.status = 400;
        return { error: err.message };
      }

      const existing = await db.query.taskProgress.findFirst({
        where: and(
          eq(taskProgress.householdId, params.householdId),
          eq(taskProgress.taskId, body.taskId),
          isNull(taskProgress.archivedAt)
        ),
      });

      if (existing) {
        const nextStatus = body.status ?? existing.status;
        if (nextStatus === "completed") {
          const unresolved = await unresolvedTaskDependencies(params.householdId, body.taskId);
          if (unresolved.length > 0) {
            set.status = 409;
            return {
              error: "Task has incomplete dependencies",
              unresolvedDependencies: unresolved,
            };
          }
        }

        const now = new Date();
        const nextCompletedAt = parsedCompletedAt
          ? parsedCompletedAt
          : nextStatus === "completed"
            ? (existing.completedAt ?? now)
            : null;

        await db
          .update(taskProgress)
          .set({
            status: nextStatus,
            completedAt: nextCompletedAt,
            nextDueAt: parsedNextDueAt ?? existing.nextDueAt,
            evidenceNote: body.evidenceNote ?? existing.evidenceNote,
            completedBy: body.completedBy ?? existing.completedBy,
          })
          .where(
            and(
              eq(taskProgress.id, existing.id),
              eq(taskProgress.householdId, params.householdId),
              isNull(taskProgress.archivedAt)
            )
          );

        return db.query.taskProgress.findFirst({
          where: and(
            eq(taskProgress.id, existing.id),
            eq(taskProgress.householdId, params.householdId),
            isNull(taskProgress.archivedAt)
          ),
        });
      }

      if (body.status === "completed") {
        const unresolved = await unresolvedTaskDependencies(params.householdId, body.taskId);
        if (unresolved.length > 0) {
          set.status = 409;
          return {
            error: "Task has incomplete dependencies",
            unresolvedDependencies: unresolved,
          };
        }
      }

      const id = randomUUID();
      await db.insert(taskProgress).values({
        id,
        householdId: params.householdId,
        taskId: body.taskId,
        status: body.status,
        completedAt: parsedCompletedAt,
        nextDueAt: parsedNextDueAt,
        evidenceNote: body.evidenceNote,
        completedBy: body.completedBy,
      });
      return db.query.taskProgress.findFirst({ where: eq(taskProgress.id, id) });
    },
    {
      body: t.Object({
        taskId: t.String({ minLength: 36, maxLength: 36 }),
        status: t.Optional(
          t.Union([
            t.Literal("pending"),
            t.Literal("in_progress"),
            t.Literal("completed"),
            t.Literal("overdue"),
          ])
        ),
        completedAt: t.Optional(t.String({ maxLength: 64 })),
        nextDueAt: t.Optional(t.String({ maxLength: 64 })),
        evidenceNote: t.Optional(t.String({ maxLength: 10000 })),
        completedBy: t.Optional(t.String({ maxLength: 255 })),
      }),
      detail: { summary: "Create or update task progress entry" },
    }
  )

  .patch(
    "/:householdId/progress/:id",
    async ({ request, set, params, body }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      // Validate date strings before any DB work
      let parsedCompletedAt: Date | undefined;
      let parsedNextDueAt: Date | undefined;
      try {
        if (body.completedAt) parsedCompletedAt = parseISODate(body.completedAt, "completedAt");
        if (body.nextDueAt) parsedNextDueAt = parseISODate(body.nextDueAt, "nextDueAt");
      } catch (err: any) {
        set.status = 400;
        return { error: err.message };
      }

      const existing = await db.query.taskProgress.findFirst({
        where: and(
          eq(taskProgress.id, params.id),
          eq(taskProgress.householdId, params.householdId),
          isNull(taskProgress.archivedAt)
        ),
      });
      if (!existing) {
        set.status = 404;
        return { error: "Task progress not found" };
      }

      const nextStatus = body.status ?? existing.status;
      if (nextStatus === "completed") {
        const unresolved = await unresolvedTaskDependencies(params.householdId, existing.taskId);
        if (unresolved.length > 0) {
          set.status = 409;
          return {
            error: "Task has incomplete dependencies",
            unresolvedDependencies: unresolved,
          };
        }
      }

      const now = new Date();
      await db
        .update(taskProgress)
        .set({
          status: body.status,
          completedAt:
            body.status === "completed" && !parsedCompletedAt
              ? now
              : (parsedCompletedAt ?? undefined),
          nextDueAt: parsedNextDueAt,
          evidenceNote: body.evidenceNote,
          completedBy: body.completedBy,
        })
        .where(
          and(
            eq(taskProgress.id, params.id),
            eq(taskProgress.householdId, params.householdId),
            isNull(taskProgress.archivedAt)
          )
        );
      return db.query.taskProgress.findFirst({
        where: and(
          eq(taskProgress.id, params.id),
          eq(taskProgress.householdId, params.householdId),
          isNull(taskProgress.archivedAt)
        ),
      });
    },
    {
      body: t.Partial(
        t.Object({
          status: t.Union([
            t.Literal("pending"),
            t.Literal("in_progress"),
            t.Literal("completed"),
            t.Literal("overdue"),
          ]),
          completedAt: t.String({ maxLength: 64 }),
          nextDueAt: t.String({ maxLength: 64 }),
          evidenceNote: t.String({ maxLength: 10000 }),
          completedBy: t.String({ maxLength: 255 }),
        })
      ),
      detail: { summary: "Update task progress (check/uncheck)" },
    }
  );
