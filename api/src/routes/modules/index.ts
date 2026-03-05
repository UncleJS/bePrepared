import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { modules, sections, guidanceDocs } from "../../db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { randomUUID } from "crypto";

type ModuleCategory = "water" | "food" | "shelter" | "medical" | "security" | "comms" | "sanitation" | "power" | "mobility" | "general";

export const modulesRoute = new Elysia({ prefix: "/modules", tags: ["modules"] })

  .get("/", async () => {
    return db.query.modules.findMany({
      where: isNull(modules.archivedAt),
      orderBy: modules.sortOrder,
      with: {
        sections: {
          where: isNull(sections.archivedAt),
          orderBy: sections.sortOrder,
        },
      },
    });
  }, { detail: { summary: "List all modules with sections" } })

  .get("/:slug", async ({ params }) => {
    const row = await db.query.modules.findFirst({
      where: and(eq(modules.slug, params.slug), isNull(modules.archivedAt)),
      with: {
        sections: {
          where: isNull(sections.archivedAt),
          orderBy: sections.sortOrder,
          with: {
            guidanceDocs: {
              where: isNull(guidanceDocs.archivedAt),
              orderBy: guidanceDocs.sortOrder,
            },
          },
        },
      },
    });
    if (!row) throw new Error("Module not found");
    return row;
  }, { detail: { summary: "Get a module with all sections and docs by slug" } })

  .post("/", async ({ body }) => {
    const id = randomUUID();
    await db.insert(modules).values({
      id,
      slug:        body.slug,
      title:       body.title,
      description: body.description,
      iconName:    body.iconName,
      sortOrder:   body.sortOrder,
      category:    body.category ? (body.category as ModuleCategory) : undefined,
    });
    return db.query.modules.findFirst({ where: eq(modules.id, id) });
  }, {
    body: t.Object({
      slug:        t.String({ minLength: 1 }),
      title:       t.String({ minLength: 1 }),
      description: t.Optional(t.String()),
      iconName:    t.Optional(t.String()),
      sortOrder:   t.Optional(t.Number()),
      category:    t.Optional(t.String()),
    }),
    detail: { summary: "Create a module" },
  })

  // Sections
  .post("/:moduleId/sections", async ({ params, body }) => {
    const id = randomUUID();
    await db.insert(sections).values({ id, moduleId: params.moduleId, ...body });
    return db.query.sections.findFirst({ where: eq(sections.id, id) });
  }, {
    body: t.Object({
      slug:      t.String({ minLength: 1 }),
      title:     t.String({ minLength: 1 }),
      sortOrder: t.Optional(t.Number()),
    }),
    detail: { summary: "Create a section within a module" },
  })

  // Guidance docs
  .post("/:moduleId/sections/:sectionId/docs", async ({ params, body }) => {
    const id = randomUUID();
    await db.insert(guidanceDocs).values({ id, sectionId: params.sectionId, ...body });
    return db.query.guidanceDocs.findFirst({ where: eq(guidanceDocs.id, id) });
  }, {
    body: t.Object({
      title:     t.String({ minLength: 1 }),
      body:      t.String(),
      sortOrder: t.Optional(t.Number()),
      badgeJson: t.Optional(t.String()),
    }),
    detail: { summary: "Create a guidance doc within a section" },
  })

  .patch("/:moduleId/sections/:sectionId/docs/:docId", async ({ params, body }) => {
    await db.update(guidanceDocs).set(body).where(eq(guidanceDocs.id, params.docId));
    return db.query.guidanceDocs.findFirst({ where: eq(guidanceDocs.id, params.docId) });
  }, {
    body: t.Partial(t.Object({
      title:     t.String(),
      body:      t.String(),
      sortOrder: t.Number(),
      badgeJson: t.String(),
    })),
    detail: { summary: "Update a guidance doc" },
  });
