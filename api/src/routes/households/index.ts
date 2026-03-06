import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { households, householdPeopleProfiles } from "../../db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin, requireAuth, requireHouseholdScope } from "../../lib/routeAuth";

export const householdsRoute = new Elysia({ prefix: "/households", tags: ["households"] })

  .get(
    "/",
    async ({ request, set }) => {
      const claims = requireAuth(request, set);
      if (!claims) return { error: "Unauthorized" };
      if (claims?.isAdmin) {
        return db.query.households.findMany({ where: isNull(households.archivedAt) });
      }
      return db.query.households.findMany({
        where: and(eq(households.id, claims!.householdId), isNull(households.archivedAt)),
      });
    },
    { detail: { summary: "List all active households" } }
  )

  .post(
    "/",
    async ({ request, set, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      const id = randomUUID();
      await db.insert(households).values({ id, ...body });
      return db.query.households.findFirst({ where: eq(households.id, id) });
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        targetPeople: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
        notes: t.Optional(t.String({ maxLength: 10000 })),
      }),
      detail: { summary: "Create a new household" },
    }
  )

  .get(
    "/:id",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.id);
      if (!claims) return { error: "Forbidden" };

      const row = await db.query.households.findFirst({
        where: and(eq(households.id, params.id), isNull(households.archivedAt)),
      });
      if (!row) {
        set.status = 404;
        return { error: "Household not found" };
      }
      return row;
    },
    { detail: { summary: "Get household by ID" } }
  )

  .patch(
    "/:id",
    async ({ request, set, params, body }) => {
      const claims = requireHouseholdScope(request, set, params.id);
      if (!claims) return { error: "Forbidden" };

      await db.update(households).set(body).where(eq(households.id, params.id));
      return db.query.households.findFirst({ where: eq(households.id, params.id) });
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String({ minLength: 1, maxLength: 255 }),
          targetPeople: t.Number({ minimum: 1, maximum: 1000 }),
          activeProfileId: t.String({ minLength: 36, maxLength: 36 }),
          notes: t.String({ maxLength: 10000 }),
        })
      ),
      detail: { summary: "Update household" },
    }
  )

  .delete(
    "/:id",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.id);
      if (!claims) return { error: "Forbidden" };

      await db
        .update(households)
        .set({ archivedAt: new Date() })
        .where(eq(households.id, params.id));
      return { archived: true };
    },
    { detail: { summary: "Archive (soft-delete) a household" } }
  )

  // People profiles
  .get(
    "/:id/profiles",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.id);
      if (!claims) return { error: "Forbidden" };

      return db.query.householdPeopleProfiles.findMany({
        where: and(
          eq(householdPeopleProfiles.householdId, params.id),
          isNull(householdPeopleProfiles.archivedAt)
        ),
      });
    },
    { detail: { summary: "List people profiles for a household" } }
  )

  .post(
    "/:id/profiles",
    async ({ request, set, params, body }) => {
      const claims = requireHouseholdScope(request, set, params.id);
      if (!claims) return { error: "Forbidden" };

      const id = randomUUID();
      await db.insert(householdPeopleProfiles).values({
        id,
        householdId: params.id,
        ...body,
      });
      return db.query.householdPeopleProfiles.findFirst({
        where: eq(householdPeopleProfiles.id, id),
      });
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        peopleCount: t.Number({ minimum: 1, maximum: 1000 }),
        isDefault: t.Optional(t.Boolean()),
        scenarioBound: t.Optional(
          t.Union([t.Literal("shelter_in_place"), t.Literal("evacuation")])
        ),
        notes: t.Optional(t.String({ maxLength: 10000 })),
      }),
      detail: { summary: "Create a people profile" },
    }
  )

  .patch(
    "/:id/profiles/:profileId",
    async ({ request, set, params, body }) => {
      const claims = requireHouseholdScope(request, set, params.id);
      if (!claims) return { error: "Forbidden" };

      await db
        .update(householdPeopleProfiles)
        .set(body)
        .where(
          and(
            eq(householdPeopleProfiles.id, params.profileId),
            eq(householdPeopleProfiles.householdId, params.id),
            isNull(householdPeopleProfiles.archivedAt)
          )
        );
      return db.query.householdPeopleProfiles.findFirst({
        where: and(
          eq(householdPeopleProfiles.id, params.profileId),
          eq(householdPeopleProfiles.householdId, params.id),
          isNull(householdPeopleProfiles.archivedAt)
        ),
      });
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String({ minLength: 1, maxLength: 255 }),
          peopleCount: t.Number({ minimum: 1, maximum: 1000 }),
          isDefault: t.Boolean(),
          scenarioBound: t.Union([t.Literal("shelter_in_place"), t.Literal("evacuation")]),
          notes: t.String({ maxLength: 10000 }),
        })
      ),
      detail: { summary: "Update a people profile" },
    }
  )

  .delete(
    "/:id/profiles/:profileId",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.id);
      if (!claims) return { error: "Forbidden" };

      await db
        .update(householdPeopleProfiles)
        .set({ archivedAt: new Date() })
        .where(
          and(
            eq(householdPeopleProfiles.id, params.profileId),
            eq(householdPeopleProfiles.householdId, params.id),
            isNull(householdPeopleProfiles.archivedAt)
          )
        );
      return { archived: true };
    },
    { detail: { summary: "Archive a people profile" } }
  );
