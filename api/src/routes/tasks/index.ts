import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { tasks, taskDependencies, taskProgress } from "../../db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { randomUUID } from "crypto";

type TaskClass = "acquire" | "prepare" | "test" | "maintain" | "document";
type ReadinessLevel = "l1_72h" | "l2_14d" | "l3_30d" | "l4_90d";
type TaskScenario = "both" | "shelter_in_place" | "evacuation";
type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";

export const tasksRoute = new Elysia({ prefix: "/tasks", tags: ["tasks"] })

  .get("/", async ({ query }) => {
    return db.query.tasks.findMany({
      where: isNull(tasks.archivedAt),
      orderBy: tasks.sortOrder,
    });
  }, { detail: { summary: "List all tasks" } })

  .get("/:id", async ({ params }) => {
    const row = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, params.id), isNull(tasks.archivedAt)),
    });
    if (!row) throw new Error("Task not found");
    return row;
  }, { detail: { summary: "Get a task by ID" } })

  .post("/", async ({ body }) => {
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

  // Task progress (ticksheet)
  .get("/progress/:householdId", async ({ params }) => {
    return db.query.taskProgress.findMany({
      where: and(
        eq(taskProgress.householdId, params.householdId),
        isNull(taskProgress.archivedAt)
      ),
    });
  }, { detail: { summary: "Get all task progress for a household" } })

  .post("/progress", async ({ body }) => {
    const id = randomUUID();
    await db.insert(taskProgress).values({
      id,
      householdId:  body.householdId,
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
      householdId:  t.String(),
      taskId:       t.String(),
      status:       t.Optional(t.String()),
      completedAt:  t.Optional(t.String()),
      nextDueAt:    t.Optional(t.String()),
      evidenceNote: t.Optional(t.String()),
      completedBy:  t.Optional(t.String()),
    }),
    detail: { summary: "Create or update task progress entry" },
  })

  .patch("/progress/:id", async ({ params, body }) => {
    const now = new Date();
    await db.update(taskProgress).set({
      status:       body.status      ? (body.status as TaskStatus) : undefined,
      completedAt:  body.status === "completed" && !body.completedAt ? now
                  : body.completedAt ? new Date(body.completedAt) : undefined,
      nextDueAt:    body.nextDueAt   ? new Date(body.nextDueAt)   : undefined,
      evidenceNote: body.evidenceNote,
      completedBy:  body.completedBy,
    }).where(eq(taskProgress.id, params.id));
    return db.query.taskProgress.findFirst({ where: eq(taskProgress.id, params.id) });
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
