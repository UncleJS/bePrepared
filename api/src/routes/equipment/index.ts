import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { equipmentItems, batteryProfiles, equipmentCategories } from "../../db/schema";
import { eq, isNull, isNotNull, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin, requireHouseholdScope } from "../../lib/routeAuth";
import {
  isAllowedCategoryForHousehold,
  requireAllowedCategoryForHousehold,
  requireCustomCategoryForHousehold,
  validateCategoryReplacementInput,
} from "../_shared/categoryHelpers";
import { parseISODate } from "../_shared/dates";

function optionalISODate(value: string | undefined, field: string): Date | undefined {
  if (!value) return undefined;
  return parseISODate(value, field);
}

export const equipmentRoute = new Elysia({ prefix: "/equipment", tags: ["equipment"] })

  // Battery profiles
  .get(
    "/battery-profiles",
    async ({ request, set }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      return db.query.batteryProfiles.findMany({
        where: isNull(batteryProfiles.archivedAtUTC),
      });
    },
    { detail: { summary: "List battery chemistry profiles" } }
  )

  .post(
    "/battery-profiles",
    async ({ request, set, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      const id = randomUUID();
      await db.insert(batteryProfiles).values({
        id,
        name: body.name,
        chemistry: body.chemistry,
        shelfLifeDays: body.shelfLifeDays,
        recheckCycleDays: body.recheckCycleDays,
        storageTempMin: body.storageTempMin,
        storageTempMax: body.storageTempMax,
        notes: body.notes,
      });
      return db.query.batteryProfiles.findFirst({ where: eq(batteryProfiles.id, id) });
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        chemistry: t.Union([
          t.Literal("alkaline"),
          t.Literal("lithium_primary"),
          t.Literal("liion"),
          t.Literal("nimh"),
          t.Literal("lead_acid"),
          t.Literal("other"),
        ]),
        shelfLifeDays: t.Optional(t.Number({ minimum: 1, maximum: 36500 })),
        recheckCycleDays: t.Optional(t.Number({ minimum: 1, maximum: 36500 })),
        storageTempMin: t.Optional(t.Number({ minimum: -100, maximum: 200 })),
        storageTempMax: t.Optional(t.Number({ minimum: -100, maximum: 200 })),
        notes: t.Optional(t.String({ maxLength: 10000 })),
      }),
      detail: { summary: "Create a battery profile" },
    }
  )

  .get(
    "/:householdId/categories",
    async ({ request, set, params }) => {
      const claims = await requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const systemRows = await db.query.equipmentCategories.findMany({
        where: and(
          isNull(equipmentCategories.householdId),
          eq(equipmentCategories.isSystem, true),
          isNull(equipmentCategories.archivedAtUTC)
        ),
        orderBy: equipmentCategories.sortOrder,
      });
      const customRows = await db.query.equipmentCategories.findMany({
        where: and(
          eq(equipmentCategories.householdId, params.householdId),
          isNull(equipmentCategories.archivedAtUTC)
        ),
        orderBy: equipmentCategories.sortOrder,
      });
      return [...systemRows, ...customRows];
    },
    { detail: { summary: "List equipment categories for household (system + custom)" } }
  )

  .post(
    "/:householdId/categories",
    async ({ request, set, params, body }) => {
      const claims = await requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const id = randomUUID();
      await db.insert(equipmentCategories).values({
        id,
        householdId: params.householdId,
        isSystem: false,
        name: body.name,
        slug: body.slug,
        sortOrder: body.sortOrder ?? 100,
      });
      return db.query.equipmentCategories.findFirst({ where: eq(equipmentCategories.id, id) });
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        slug: t.String({ minLength: 1, maxLength: 100 }),
        sortOrder: t.Optional(t.Number({ minimum: -10000, maximum: 10000 })),
      }),
      detail: { summary: "Create custom equipment category" },
    }
  )

  .patch(
    "/:householdId/categories/:categoryId",
    async ({ request, set, params, body }) => {
      const claims = await requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const row = await db.query.equipmentCategories.findFirst({
        where: eq(equipmentCategories.id, params.categoryId),
      });
      if (!requireCustomCategoryForHousehold(row, params.householdId, set)) {
        return { error: "Custom category not found" };
      }

      await db
        .update(equipmentCategories)
        .set({ name: body.name, slug: body.slug, sortOrder: body.sortOrder })
        .where(eq(equipmentCategories.id, params.categoryId));
      return db.query.equipmentCategories.findFirst({
        where: eq(equipmentCategories.id, params.categoryId),
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
      detail: { summary: "Update custom equipment category" },
    }
  )

  .delete(
    "/:householdId/categories/:categoryId",
    async ({ request, set, params, query }) => {
      const claims = await requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const row = await db.query.equipmentCategories.findFirst({
        where: eq(equipmentCategories.id, params.categoryId),
      });
      if (!requireCustomCategoryForHousehold(row, params.householdId, set)) {
        return { error: "Custom category not found" };
      }

      const linkedItems = await db.query.equipmentItems.findMany({
        where: and(
          eq(equipmentItems.householdId, params.householdId),
          eq(equipmentItems.categoryId, params.categoryId),
          isNull(equipmentItems.archivedAtUTC)
        ),
      });

      if (linkedItems.length > 0) {
        if (!query.replacementCategoryId) {
          set.status = 409;
          return {
            error: "Category has active equipment items",
            activeItemCount: linkedItems.length,
            hint: "Provide replacementCategoryId to reassign items before archiving",
          };
        }

        const replacementValidation = validateCategoryReplacementInput(
          query.replacementCategoryId,
          params.categoryId,
          set
        );
        if (!replacementValidation.ok) {
          return { error: replacementValidation.error };
        }
      }

      const replacementCategoryId = query.replacementCategoryId;
      const txResult = await db.transaction(async (tx) => {
        if (linkedItems.length > 0 && replacementCategoryId) {
          const replacementRows = await tx
            .select()
            .from(equipmentCategories)
            .where(eq(equipmentCategories.id, replacementCategoryId))
            .limit(1);
          const replacement = replacementRows[0];
          const replacementAllowed = isAllowedCategoryForHousehold(replacement, params.householdId);
          if (!replacementAllowed) {
            return { error: "Invalid replacement category for household" } as const;
          }

          await tx
            .update(equipmentItems)
            .set({
              categoryId: replacementCategoryId,
              categorySlug: replacement.slug,
            })
            .where(
              and(
                eq(equipmentItems.householdId, params.householdId),
                eq(equipmentItems.categoryId, params.categoryId),
                isNull(equipmentItems.archivedAtUTC)
              )
            );
        }

        await tx
          .update(equipmentCategories)
          .set({ archivedAtUTC: new Date() })
          .where(eq(equipmentCategories.id, params.categoryId));

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
      detail: { summary: "Archive custom equipment category" },
    }
  )

  .get(
    "/:householdId",
    async ({ request, set, params, query }) => {
      const claims = await requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const archivedFilter = query.archived
        ? isNotNull(equipmentItems.archivedAtUTC)
        : isNull(equipmentItems.archivedAtUTC);

      return db.query.equipmentItems.findMany({
        where: and(eq(equipmentItems.householdId, params.householdId), archivedFilter),
      });
    },
    {
      query: t.Object({ archived: t.Optional(t.BooleanString()) }),
      detail: {
        summary: "List equipment items for a household (pass ?archived=true for archived)",
      },
    }
  )

  .post(
    "/:householdId/:itemId/restore",
    async ({ request, set, params }) => {
      const claims = await requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const item = await db.query.equipmentItems.findFirst({
        where: and(
          eq(equipmentItems.id, params.itemId),
          eq(equipmentItems.householdId, params.householdId),
          isNotNull(equipmentItems.archivedAtUTC)
        ),
      });
      if (!item) {
        set.status = 404;
        return { error: "Archived equipment item not found" };
      }

      await db
        .update(equipmentItems)
        .set({ archivedAtUTC: null })
        .where(
          and(
            eq(equipmentItems.id, params.itemId),
            eq(equipmentItems.householdId, params.householdId)
          )
        );
      return db.query.equipmentItems.findFirst({ where: eq(equipmentItems.id, params.itemId) });
    },
    { detail: { summary: "Restore an archived equipment item" } }
  )

  .post(
    "/:householdId",
    async ({ request, set, params, body }) => {
      const claims = await requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      if (body.categoryId) {
        const category = await db.query.equipmentCategories.findFirst({
          where: eq(equipmentCategories.id, body.categoryId),
        });
        if (!requireAllowedCategoryForHousehold(category, params.householdId, set)) {
          return { error: "Invalid category for household" };
        }
      }

      let acquiredAt: Date | undefined;
      try {
        acquiredAt = optionalISODate(body.acquiredAt, "acquiredAt");
      } catch (err) {
        set.status = 400;
        return { error: err instanceof Error ? err.message : "Invalid date" };
      }

      const id = randomUUID();
      await db.insert(equipmentItems).values({
        id,
        householdId: params.householdId,
        categoryId: body.categoryId,
        categorySlug: body.categorySlug ?? "general",
        name: body.name,
        model: body.model,
        serialNo: body.serialNo,
        location: body.location,
        status: body.status ?? "operational",
        acquiredAt,
        notes: body.notes,
      });
      return db.query.equipmentItems.findFirst({ where: eq(equipmentItems.id, id) });
    },
    {
      body: t.Object({
        categoryId: t.Optional(t.String({ minLength: 36, maxLength: 36 })),
        categorySlug: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        name: t.String({ minLength: 1, maxLength: 500 }),
        model: t.Optional(t.String({ maxLength: 255 })),
        serialNo: t.Optional(t.String({ maxLength: 255 })),
        location: t.Optional(t.String({ maxLength: 255 })),
        status: t.Optional(
          t.Union([
            t.Literal("operational"),
            t.Literal("needs_service"),
            t.Literal("unserviceable"),
            t.Literal("retired"),
          ])
        ),
        acquiredAt: t.Optional(t.String({ maxLength: 64 })),
        notes: t.Optional(t.String({ maxLength: 10000 })),
      }),
      detail: { summary: "Add an equipment item" },
    }
  )

  .patch(
    "/:householdId/:itemId",
    async ({ request, set, params, body }) => {
      const claims = await requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      if (body.categoryId) {
        const category = await db.query.equipmentCategories.findFirst({
          where: eq(equipmentCategories.id, body.categoryId),
        });
        if (!requireAllowedCategoryForHousehold(category, params.householdId, set)) {
          return { error: "Invalid category for household" };
        }
      }

      let acquiredAt: Date | undefined;
      try {
        acquiredAt = optionalISODate(body.acquiredAt, "acquiredAt");
      } catch (err) {
        set.status = 400;
        return { error: err instanceof Error ? err.message : "Invalid date" };
      }

      await db
        .update(equipmentItems)
        .set({
          categoryId: body.categoryId,
          categorySlug: body.categorySlug,
          name: body.name,
          model: body.model,
          serialNo: body.serialNo,
          location: body.location,
          status: body.status,
          acquiredAt,
          notes: body.notes,
        })
        .where(
          and(
            eq(equipmentItems.id, params.itemId),
            eq(equipmentItems.householdId, params.householdId),
            isNull(equipmentItems.archivedAtUTC)
          )
        );
      return db.query.equipmentItems.findFirst({
        where: and(
          eq(equipmentItems.id, params.itemId),
          eq(equipmentItems.householdId, params.householdId),
          isNull(equipmentItems.archivedAtUTC)
        ),
      });
    },
    {
      body: t.Partial(
        t.Object({
          categoryId: t.String({ minLength: 36, maxLength: 36 }),
          categorySlug: t.String({ minLength: 1, maxLength: 100 }),
          name: t.String({ minLength: 1, maxLength: 500 }),
          model: t.String({ maxLength: 255 }),
          serialNo: t.String({ maxLength: 255 }),
          location: t.String({ maxLength: 255 }),
          status: t.Union([
            t.Literal("operational"),
            t.Literal("needs_service"),
            t.Literal("unserviceable"),
            t.Literal("retired"),
          ]),
          acquiredAt: t.String({ maxLength: 64 }),
          notes: t.String({ maxLength: 10000 }),
        })
      ),
      detail: { summary: "Update an equipment item" },
    }
  )

  .delete(
    "/:householdId/:itemId",
    async ({ request, set, params }) => {
      const claims = await requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      await db
        .update(equipmentItems)
        .set({ archivedAtUTC: new Date() })
        .where(
          and(
            eq(equipmentItems.id, params.itemId),
            eq(equipmentItems.householdId, params.householdId),
            isNull(equipmentItems.archivedAtUTC)
          )
        );
      return { archived: true };
    },
    { detail: { summary: "Archive an equipment item" } }
  );
