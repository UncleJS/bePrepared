import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { policyDefaults, householdPolicies, scenarioPolicies, auditLog } from "../../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireHouseholdScope } from "../../lib/routeAuth";

const scenarioParamSchema = t.Union([t.Literal("shelter_in_place"), t.Literal("evacuation")]);

export const settingsRoute = new Elysia({ prefix: "/settings", tags: ["settings"] })

  // System defaults (read-only for UI, writable for admin)
  .get(
    "/defaults",
    async ({ request, set }) => {
      const claims = requireAuth(request, set);
      if (!claims) return { error: "Unauthorized" };

      return db.query.policyDefaults.findMany();
    },
    { detail: { summary: "Get all system policy defaults" } }
  )

  // Household global policy overrides
  .get(
    "/:householdId/policies",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      return db.query.householdPolicies.findMany({
        where: and(
          eq(householdPolicies.householdId, params.householdId),
          isNull(householdPolicies.archivedAt)
        ),
      });
    },
    { detail: { summary: "Get household global policy overrides" } }
  )

  .put(
    "/:householdId/policies/:key",
    async ({ request, set, params, body }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const id = await db.transaction(async (tx) => {
        const existingRows = await tx
          .select()
          .from(householdPolicies)
          .where(
            and(
              eq(householdPolicies.householdId, params.householdId),
              eq(householdPolicies.key, params.key),
              isNull(householdPolicies.archivedAt)
            )
          )
          .limit(1);
        const existing = existingRows[0];

        if (existing) {
          await tx
            .update(householdPolicies)
            .set({ archivedAt: new Date() })
            .where(eq(householdPolicies.id, existing.id));

          await tx.insert(auditLog).values({
            id: randomUUID(),
            householdId: params.householdId,
            entity: "household_policies",
            entityId: existing.id,
            action: "update",
            oldValue: String(existing.valueDecimal ?? existing.valueInt),
            newValue: String(body.valueDecimal ?? body.valueInt),
          });
        }

        const nextId = randomUUID();
        await tx.insert(householdPolicies).values({
          id: nextId,
          householdId: params.householdId,
          key: params.key,
          unit: body.unit,
          valueDecimal: body.valueDecimal?.toString(),
          valueInt: body.valueInt,
        });
        return nextId;
      });

      return db.query.householdPolicies.findFirst({ where: eq(householdPolicies.id, id) });
    },
    {
      body: t.Object({
        unit: t.String({ minLength: 1, maxLength: 50 }),
        valueDecimal: t.Optional(t.Number({ minimum: 0, maximum: 1000000000 })),
        valueInt: t.Optional(t.Number({ minimum: 0, maximum: 1000000000 })),
      }),
      detail: { summary: "Upsert a household-level policy override (archived-trail)" },
    }
  )

  .delete(
    "/:householdId/policies/:key",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      await db
        .update(householdPolicies)
        .set({ archivedAt: new Date() })
        .where(
          and(
            eq(householdPolicies.householdId, params.householdId),
            eq(householdPolicies.key, params.key),
            isNull(householdPolicies.archivedAt)
          )
        );
      return { reset: true };
    },
    { detail: { summary: "Reset a household policy override (revert to default)" } }
  )

  // Scenario-specific overrides
  .get(
    "/:householdId/scenario/:scenario",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      return db.query.scenarioPolicies.findMany({
        where: and(
          eq(scenarioPolicies.householdId, params.householdId),
          eq(scenarioPolicies.scenario, params.scenario),
          isNull(scenarioPolicies.archivedAt)
        ),
      });
    },
    {
      params: t.Object({
        householdId: t.String({ minLength: 1, maxLength: 64 }),
        scenario: scenarioParamSchema,
      }),
      detail: { summary: "Get scenario-specific policy overrides" },
    }
  )

  .put(
    "/:householdId/scenario/:scenario/:key",
    async ({ request, set, params, body }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const id = await db.transaction(async (tx) => {
        const existingRows = await tx
          .select()
          .from(scenarioPolicies)
          .where(
            and(
              eq(scenarioPolicies.householdId, params.householdId),
              eq(scenarioPolicies.scenario, params.scenario),
              eq(scenarioPolicies.key, params.key),
              isNull(scenarioPolicies.archivedAt)
            )
          )
          .limit(1);
        const existing = existingRows[0];

        if (existing) {
          await tx
            .update(scenarioPolicies)
            .set({ archivedAt: new Date() })
            .where(eq(scenarioPolicies.id, existing.id));
        }

        const nextId = randomUUID();
        await tx.insert(scenarioPolicies).values({
          id: nextId,
          householdId: params.householdId,
          scenario: params.scenario,
          key: params.key,
          unit: body.unit,
          valueDecimal: body.valueDecimal?.toString(),
          valueInt: body.valueInt,
        });
        return nextId;
      });

      return db.query.scenarioPolicies.findFirst({ where: eq(scenarioPolicies.id, id) });
    },
    {
      body: t.Object({
        unit: t.String({ minLength: 1, maxLength: 50 }),
        valueDecimal: t.Optional(t.Number({ minimum: 0, maximum: 1000000000 })),
        valueInt: t.Optional(t.Number({ minimum: 0, maximum: 1000000000 })),
      }),
      params: t.Object({
        householdId: t.String({ minLength: 1, maxLength: 64 }),
        scenario: scenarioParamSchema,
        key: t.String({ minLength: 1, maxLength: 100 }),
      }),
      detail: { summary: "Upsert a scenario-specific policy override" },
    }
  )

  .delete(
    "/:householdId/scenario/:scenario/:key",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      await db
        .update(scenarioPolicies)
        .set({ archivedAt: new Date() })
        .where(
          and(
            eq(scenarioPolicies.householdId, params.householdId),
            eq(scenarioPolicies.scenario, params.scenario),
            eq(scenarioPolicies.key, params.key),
            isNull(scenarioPolicies.archivedAt)
          )
        );
      return { reset: true };
    },
    {
      params: t.Object({
        householdId: t.String({ minLength: 1, maxLength: 64 }),
        scenario: scenarioParamSchema,
        key: t.String({ minLength: 1, maxLength: 100 }),
      }),
      detail: {
        summary: "Reset a scenario-specific policy override (revert to household/default)",
      },
    }
  )

  // Audit log
  .get(
    "/:householdId/audit",
    async ({ request, set, params }) => {
      const claims = requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      return db.query.auditLog.findMany({
        where: eq(auditLog.householdId, params.householdId),
        orderBy: auditLog.createdAt,
      });
    },
    { detail: { summary: "Get policy change audit log for a household" } }
  );
