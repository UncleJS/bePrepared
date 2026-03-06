import { describe, expect, it, mock } from "bun:test";
import { Elysia } from "elysia";

const state = {
  task: {
    id: "11111111-1111-1111-1111-111111111111",
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
  dependencyTask: {
    id: "22222222-2222-2222-2222-222222222222",
    moduleId: "12345678-1234-1234-1234-123456789012",
    sectionId: null,
    title: "Dependency task",
    description: null,
    taskClass: "prepare",
    readinessLevel: "l1_72h",
    scenario: "both",
    isRecurring: false,
    recurDays: null,
    sortOrder: 1,
    evidencePrompt: null,
  },
  dependencies: [],
};

const dbMock = {
  insert: () => ({
    values: async (values) => {
      if (values.taskId && values.dependsOnTaskId) {
        state.dependencies.push({
          id: values.id,
          taskId: values.taskId,
          dependsOnTaskId: values.dependsOnTaskId,
          createdAt: new Date(),
        });
        return;
      }
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
  transaction: async (fn) => fn(dbMock),
  query: {
    tasks: {
      findMany: async () => [state.task, state.dependencyTask],
      findFirst: async ({ where } = {}) => {
        void where;
        return state.task;
      },
    },
    taskDependencies: {
      findMany: async ({ where } = {}) => {
        void where;
        return state.dependencies;
      },
      findFirst: async ({ where } = {}) => {
        void where;
        return null;
      },
    },
    taskProgress: {
      findMany: async () => [],
      findFirst: async () => null,
    },
  },
};

mock.module("../../db/client", () => ({ db: dbMock }));

mock.module("../../lib/routeAuth", () => ({
  requireAuth: () => ({ sub: "user-1", isAdmin: false, householdId: "household-1" }),
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
      new Request("http://localhost/tasks/by-id/11111111-1111-1111-1111-111111111111", {
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

  it("blocks completion when dependency task is not completed", async () => {
    state.dependencies = [
      {
        id: "dep-1",
        taskId: "11111111-1111-1111-1111-111111111111",
        dependsOnTaskId: "22222222-2222-2222-2222-222222222222",
        createdAt: new Date(),
      },
    ];

    const res = await app.handle(
      new Request("http://localhost/tasks/household-1/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          taskId: "11111111-1111-1111-1111-111111111111",
          status: "completed",
        }),
      })
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Task has incomplete dependencies");
    expect(Array.isArray(body.unresolvedDependencies)).toBe(true);
  });
});
