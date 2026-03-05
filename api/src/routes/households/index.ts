import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { households, householdPeopleProfiles } from "../../db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export const householdsRoute = new Elysia({ prefix: "/households", tags: ["households"] })

  .get("/", async () => {
    return db.query.households.findMany({
      where: isNull(households.archivedAt),
      with: { },
    });
  }, { detail: { summary: "List all active households" } })

  .post("/", async ({ body }) => {
    const id = randomUUID();
    await db.insert(households).values({ id, ...body });
    return db.query.households.findFirst({ where: eq(households.id, id) });
  }, {
    body: t.Object({
      name:          t.String({ minLength: 1 }),
      targetPeople:  t.Optional(t.Number({ minimum: 1 })),
      notes:         t.Optional(t.String()),
    }),
    detail: { summary: "Create a new household" },
  })

  .get("/:id", async ({ params }) => {
    const row = await db.query.households.findFirst({
      where: and(eq(households.id, params.id), isNull(households.archivedAt)),
    });
    if (!row) throw new Error("Household not found");
    return row;
  }, { detail: { summary: "Get household by ID" } })

  .patch("/:id", async ({ params, body }) => {
    await db.update(households).set(body).where(eq(households.id, params.id));
    return db.query.households.findFirst({ where: eq(households.id, params.id) });
  }, {
    body: t.Partial(t.Object({
      name:             t.String(),
      targetPeople:     t.Number({ minimum: 1 }),
      activeScenario:   t.Union([t.Literal("shelter_in_place"), t.Literal("evacuation")]),
      activeProfileId:  t.String(),
      notes:            t.String(),
    })),
    detail: { summary: "Update household" },
  })

  .delete("/:id", async ({ params }) => {
    await db.update(households)
      .set({ archivedAt: new Date() })
      .where(eq(households.id, params.id));
    return { archived: true };
  }, { detail: { summary: "Archive (soft-delete) a household" } })

  // People profiles
  .get("/:id/profiles", async ({ params }) => {
    return db.query.householdPeopleProfiles.findMany({
      where: and(
        eq(householdPeopleProfiles.householdId, params.id),
        isNull(householdPeopleProfiles.archivedAt)
      ),
    });
  }, { detail: { summary: "List people profiles for a household" } })

  .post("/:id/profiles", async ({ params, body }) => {
    const id = randomUUID();
    await db.insert(householdPeopleProfiles).values({
      id, householdId: params.id, ...body,
    });
    return db.query.householdPeopleProfiles.findFirst({
      where: eq(householdPeopleProfiles.id, id),
    });
  }, {
    body: t.Object({
      name:          t.String({ minLength: 1 }),
      peopleCount:   t.Number({ minimum: 1 }),
      isDefault:     t.Optional(t.Boolean()),
      scenarioBound: t.Optional(t.Union([
        t.Literal("shelter_in_place"), t.Literal("evacuation")
      ])),
      notes: t.Optional(t.String()),
    }),
    detail: { summary: "Create a people profile" },
  })

  .patch("/:id/profiles/:profileId", async ({ params, body }) => {
    await db.update(householdPeopleProfiles)
      .set(body)
      .where(eq(householdPeopleProfiles.id, params.profileId));
    return db.query.householdPeopleProfiles.findFirst({
      where: eq(householdPeopleProfiles.id, params.profileId),
    });
  }, {
    body: t.Partial(t.Object({
      name:          t.String(),
      peopleCount:   t.Number({ minimum: 1 }),
      isDefault:     t.Boolean(),
      scenarioBound: t.Union([
        t.Literal("shelter_in_place"), t.Literal("evacuation")
      ]),
      notes: t.String(),
    })),
    detail: { summary: "Update a people profile" },
  })

  .delete("/:id/profiles/:profileId", async ({ params }) => {
    await db.update(householdPeopleProfiles)
      .set({ archivedAt: new Date() })
      .where(eq(householdPeopleProfiles.id, params.profileId));
    return { archived: true };
  }, { detail: { summary: "Archive a people profile" } });
