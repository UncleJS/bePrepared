import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { policyDefaults, householdPolicies, scenarioPolicies, auditLog } from "../../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireHouseholdScope } from "../../lib/routeAuth";

type Scenario = "shelter_in_place" | "evacuation";

export const settingsRoute = new Elysia({ prefix: "/settings", tags: ["settings"] })

  // System defaults (read-only for UI, writable for admin)
  .get("/defaults", async ({ request, set }) => {
    const claims = requireAuth(request, set);
    if (!claims) return { error: "Unauthorized" };

    return db.query.policyDefaults.findMany();
  }, { detail: { summary: "Get all system policy defaults" } })

  // Household global policy overrides
  .get("/:householdId/policies", async ({ request, set, params }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    return db.query.householdPolicies.findMany({
      where: and(
        eq(householdPolicies.householdId, params.householdId),
        isNull(householdPolicies.archivedAt)
      ),
    });
  }, { detail: { summary: "Get household global policy overrides" } })

  .put("/:householdId/policies/:key", async ({ request, set, params, body }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    // Archive existing then insert new (full audit trail)
    const existing = await db.query.householdPolicies.findFirst({
      where: and(
        eq(householdPolicies.householdId, params.householdId),
        eq(householdPolicies.key, params.key),
        isNull(householdPolicies.archivedAt)
      ),
    });
    if (existing) {
      await db.update(householdPolicies)
        .set({ archivedAt: new Date() })
        .where(eq(householdPolicies.id, existing.id));
      // Audit log
      await db.insert(auditLog).values({
        id: randomUUID(),
        householdId: params.householdId,
        entity: "household_policies",
        entityId: existing.id,
        action: "update",
        oldValue: String(existing.valueDecimal ?? existing.valueInt),
        newValue: String(body.valueDecimal ?? body.valueInt),
      });
    }
    const id = randomUUID();
    await db.insert(householdPolicies).values({
      id,
      householdId: params.householdId,
      key:         params.key,
      unit:        body.unit,
      valueDecimal: body.valueDecimal?.toString(),
      valueInt:    body.valueInt,
    });
    return db.query.householdPolicies.findFirst({ where: eq(householdPolicies.id, id) });
  }, {
    body: t.Object({
      unit:         t.String(),
      valueDecimal: t.Optional(t.Number()),
      valueInt:     t.Optional(t.Number()),
    }),
    detail: { summary: "Upsert a household-level policy override (archived-trail)" },
  })

  .delete("/:householdId/policies/:key", async ({ request, set, params }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    await db.update(householdPolicies)
      .set({ archivedAt: new Date() })
      .where(and(
        eq(householdPolicies.householdId, params.householdId),
        eq(householdPolicies.key, params.key),
        isNull(householdPolicies.archivedAt)
      ));
    return { reset: true };
  }, { detail: { summary: "Reset a household policy override (revert to default)" } })

  // Scenario-specific overrides
  .get("/:householdId/scenario/:scenario", async ({ request, set, params }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    return db.query.scenarioPolicies.findMany({
      where: and(
        eq(scenarioPolicies.householdId, params.householdId),
        eq(scenarioPolicies.scenario, params.scenario as Scenario),
        isNull(scenarioPolicies.archivedAt)
      ),
    });
  }, { detail: { summary: "Get scenario-specific policy overrides" } })

  .put("/:householdId/scenario/:scenario/:key", async ({ request, set, params, body }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    const existing = await db.query.scenarioPolicies.findFirst({
      where: and(
        eq(scenarioPolicies.householdId, params.householdId),
        eq(scenarioPolicies.scenario, params.scenario as Scenario),
        eq(scenarioPolicies.key, params.key),
        isNull(scenarioPolicies.archivedAt)
      ),
    });
    if (existing) {
      await db.update(scenarioPolicies)
        .set({ archivedAt: new Date() })
        .where(eq(scenarioPolicies.id, existing.id));
    }
    const id = randomUUID();
    await db.insert(scenarioPolicies).values({
      id,
      householdId:  params.householdId,
      scenario:     params.scenario as Scenario,
      key:          params.key,
      unit:         body.unit,
      valueDecimal: body.valueDecimal?.toString(),
      valueInt:     body.valueInt,
    });
    return db.query.scenarioPolicies.findFirst({ where: eq(scenarioPolicies.id, id) });
  }, {
    body: t.Object({
      unit:         t.String(),
      valueDecimal: t.Optional(t.Number()),
      valueInt:     t.Optional(t.Number()),
    }),
    detail: { summary: "Upsert a scenario-specific policy override" },
  })

  // Audit log
  .get("/:householdId/audit", async ({ request, set, params }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    return db.query.auditLog.findMany({
      where: eq(auditLog.householdId, params.householdId),
      orderBy: auditLog.createdAt,
    });
  }, { detail: { summary: "Get policy change audit log for a household" } });
