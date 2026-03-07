import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { moduleCategories } from "../../db/schema";
import { eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin, requireAuth } from "../../lib/routeAuth";

const ReorderItem = t.Object({
  id: t.String(),
  sortOrder: t.Number({ minimum: 0, maximum: 100000 }),
});

export const moduleCategoriesRoute = new Elysia({
  prefix: "/module-categories",
  tags: ["modules"],
})
  // -----------------------------------------------------------------------
  // GET /module-categories — list all non-archived categories
  // -----------------------------------------------------------------------
  .get(
    "/",
    async ({ request, set }) => {
      const claims = requireAuth(request, set);
      if (!claims) return { error: "Unauthorized" };
      return db
        .select()
        .from(moduleCategories)
        .where(isNull(moduleCategories.archivedAt))
        .orderBy(moduleCategories.sortOrder);
    },
    { detail: { summary: "List all module categories" } }
  )

  // -----------------------------------------------------------------------
  // POST /module-categories — create
  // -----------------------------------------------------------------------
  .post(
    "/",
    async ({ request, set, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      const id = randomUUID();
      await db.insert(moduleCategories).values({ id, ...body });
      return db.query.moduleCategories.findFirst({ where: eq(moduleCategories.id, id) });
    },
    {
      body: t.Object({
        slug: t.String({ minLength: 1, maxLength: 100 }),
        title: t.String({ minLength: 1, maxLength: 255 }),
        sortOrder: t.Optional(t.Number({ minimum: 0, maximum: 100000 })),
      }),
      detail: { summary: "Create a module category" },
    }
  )

  // -----------------------------------------------------------------------
  // PUT /module-categories/reorder — bulk sort order update
  // -----------------------------------------------------------------------
  .put(
    "/reorder",
    async ({ request, set, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      for (const item of body.items) {
        await db
          .update(moduleCategories)
          .set({ sortOrder: item.sortOrder })
          .where(eq(moduleCategories.id, item.id));
      }
      return { ok: true };
    },
    {
      body: t.Object({ items: t.Array(ReorderItem) }),
      detail: { summary: "Reorder module categories" },
    }
  )

  // -----------------------------------------------------------------------
  // PATCH /module-categories/:id — update
  // -----------------------------------------------------------------------
  .patch(
    "/:id",
    async ({ request, set, params, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      await db.update(moduleCategories).set(body).where(eq(moduleCategories.id, params.id));
      return db.query.moduleCategories.findFirst({
        where: eq(moduleCategories.id, params.id),
      });
    },
    {
      body: t.Partial(
        t.Object({
          slug: t.String({ minLength: 1, maxLength: 100 }),
          title: t.String({ minLength: 1, maxLength: 255 }),
          sortOrder: t.Number({ minimum: 0, maximum: 100000 }),
        })
      ),
      detail: { summary: "Update a module category" },
    }
  )

  // -----------------------------------------------------------------------
  // DELETE /module-categories/:id — soft-archive
  // -----------------------------------------------------------------------
  .delete(
    "/:id",
    async ({ request, set, params }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      await db
        .update(moduleCategories)
        .set({ archivedAt: sql`now()` })
        .where(eq(moduleCategories.id, params.id));
      return { ok: true };
    },
    { detail: { summary: "Archive a module category" } }
  );
