import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { modules, sections, guidanceDocs } from "../../db/schema";
import { eq, isNull, and, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin, requireAuth } from "../../lib/routeAuth";

export const modulesRoute = new Elysia({ prefix: "/modules", tags: ["modules"] })

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
        sortOrder: body.sortOrder,
        category: body.category,
      });
      return db.query.modules.findFirst({ where: eq(modules.id, id) });
    },
    {
      body: t.Object({
        slug: t.String({ minLength: 1, maxLength: 100 }),
        title: t.String({ minLength: 1, maxLength: 255 }),
        description: t.Optional(t.String({ maxLength: 10000 })),
        iconName: t.Optional(t.String({ maxLength: 100 })),
        sortOrder: t.Optional(t.Number({ minimum: -10000, maximum: 10000 })),
        category: t.Optional(
          t.Union([
            t.Literal("water"),
            t.Literal("food"),
            t.Literal("shelter"),
            t.Literal("medical"),
            t.Literal("security"),
            t.Literal("comms"),
            t.Literal("sanitation"),
            t.Literal("power"),
            t.Literal("mobility"),
            t.Literal("general"),
          ])
        ),
      }),
      detail: { summary: "Create a module" },
    }
  )

  // Sections
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
        sortOrder: t.Optional(t.Number({ minimum: -10000, maximum: 10000 })),
      }),
      detail: { summary: "Create a section within a module" },
    }
  )

  // Guidance docs
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
        sortOrder: t.Optional(t.Number({ minimum: -10000, maximum: 10000 })),
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
          sortOrder: t.Number({ minimum: -10000, maximum: 10000 }),
          badgeJson: t.String({ maxLength: 10000 }),
        })
      ),
      detail: { summary: "Update a guidance doc" },
    }
  );
