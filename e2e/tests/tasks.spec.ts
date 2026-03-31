import { expect, test, type Locator } from "@playwright/test";
import { createApiClient } from "../fixtures/api";

function readCompletedCount(text: string | null): number {
  const match = text?.match(/(\d+)\/(\d+) tasks/);
  if (!match) {
    throw new Error(`Unable to parse task progress from: ${text ?? "<empty>"}`);
  }
  return Number(match[1]);
}

async function getCompletedCount(header: Locator): Promise<number> {
  return readCompletedCount(await header.textContent());
}

test("toggles a seeded task from the level 1 ticksheet", async ({ page }) => {
  const api = await createApiClient();
  const tasks = await api.listTasks();
  const progressRows = await api.listTaskProgress();

  let candidate = null as null | { id: string; title: string; initialStatus: string | null };
  for (const task of tasks.filter((row) => row.readinessLevel === "l1_72h")) {
    const dependencies = await api.listTaskDependencies(task.id);
    if (dependencies.length > 0) continue;

    const existingProgress = progressRows.find((row) => row.taskId === task.id) ?? null;
    candidate = {
      id: task.id,
      title: task.title,
      initialStatus: existingProgress?.status ?? null,
    };
    break;
  }

  if (!candidate) {
    await api.dispose();
    throw new Error("No seeded level 1 task without dependencies was found.");
  }

  try {
    await page.goto("/tasks");

    const levelHeader = page.getByRole("button", { name: /Level 1 - 72 Hours/ }).first();
    const beforeCount = await getCompletedCount(levelHeader);
    const expectedAfterToggle =
      candidate.initialStatus === "completed" ? beforeCount - 1 : beforeCount + 1;

    const taskRow = page.locator("li", { hasText: candidate.title }).first();
    await taskRow.locator("button").first().click();

    await expect
      .poll(async () => getCompletedCount(levelHeader), {
        message: "task count updates after toggle",
      })
      .toBe(expectedAfterToggle);

    await taskRow.locator("button").first().click();
    await expect
      .poll(async () => getCompletedCount(levelHeader), {
        message: "task count returns after second toggle",
      })
      .toBe(beforeCount);
  } finally {
    const refreshedProgress = await api.listTaskProgress();
    const currentProgress = refreshedProgress.find((row) => row.taskId === candidate?.id) ?? null;

    if (currentProgress) {
      const restoreStatus = candidate.initialStatus === "completed" ? "completed" : "pending";
      await api.updateTaskProgress(currentProgress.id, { status: restoreStatus });
    }

    await api.dispose();
  }
});
