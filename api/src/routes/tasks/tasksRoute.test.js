import { describe, expect, it, mock } from "bun:test";
import { Elysia } from "elysia";

const state = {
  task: {
    id: "task-1",
    moduleId: "12345678-1234-1234-1234-123456789012",
    sectionId: null,
    title: "Initial task",
    description: null,
    taskClass: "acquire",
    readinessLevel: "l1_72h",
    scenario: "both",
    isRecurring: false,
    recurDays: null,
    sortOrder: 0,
    evidencePrompt: null,
  },
};

mock.module("../../db/client", () => ({
  db: {
    insert: () => ({
      values: async (values) => {
        state.task = { ...state.task, ...values };
      },
    }),
    update: () => ({
      set: (values) => ({
        where: async () => {
          state.task = { ...state.task, ...values };
        },
      }),
    }),
    query: {
      tasks: {
        findMany: async () => [state.task],
        findFirst: async () => state.task,
      },
      taskProgress: {
        findMany: async () => [],
        findFirst: async () => null,
      },
    },
  },
}));

mock.module("../../lib/routeAuth", () => ({
  requireAdmin: () => ({ sub: "user-1", isAdmin: true }),
  requireHouseholdScope: () => ({ sub: "user-1", isAdmin: false, householdId: "household-1" }),
}));

const { tasksRoute } = await import("./index");
const app = new Elysia().use(tasksRoute);

describe("tasksRoute critical CRUD", () => {
  it("creates a task with valid payload", async () => {
    const res = await app.handle(
      new Request("http://localhost/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          moduleId: "12345678-1234-1234-1234-123456789012",
          title: "Store water containers",
          taskClass: "acquire",
          readinessLevel: "l1_72h",
          scenario: "both",
          isRecurring: false,
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Store water containers");
  });

  it("updates a task with valid partial payload", async () => {
    const res = await app.handle(
      new Request("http://localhost/tasks/by-id/task-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Rotate water containers",
          sortOrder: 10,
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Rotate water containers");
    expect(body.sortOrder).toBe(10);
  });

  it("rejects task creation when title exceeds max length", async () => {
    const res = await app.handle(
      new Request("http://localhost/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          moduleId: "12345678-1234-1234-1234-123456789012",
          title: "x".repeat(501),
        }),
      })
    );

    expect(res.status).toBe(422);
  });

  it("rejects progress create when taskId is malformed", async () => {
    const res = await app.handle(
      new Request("http://localhost/tasks/household-1/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          taskId: "bad-id",
          status: "completed",
        }),
      })
    );

    expect(res.status).toBe(422);
  });
});
