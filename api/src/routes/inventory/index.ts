import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { inventoryItems, inventoryLots, inventoryCategories } from "../../db/schema";
import { eq, isNull, and, lte, gte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireHouseholdScope } from "../../lib/routeAuth";
import {
  isAllowedCategoryForHousehold,
  isCustomCategoryForHousehold,
} from "../_shared/categoryHelpers";

export const inventoryRoute = new Elysia({ prefix: "/inventory", tags: ["inventory"] })

  .get(
    "/categories",
    async ({ request, set }) => {
      const claims = requireAuth(request, set);
      if (!claims) return { error: "Unauthorized" };

      return db.query.inventoryCategories.findMany({
        where: and(
          isNull(inventoryCategories.householdId),
          eq(inventoryCategories.isSystem, true),
          isNull(inventoryCategories.archivedAt)
        ),
        orderBy: inventoryCategories.sortOrder,
      });
    },
    { detail: { summary: "List inventory categories" } }
  )

  .get(
    "/:householdId/categories",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      return db.query.inventoryCategories
        .findMany({
          where: and(
            isNull(inventoryCategories.archivedAt),
            eq(inventoryCategories.isSystem, true)
          ),
          orderBy: inventoryCategories.sortOrder,
        })
        .then(async (systemRows) => {
          const customRows = await db.query.inventoryCategories.findMany({
            where: and(
              eq(inventoryCategories.householdId, params.householdId),
              isNull(inventoryCategories.archivedAt)
            ),
            orderBy: inventoryCategories.sortOrder,
          });
          return [...systemRows, ...customRows];
        });
    },
    { detail: { summary: "List inventory categories for household (system + custom)" } }
  )

  .post(
    "/:householdId/categories",
    async ({ request, set, params, body }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const id = randomUUID();
      await db.insert(inventoryCategories).values({
        id,
        householdId: params.householdId,
        isSystem: false,
        name: body.name,
        slug: body.slug,
        sortOrder: body.sortOrder ?? 100,
      });
      return db.query.inventoryCategories.findFirst({ where: eq(inventoryCategories.id, id) });
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        slug: t.String({ minLength: 1, maxLength: 100 }),
        sortOrder: t.Optional(t.Number({ minimum: -10000, maximum: 10000 })),
      }),
      detail: { summary: "Create custom inventory category" },
    }
  )

  .patch(
    "/:householdId/categories/:categoryId",
    async ({ request, set, params, body }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const cat = await db.query.inventoryCategories.findFirst({
        where: eq(inventoryCategories.id, params.categoryId),
      });
      if (!isCustomCategoryForHousehold(cat, params.householdId)) {
        set.status = 404;
        return { error: "Custom category not found" };
      }

      await db
        .update(inventoryCategories)
        .set({ name: body.name, slug: body.slug, sortOrder: body.sortOrder })
        .where(eq(inventoryCategories.id, params.categoryId));
      return db.query.inventoryCategories.findFirst({
        where: eq(inventoryCategories.id, params.categoryId),
      });
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String({ minLength: 1, maxLength: 255 }),
          slug: t.String({ minLength: 1, maxLength: 100 }),
          sortOrder: t.Number({ minimum: -10000, maximum: 10000 }),
        })
      ),
      detail: { summary: "Update custom inventory category" },
    }
  )

  .delete(
    "/:householdId/categories/:categoryId",
    async ({ request, set, params, query }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const cat = await db.query.inventoryCategories.findFirst({
        where: eq(inventoryCategories.id, params.categoryId),
      });
      if (!isCustomCategoryForHousehold(cat, params.householdId)) {
        set.status = 404;
        return { error: "Custom category not found" };
      }

      const linkedItems = await db.query.inventoryItems.findMany({
        where: and(
          eq(inventoryItems.householdId, params.householdId),
          eq(inventoryItems.categoryId, params.categoryId),
          isNull(inventoryItems.archivedAt)
        ),
      });

      if (linkedItems.length > 0) {
        if (!query.replacementCategoryId) {
          set.status = 409;
          return {
            error: "Category has active inventory items",
            activeItemCount: linkedItems.length,
            hint: "Provide replacementCategoryId to reassign items before archiving",
          };
        }

        if (query.replacementCategoryId === params.categoryId) {
          set.status = 400;
          return { error: "replacementCategoryId must be different from archived category" };
        }
      }

      const replacementCategoryId = query.replacementCategoryId;
      const txResult = await db.transaction(async (tx) => {
        if (linkedItems.length > 0 && replacementCategoryId) {
          const replacementRows = await tx
            .select()
            .from(inventoryCategories)
            .where(eq(inventoryCategories.id, replacementCategoryId))
            .limit(1);
          const replacement = replacementRows[0];
          const replacementAllowed = isAllowedCategoryForHousehold(
            replacement,
            params.householdId
          );
          if (!replacementAllowed) {
            return { error: "Invalid replacement category for household" } as const;
          }

          await tx
            .update(inventoryItems)
            .set({ categoryId: replacementCategoryId })
            .where(
              and(
                eq(inventoryItems.householdId, params.householdId),
                eq(inventoryItems.categoryId, params.categoryId),
                isNull(inventoryItems.archivedAt)
              )
            );
        }

        await tx
          .update(inventoryCategories)
          .set({ archivedAt: new Date() })
          .where(eq(inventoryCategories.id, params.categoryId));

        return { archived: true } as const;
      });

      if ("error" in txResult) {
        set.status = 400;
        return { error: txResult.error };
      }

      return { archived: true };
    },
    {
      query: t.Object({
        replacementCategoryId: t.Optional(t.String({ minLength: 36, maxLength: 36 })),
      }),
      detail: { summary: "Archive custom inventory category" },
    }
  )

  .get(
    "/:householdId/items",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const items = await db.query.inventoryItems.findMany({
        where: and(
          eq(inventoryItems.householdId, params.householdId),
          isNull(inventoryItems.archivedAt)
        ),
      });

      const lots = await db.query.inventoryLots.findMany({
        where: and(
          eq(inventoryLots.householdId, params.householdId),
          isNull(inventoryLots.archivedAt)
        ),
      });

      return items.map((item) => ({
        ...item,
        lots: lots.filter((lot) => lot.itemId === item.id),
      }));
    },
    { detail: { summary: "List all inventory items for a household" } }
  )

  .post(
    "/:householdId/items",
    async ({ request, set, params, body }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      if (body.categoryId) {
        const category = await db.query.inventoryCategories.findFirst({
          where: eq(inventoryCategories.id, body.categoryId),
        });
        const allowed = isAllowedCategoryForHousehold(category, params.householdId);
        if (!allowed) {
          set.status = 400;
          return { error: "Invalid category for household" };
        }
      }

      const id = randomUUID();
      await db.insert(inventoryItems).values({
        id,
        householdId: params.householdId,
        name: body.name,
        categoryId: body.categoryId,
        description: body.description,
        unit: body.unit,
        location: body.location,
        targetQty: body.targetQty != null ? String(body.targetQty) : undefined,
        lowStockThreshold:
          body.lowStockThreshold != null ? String(body.lowStockThreshold) : undefined,
        defaultReplaceDays: body.defaultReplaceDays,
        isTrackedByExpiry: body.isTrackedByExpiry,
        notes: body.notes,
      });
      return db.query.inventoryItems.findFirst({ where: eq(inventoryItems.id, id) });
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 500 }),
        categoryId: t.Optional(t.String({ minLength: 36, maxLength: 36 })),
        description: t.Optional(t.String({ maxLength: 10000 })),
        unit: t.Optional(t.String({ maxLength: 50 })),
        location: t.Optional(t.String({ maxLength: 255 })),
        targetQty: t.Optional(t.Number({ minimum: 0, maximum: 1000000000 })),
        lowStockThreshold: t.Optional(t.Number({ minimum: 0, maximum: 1000000000 })),
        defaultReplaceDays: t.Optional(t.Number({ minimum: 1, maximum: 36500 })),
        isTrackedByExpiry: t.Optional(t.Boolean()),
        notes: t.Optional(t.String({ maxLength: 10000 })),
      }),
      detail: { summary: "Create an inventory item" },
    }
  )

  .patch(
    "/:householdId/items/:itemId",
    async ({ request, set, params, body }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      if (body.categoryId) {
        const category = await db.query.inventoryCategories.findFirst({
          where: eq(inventoryCategories.id, body.categoryId),
        });
        const allowed = isAllowedCategoryForHousehold(category, params.householdId);
        if (!allowed) {
          set.status = 400;
          return { error: "Invalid category for household" };
        }
      }

      await db
        .update(inventoryItems)
        .set({
          name: body.name,
          categoryId: body.categoryId,
          description: body.description,
          unit: body.unit,
          location: body.location,
          targetQty: body.targetQty != null ? String(body.targetQty) : undefined,
          lowStockThreshold:
            body.lowStockThreshold != null ? String(body.lowStockThreshold) : undefined,
          defaultReplaceDays: body.defaultReplaceDays,
          isTrackedByExpiry: body.isTrackedByExpiry,
          notes: body.notes,
        })
        .where(
          and(
            eq(inventoryItems.id, params.itemId),
            eq(inventoryItems.householdId, params.householdId),
            isNull(inventoryItems.archivedAt)
          )
        );
      return db.query.inventoryItems.findFirst({
        where: and(
          eq(inventoryItems.id, params.itemId),
          eq(inventoryItems.householdId, params.householdId),
          isNull(inventoryItems.archivedAt)
        ),
      });
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String({ minLength: 1, maxLength: 500 }),
          categoryId: t.String({ minLength: 36, maxLength: 36 }),
          description: t.String({ maxLength: 10000 }),
          unit: t.String({ maxLength: 50 }),
          location: t.String({ maxLength: 255 }),
          targetQty: t.Number({ minimum: 0, maximum: 1000000000 }),
          lowStockThreshold: t.Number({ minimum: 0, maximum: 1000000000 }),
          defaultReplaceDays: t.Number({ minimum: 1, maximum: 36500 }),
          isTrackedByExpiry: t.Boolean(),
          notes: t.String({ maxLength: 10000 }),
        })
      ),
      detail: { summary: "Update an inventory item" },
    }
  )

  .delete(
    "/:householdId/items/:itemId",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      await db
        .update(inventoryItems)
        .set({ archivedAt: new Date() })
        .where(
          and(
            eq(inventoryItems.id, params.itemId),
            eq(inventoryItems.householdId, params.householdId),
            isNull(inventoryItems.archivedAt)
          )
        );
      return { archived: true };
    },
    { detail: { summary: "Archive an inventory item" } }
  )

  // Lots (batches)
  .post(
    "/:householdId/items/:itemId/lots",
    async ({ request, set, params, body }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const id = randomUUID();
      const replaceDays = body.replaceDays ?? undefined;
      const nextReplaceAt =
        replaceDays && body.acquiredAt
          ? new Date(new Date(body.acquiredAt).getTime() + replaceDays * 86400000)
          : undefined;
      await db.insert(inventoryLots).values({
        id,
        itemId: params.itemId,
        householdId: params.householdId,
        qty: String(body.qty),
        acquiredAt: body.acquiredAt ? new Date(body.acquiredAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        replaceDays: body.replaceDays,
        nextReplaceAt,
        batchRef: body.batchRef,
        notes: body.notes,
      });
      return db.query.inventoryLots.findFirst({ where: eq(inventoryLots.id, id) });
    },
    {
      body: t.Object({
        qty: t.Number({ minimum: 0, maximum: 1000000000 }),
        acquiredAt: t.Optional(t.String({ maxLength: 64 })),
        expiresAt: t.Optional(t.String({ maxLength: 64 })),
        replaceDays: t.Optional(t.Number({ minimum: 1, maximum: 36500 })),
        batchRef: t.Optional(t.String({ maxLength: 255 })),
        notes: t.Optional(t.String({ maxLength: 10000 })),
      }),
      detail: { summary: "Add a lot (batch) to an inventory item" },
    }
  )

  .delete(
    "/:householdId/items/:itemId/lots/:lotId",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      await db
        .update(inventoryLots)
        .set({ archivedAt: new Date() })
        .where(
          and(
            eq(inventoryLots.id, params.lotId),
            eq(inventoryLots.itemId, params.itemId),
            eq(inventoryLots.householdId, params.householdId),
            isNull(inventoryLots.archivedAt)
          )
        );
      return { archived: true };
    },
    { detail: { summary: "Archive (consume/dispose) a lot" } }
  )

  .patch(
    "/:householdId/items/:itemId/lots/:lotId",
    async ({ request, set, params, body }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const replaceDays = body.replaceDays ?? undefined;
      const nextReplaceAt =
        replaceDays && body.acquiredAt
          ? new Date(new Date(body.acquiredAt).getTime() + replaceDays * 86400000)
          : body.nextReplaceAt
            ? new Date(body.nextReplaceAt)
            : undefined;

      await db
        .update(inventoryLots)
        .set({
          qty: body.qty != null ? String(body.qty) : undefined,
          acquiredAt: body.acquiredAt ? new Date(body.acquiredAt) : undefined,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
          replaceDays,
          nextReplaceAt,
          batchRef: body.batchRef,
          notes: body.notes,
        })
        .where(
          and(
            eq(inventoryLots.id, params.lotId),
            eq(inventoryLots.itemId, params.itemId),
            eq(inventoryLots.householdId, params.householdId),
            isNull(inventoryLots.archivedAt)
          )
        );

      return db.query.inventoryLots.findFirst({
        where: and(
          eq(inventoryLots.id, params.lotId),
          eq(inventoryLots.itemId, params.itemId),
          eq(inventoryLots.householdId, params.householdId),
          isNull(inventoryLots.archivedAt)
        ),
      });
    },
    {
      body: t.Partial(
        t.Object({
          qty: t.Number({ minimum: 0, maximum: 1000000000 }),
          acquiredAt: t.String({ maxLength: 64 }),
          expiresAt: t.String({ maxLength: 64 }),
          replaceDays: t.Number({ minimum: 1, maximum: 36500 }),
          nextReplaceAt: t.String({ maxLength: 64 }),
          batchRef: t.String({ maxLength: 255 }),
          notes: t.String({ maxLength: 10000 }),
        })
      ),
      detail: { summary: "Update a lot (batch)" },
    }
  )

  // Expiry summary — lots expiring within N days
  .get(
    "/:householdId/expiring",
    async ({ request, set, params, query }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

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
    },
    {
      query: t.Object({ days: t.Optional(t.Number({ minimum: 1, maximum: 3650 })) }),
      detail: { summary: "Get lots expiring within N days" },
    }
  );
