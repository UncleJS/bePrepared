import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { inventoryItems, inventoryLots, inventoryCategories } from "../../db/schema";
import { eq, isNull, and, lte, gte } from "drizzle-orm";
import { randomUUID } from "crypto";

export const inventoryRoute = new Elysia({ prefix: "/inventory", tags: ["inventory"] })

  .get("/categories", async () => {
    return db.query.inventoryCategories.findMany({
      where: isNull(inventoryCategories.archivedAt),
      orderBy: inventoryCategories.sortOrder,
    });
  }, { detail: { summary: "List inventory categories" } })

  .get("/:householdId/items", async ({ params }) => {
    return db.query.inventoryItems.findMany({
      where: and(
        eq(inventoryItems.householdId, params.householdId),
        isNull(inventoryItems.archivedAt)
      ),
      with: {
        lots: {
          where: isNull(inventoryLots.archivedAt),
        },
      },
    });
  }, { detail: { summary: "List all inventory items for a household" } })

  .post("/:householdId/items", async ({ params, body }) => {
    const id = randomUUID();
    await db.insert(inventoryItems).values({
      id,
      householdId:        params.householdId,
      name:               body.name,
      categoryId:         body.categoryId,
      description:        body.description,
      unit:               body.unit,
      location:           body.location,
      targetQty:          body.targetQty != null ? String(body.targetQty) : undefined,
      lowStockThreshold:  body.lowStockThreshold != null ? String(body.lowStockThreshold) : undefined,
      defaultReplaceDays: body.defaultReplaceDays,
      isTrackedByExpiry:  body.isTrackedByExpiry,
      notes:              body.notes,
    });
    return db.query.inventoryItems.findFirst({ where: eq(inventoryItems.id, id) });
  }, {
    body: t.Object({
      name:               t.String({ minLength: 1 }),
      categoryId:         t.Optional(t.String()),
      description:        t.Optional(t.String()),
      unit:               t.Optional(t.String()),
      location:           t.Optional(t.String()),
      targetQty:          t.Optional(t.Number()),
      lowStockThreshold:  t.Optional(t.Number()),
      defaultReplaceDays: t.Optional(t.Number()),
      isTrackedByExpiry:  t.Optional(t.Boolean()),
      notes:              t.Optional(t.String()),
    }),
    detail: { summary: "Create an inventory item" },
  })

  .patch("/:householdId/items/:itemId", async ({ params, body }) => {
    await db.update(inventoryItems).set({
      name:               body.name,
      categoryId:         body.categoryId,
      description:        body.description,
      unit:               body.unit,
      location:           body.location,
      targetQty:          body.targetQty != null ? String(body.targetQty) : undefined,
      lowStockThreshold:  body.lowStockThreshold != null ? String(body.lowStockThreshold) : undefined,
      defaultReplaceDays: body.defaultReplaceDays,
      isTrackedByExpiry:  body.isTrackedByExpiry,
      notes:              body.notes,
    }).where(eq(inventoryItems.id, params.itemId));
    return db.query.inventoryItems.findFirst({ where: eq(inventoryItems.id, params.itemId) });
  }, {
    body: t.Partial(t.Object({
      name:               t.String(),
      categoryId:         t.String(),
      description:        t.String(),
      unit:               t.String(),
      location:           t.String(),
      targetQty:          t.Number(),
      lowStockThreshold:  t.Number(),
      defaultReplaceDays: t.Number(),
      isTrackedByExpiry:  t.Boolean(),
      notes:              t.String(),
    })),
    detail: { summary: "Update an inventory item" },
  })

  .delete("/:householdId/items/:itemId", async ({ params }) => {
    await db.update(inventoryItems)
      .set({ archivedAt: new Date() })
      .where(eq(inventoryItems.id, params.itemId));
    return { archived: true };
  }, { detail: { summary: "Archive an inventory item" } })

  // Lots (batches)
  .post("/:householdId/items/:itemId/lots", async ({ params, body }) => {
    const id = randomUUID();
    const replaceDays = body.replaceDays ?? undefined;
    const nextReplaceAt = replaceDays && body.acquiredAt
      ? new Date(new Date(body.acquiredAt).getTime() + replaceDays * 86400000)
      : undefined;
    await db.insert(inventoryLots).values({
      id,
      itemId:       params.itemId,
      householdId:  params.householdId,
      qty:          String(body.qty),
      acquiredAt:   body.acquiredAt ? new Date(body.acquiredAt) : undefined,
      expiresAt:    body.expiresAt  ? new Date(body.expiresAt)  : undefined,
      replaceDays:  body.replaceDays,
      nextReplaceAt,
      batchRef:     body.batchRef,
      notes:        body.notes,
    });
    return db.query.inventoryLots.findFirst({ where: eq(inventoryLots.id, id) });
  }, {
    body: t.Object({
      qty:          t.Number({ minimum: 0 }),
      acquiredAt:   t.Optional(t.String()),
      expiresAt:    t.Optional(t.String()),
      replaceDays:  t.Optional(t.Number()),
      batchRef:     t.Optional(t.String()),
      notes:        t.Optional(t.String()),
    }),
    detail: { summary: "Add a lot (batch) to an inventory item" },
  })

  .delete("/:householdId/items/:itemId/lots/:lotId", async ({ params }) => {
    await db.update(inventoryLots)
      .set({ archivedAt: new Date() })
      .where(eq(inventoryLots.id, params.lotId));
    return { archived: true };
  }, { detail: { summary: "Archive (consume/dispose) a lot" } })

  // Expiry summary — lots expiring within N days
  .get("/:householdId/expiring", async ({ params, query }) => {
    const days = Number(query.days ?? 30);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const today = new Date();
    return db.query.inventoryLots.findMany({
      where: and(
        eq(inventoryLots.householdId, params.householdId),
        isNull(inventoryLots.archivedAt),
        lte(inventoryLots.expiresAt, cutoff),
        gte(inventoryLots.expiresAt, today)
      ),
    });
  }, {
    query: t.Object({ days: t.Optional(t.String()) }),
    detail: { summary: "Get lots expiring within N days" },
  });
