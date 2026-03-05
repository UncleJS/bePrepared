import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { equipmentItems, batteryProfiles, equipmentCategories } from "../../db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin, requireHouseholdScope } from "../../lib/routeAuth";

type EquipmentStatus = "operational" | "needs_service" | "unserviceable" | "retired";
type BatteryChemistry = "alkaline" | "lithium_primary" | "liion" | "nimh" | "lead_acid" | "other";

export const equipmentRoute = new Elysia({ prefix: "/equipment", tags: ["equipment"] })

  // Battery profiles
  .get("/battery-profiles", async ({ request, set }) => {
    const claims = requireAdmin(request, set);
    if (!claims) return { error: "Admin access required" };

    return db.query.batteryProfiles.findMany({
      where: isNull(batteryProfiles.archivedAt),
    });
  }, { detail: { summary: "List battery chemistry profiles" } })

  .post("/battery-profiles", async ({ request, set, body }) => {
    const claims = requireAdmin(request, set);
    if (!claims) return { error: "Admin access required" };

    const id = randomUUID();
    await db.insert(batteryProfiles).values({
      id,
      name: body.name,
      chemistry: body.chemistry as BatteryChemistry,
      shelfLifeDays: body.shelfLifeDays,
      recheckCycleDays: body.recheckCycleDays,
      storageTempMin: body.storageTempMin,
      storageTempMax: body.storageTempMax,
      notes: body.notes,
    });
    return db.query.batteryProfiles.findFirst({ where: eq(batteryProfiles.id, id) });
  }, {
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
  })

  .get("/:householdId/categories", async ({ request, set, params }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    const systemRows = await db.query.equipmentCategories.findMany({
      where: and(
        isNull(equipmentCategories.householdId),
        eq(equipmentCategories.isSystem, true),
        isNull(equipmentCategories.archivedAt)
      ),
      orderBy: equipmentCategories.sortOrder,
    });
    const customRows = await db.query.equipmentCategories.findMany({
      where: and(
        eq(equipmentCategories.householdId, params.householdId),
        isNull(equipmentCategories.archivedAt)
      ),
      orderBy: equipmentCategories.sortOrder,
    });
    return [...systemRows, ...customRows];
  }, { detail: { summary: "List equipment categories for household (system + custom)" } })

  .post("/:householdId/categories", async ({ request, set, params, body }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
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
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 255 }),
      slug: t.String({ minLength: 1, maxLength: 100 }),
      sortOrder: t.Optional(t.Number({ minimum: -10000, maximum: 10000 })),
    }),
    detail: { summary: "Create custom equipment category" },
  })

  .patch("/:householdId/categories/:categoryId", async ({ request, set, params, body }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    const row = await db.query.equipmentCategories.findFirst({ where: eq(equipmentCategories.id, params.categoryId) });
    if (!row || row.isSystem || row.householdId !== params.householdId) {
      set.status = 404;
      return { error: "Custom category not found" };
    }

    await db.update(equipmentCategories)
      .set({ name: body.name, slug: body.slug, sortOrder: body.sortOrder })
      .where(eq(equipmentCategories.id, params.categoryId));
    return db.query.equipmentCategories.findFirst({ where: eq(equipmentCategories.id, params.categoryId) });
  }, {
    body: t.Partial(t.Object({
      name: t.String({ minLength: 1, maxLength: 255 }),
      slug: t.String({ minLength: 1, maxLength: 100 }),
      sortOrder: t.Number({ minimum: -10000, maximum: 10000 }),
    })),
    detail: { summary: "Update custom equipment category" },
  })

  .delete("/:householdId/categories/:categoryId", async ({ request, set, params, query }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    const row = await db.query.equipmentCategories.findFirst({ where: eq(equipmentCategories.id, params.categoryId) });
    if (!row || row.isSystem || row.householdId !== params.householdId) {
      set.status = 404;
      return { error: "Custom category not found" };
    }

    const linkedItems = await db.query.equipmentItems.findMany({
      where: and(
        eq(equipmentItems.householdId, params.householdId),
        eq(equipmentItems.categoryId, params.categoryId),
        isNull(equipmentItems.archivedAt)
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

      if (query.replacementCategoryId === params.categoryId) {
        set.status = 400;
        return { error: "replacementCategoryId must be different from archived category" };
      }

      const replacement = await db.query.equipmentCategories.findFirst({
        where: eq(equipmentCategories.id, query.replacementCategoryId),
      });
      const replacementAllowed = replacement && !replacement.archivedAt && (replacement.isSystem || replacement.householdId === params.householdId);
      if (!replacementAllowed) {
        set.status = 400;
        return { error: "Invalid replacement category for household" };
      }

      await db.update(equipmentItems)
        .set({
          categoryId: query.replacementCategoryId,
          categorySlug: replacement.slug,
        })
        .where(and(
          eq(equipmentItems.householdId, params.householdId),
          eq(equipmentItems.categoryId, params.categoryId),
          isNull(equipmentItems.archivedAt)
        ));
    }

    await db.update(equipmentCategories)
      .set({ archivedAt: new Date() })
      .where(eq(equipmentCategories.id, params.categoryId));

    return { archived: true };
  }, {
    query: t.Object({
      replacementCategoryId: t.Optional(t.String({ minLength: 36, maxLength: 36 })),
    }),
    detail: { summary: "Archive custom equipment category" },
  })

  .get("/:householdId", async ({ request, set, params }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    return db.query.equipmentItems.findMany({
      where: and(
        eq(equipmentItems.householdId, params.householdId),
        isNull(equipmentItems.archivedAt)
      ),
    });
  }, { detail: { summary: "List equipment items for a household" } })

  .post("/:householdId", async ({ request, set, params, body }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    if (body.categoryId) {
      const category = await db.query.equipmentCategories.findFirst({ where: eq(equipmentCategories.id, body.categoryId) });
      const allowed = category && !category.archivedAt && (category.isSystem || category.householdId === params.householdId);
      if (!allowed) {
        set.status = 400;
        return { error: "Invalid category for household" };
      }
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
      status: (body.status as EquipmentStatus) ?? "operational",
      acquiredAt: body.acquiredAt ? new Date(body.acquiredAt) : undefined,
      notes: body.notes,
    });
    return db.query.equipmentItems.findFirst({ where: eq(equipmentItems.id, id) });
  }, {
    body: t.Object({
      categoryId: t.Optional(t.String({ minLength: 36, maxLength: 36 })),
      categorySlug: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
      name: t.String({ minLength: 1, maxLength: 500 }),
      model: t.Optional(t.String({ maxLength: 255 })),
      serialNo: t.Optional(t.String({ maxLength: 255 })),
      location: t.Optional(t.String({ maxLength: 255 })),
      status: t.Optional(t.Union([
        t.Literal("operational"), t.Literal("needs_service"), t.Literal("unserviceable"), t.Literal("retired"),
      ])),
      acquiredAt: t.Optional(t.String({ maxLength: 64 })),
      notes: t.Optional(t.String({ maxLength: 10000 })),
    }),
    detail: { summary: "Add an equipment item" },
  })

  .patch("/:householdId/:itemId", async ({ request, set, params, body }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    if (body.categoryId) {
      const category = await db.query.equipmentCategories.findFirst({ where: eq(equipmentCategories.id, body.categoryId) });
      const allowed = category && !category.archivedAt && (category.isSystem || category.householdId === params.householdId);
      if (!allowed) {
        set.status = 400;
        return { error: "Invalid category for household" };
      }
    }

    await db.update(equipmentItems).set({
      categoryId: body.categoryId,
      categorySlug: body.categorySlug,
      name: body.name,
      model: body.model,
      serialNo: body.serialNo,
      location: body.location,
      status: body.status ? (body.status as EquipmentStatus) : undefined,
      acquiredAt: body.acquiredAt ? new Date(body.acquiredAt) : undefined,
      notes: body.notes,
    }).where(and(
      eq(equipmentItems.id, params.itemId),
      eq(equipmentItems.householdId, params.householdId),
      isNull(equipmentItems.archivedAt)
    ));
    return db.query.equipmentItems.findFirst({
      where: and(
        eq(equipmentItems.id, params.itemId),
        eq(equipmentItems.householdId, params.householdId),
        isNull(equipmentItems.archivedAt)
      ),
    });
  }, {
    body: t.Partial(t.Object({
      categoryId: t.String({ minLength: 36, maxLength: 36 }),
      categorySlug: t.String({ minLength: 1, maxLength: 100 }),
      name: t.String({ minLength: 1, maxLength: 500 }),
      model: t.String({ maxLength: 255 }),
      serialNo: t.String({ maxLength: 255 }),
      location: t.String({ maxLength: 255 }),
      status: t.Union([
        t.Literal("operational"), t.Literal("needs_service"), t.Literal("unserviceable"), t.Literal("retired"),
      ]),
      acquiredAt: t.String({ maxLength: 64 }),
      notes: t.String({ maxLength: 10000 }),
    })),
    detail: { summary: "Update an equipment item" },
  })

  .delete("/:householdId/:itemId", async ({ request, set, params }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    await db.update(equipmentItems)
      .set({ archivedAt: new Date() })
      .where(and(
        eq(equipmentItems.id, params.itemId),
        eq(equipmentItems.householdId, params.householdId),
        isNull(equipmentItems.archivedAt)
      ));
    return { archived: true };
  }, { detail: { summary: "Archive an equipment item" } });
