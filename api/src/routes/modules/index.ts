import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { modules, sections, guidanceDocs } from "../../db/schema";
import { eq, isNull, and, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin, requireAuth } from "../../lib/routeAuth";

// ---------------------------------------------------------------------------
// Shared reorder body shape
// ---------------------------------------------------------------------------
const ReorderItem = t.Object({
  id: t.String(),
  sortOrder: t.Number({ minimum: 0, maximum: 100000 }),
});

export const modulesRoute = new Elysia({ prefix: "/modules", tags: ["modules"] })

  // =========================================================================
  // READ
  // =========================================================================

  .get(
    "/",
    async ({ request, set }) => {
      const claims = requireAuth(request, set);
      if (!claims) return { error: "Unauthorized" };

      const moduleRows = await db
        .select()
        .from(modules)
        .where(isNull(modules.archivedAt))
        .orderBy(modules.sortOrder);

      if (moduleRows.length === 0) return [];

      const moduleIds = moduleRows.map((m) => m.id);

      const sectionRows = await db
        .select()
        .from(sections)
        .where(and(isNull(sections.archivedAt), inArray(sections.moduleId, moduleIds)))
        .orderBy(sections.sortOrder);

      const sectionsByModule = new Map<string, typeof sectionRows>();
      for (const s of sectionRows) {
        const list = sectionsByModule.get(s.moduleId) ?? [];
        list.push(s);
        sectionsByModule.set(s.moduleId, list);
      }

      return moduleRows.map((m) => ({
        ...m,
        sections: sectionsByModule.get(m.id) ?? [],
      }));
    },
    { detail: { summary: "List all modules with sections" } }
  )

  .get(
    "/:slug",
    async ({ request, set, params }) => {
      const claims = requireAuth(request, set);
      if (!claims) return { error: "Unauthorized" };

      const moduleRows = await db
        .select()
        .from(modules)
        .where(and(eq(modules.slug, params.slug), isNull(modules.archivedAt)))
        .limit(1);

      const row = moduleRows[0];
      if (!row) {
        set.status = 404;
        return { error: "Module not found" };
      }

      const sectionRows = await db
        .select()
        .from(sections)
        .where(and(eq(sections.moduleId, row.id), isNull(sections.archivedAt)))
        .orderBy(sections.sortOrder);

      const sectionIds = sectionRows.map((s) => s.id);
      const docRows = sectionIds.length
        ? await db
            .select()
            .from(guidanceDocs)
            .where(
              and(isNull(guidanceDocs.archivedAt), inArray(guidanceDocs.sectionId, sectionIds))
            )
            .orderBy(guidanceDocs.sortOrder)
        : [];

      const docsBySection = new Map<string, typeof docRows>();
      for (const d of docRows) {
        const list = docsBySection.get(d.sectionId) ?? [];
        list.push(d);
        docsBySection.set(d.sectionId, list);
      }

      return {
        ...row,
        sections: sectionRows.map((s) => ({
          ...s,
          guidanceDocs: docsBySection.get(s.id) ?? [],
        })),
      };
    },
    { detail: { summary: "Get a module with all sections and docs by slug" } }
  )

  // =========================================================================
  // MODULES — create / update / archive / reorder
  // =========================================================================

  .post(
    "/",
    async ({ request, set, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      const id = randomUUID();
      await db.insert(modules).values({
        id,
        slug: body.slug,
        title: body.title,
        description: body.description,
        iconName: body.iconName,
        sortOrder: body.sortOrder ?? 0,
        categoryId: body.categoryId,
      });
      return db.query.modules.findFirst({ where: eq(modules.id, id) });
    },
    {
      body: t.Object({
        slug: t.String({ minLength: 1, maxLength: 100 }),
        title: t.String({ minLength: 1, maxLength: 255 }),
        categoryId: t.String({ minLength: 1, maxLength: 36 }),
        description: t.Optional(t.String({ maxLength: 10000 })),
        iconName: t.Optional(t.String({ maxLength: 100 })),
        sortOrder: t.Optional(t.Number({ minimum: 0, maximum: 100000 })),
      }),
      detail: { summary: "Create a module" },
    }
  )

  .patch(
    "/:moduleId",
    async ({ request, set, params, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      await db.update(modules).set(body).where(eq(modules.id, params.moduleId));
      return db.query.modules.findFirst({ where: eq(modules.id, params.moduleId) });
    },
    {
      body: t.Partial(
        t.Object({
          slug: t.String({ minLength: 1, maxLength: 100 }),
          title: t.String({ minLength: 1, maxLength: 255 }),
          description: t.String({ maxLength: 10000 }),
          iconName: t.String({ maxLength: 100 }),
          sortOrder: t.Number({ minimum: 0, maximum: 100000 }),
          categoryId: t.String({ minLength: 1, maxLength: 36 }),
        })
      ),
      detail: { summary: "Update a module" },
    }
  )

  .delete(
    "/:moduleId",
    async ({ request, set, params }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      const now = sql`now()`;

      // 1. Find all non-archived sections
      const sectionRows = await db
        .select({ id: sections.id })
        .from(sections)
        .where(and(eq(sections.moduleId, params.moduleId), isNull(sections.archivedAt)));

      const sectionIds = sectionRows.map((s) => s.id);

      // 2. Cascade-archive guidance docs
      if (sectionIds.length) {
        await db
          .update(guidanceDocs)
          .set({ archivedAt: now })
          .where(and(isNull(guidanceDocs.archivedAt), inArray(guidanceDocs.sectionId, sectionIds)));
      }

      // 3. Archive sections
      await db
        .update(sections)
        .set({ archivedAt: now })
        .where(and(eq(sections.moduleId, params.moduleId), isNull(sections.archivedAt)));

      // 4. Archive module
      await db.update(modules).set({ archivedAt: now }).where(eq(modules.id, params.moduleId));

      return { ok: true };
    },
    { detail: { summary: "Archive a module (cascades to sections and docs)" } }
  )

  .put(
    "/reorder",
    async ({ request, set, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      for (const item of body.items) {
        await db.update(modules).set({ sortOrder: item.sortOrder }).where(eq(modules.id, item.id));
      }
      return { ok: true };
    },
    {
      body: t.Object({ items: t.Array(ReorderItem) }),
      detail: { summary: "Reorder modules" },
    }
  )

  // =========================================================================
  // SECTIONS — create / update / archive / reorder
  // =========================================================================

  .post(
    "/:moduleId/sections",
    async ({ request, set, params, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      const id = randomUUID();
      await db.insert(sections).values({ id, moduleId: params.moduleId, ...body });
      return db.query.sections.findFirst({ where: eq(sections.id, id) });
    },
    {
      body: t.Object({
        slug: t.String({ minLength: 1, maxLength: 100 }),
        title: t.String({ minLength: 1, maxLength: 255 }),
        sortOrder: t.Optional(t.Number({ minimum: 0, maximum: 100000 })),
      }),
      detail: { summary: "Create a section within a module" },
    }
  )

  .patch(
    "/:moduleId/sections/:sectionId",
    async ({ request, set, params, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      await db.update(sections).set(body).where(eq(sections.id, params.sectionId));
      return db.query.sections.findFirst({ where: eq(sections.id, params.sectionId) });
    },
    {
      body: t.Partial(
        t.Object({
          slug: t.String({ minLength: 1, maxLength: 100 }),
          title: t.String({ minLength: 1, maxLength: 255 }),
          sortOrder: t.Number({ minimum: 0, maximum: 100000 }),
        })
      ),
      detail: { summary: "Update a section" },
    }
  )

  .delete(
    "/:moduleId/sections/:sectionId",
    async ({ request, set, params }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      const now = sql`now()`;

      // Cascade-archive docs first
      await db
        .update(guidanceDocs)
        .set({ archivedAt: now })
        .where(and(isNull(guidanceDocs.archivedAt), eq(guidanceDocs.sectionId, params.sectionId)));

      // Archive section
      await db.update(sections).set({ archivedAt: now }).where(eq(sections.id, params.sectionId));

      return { ok: true };
    },
    { detail: { summary: "Archive a section (cascades to guidance docs)" } }
  )

  .put(
    "/:moduleId/sections/reorder",
    async ({ request, set, params, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      for (const item of body.items) {
        await db
          .update(sections)
          .set({ sortOrder: item.sortOrder })
          .where(and(eq(sections.id, item.id), eq(sections.moduleId, params.moduleId)));
      }
      return { ok: true };
    },
    {
      body: t.Object({ items: t.Array(ReorderItem) }),
      detail: { summary: "Reorder sections within a module" },
    }
  )

  // =========================================================================
  // GUIDANCE DOCS — create / update / archive / reorder
  // =========================================================================

  .post(
    "/:moduleId/sections/:sectionId/docs",
    async ({ request, set, params, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      const id = randomUUID();
      await db.insert(guidanceDocs).values({ id, sectionId: params.sectionId, ...body });
      return db.query.guidanceDocs.findFirst({ where: eq(guidanceDocs.id, id) });
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 255 }),
        body: t.String({ minLength: 1, maxLength: 50000 }),
        sortOrder: t.Optional(t.Number({ minimum: 0, maximum: 100000 })),
        badgeJson: t.Optional(t.String({ maxLength: 10000 })),
      }),
      detail: { summary: "Create a guidance doc within a section" },
    }
  )

  .patch(
    "/:moduleId/sections/:sectionId/docs/:docId",
    async ({ request, set, params, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      await db.update(guidanceDocs).set(body).where(eq(guidanceDocs.id, params.docId));
      return db.query.guidanceDocs.findFirst({ where: eq(guidanceDocs.id, params.docId) });
    },
    {
      body: t.Partial(
        t.Object({
          title: t.String({ minLength: 1, maxLength: 255 }),
          body: t.String({ minLength: 1, maxLength: 50000 }),
          sortOrder: t.Number({ minimum: 0, maximum: 100000 }),
          badgeJson: t.String({ maxLength: 10000 }),
        })
      ),
      detail: { summary: "Update a guidance doc" },
    }
  )

  .delete(
    "/:moduleId/sections/:sectionId/docs/:docId",
    async ({ request, set, params }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      await db
        .update(guidanceDocs)
        .set({ archivedAt: sql`now()` })
        .where(eq(guidanceDocs.id, params.docId));
      return { ok: true };
    },
    { detail: { summary: "Archive a guidance doc" } }
  )

  .put(
    "/:moduleId/sections/:sectionId/docs/reorder",
    async ({ request, set, params, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      for (const item of body.items) {
        await db
          .update(guidanceDocs)
          .set({ sortOrder: item.sortOrder })
          .where(and(eq(guidanceDocs.id, item.id), eq(guidanceDocs.sectionId, params.sectionId)));
      }
      return { ok: true };
    },
    {
      body: t.Object({ items: t.Array(ReorderItem) }),
      detail: { summary: "Reorder guidance docs within a section" },
    }
  );
