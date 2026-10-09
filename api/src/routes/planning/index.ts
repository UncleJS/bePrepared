import { Elysia, t } from "elysia";
import { logger } from "@beprepared/shared/logger";
import { PlanningNotFoundError, resolvePlanningTotals } from "../../lib/policyEngine";
import { requireHouseholdScope } from "../../lib/routeAuth";

export const planningRoute = new Elysia({ prefix: "/planning", tags: ["planning"] }).get(
  "/:householdId/:scenario",
  async ({ request, set, params, query }) => {
    const claims = await requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    const manualPeople = query.people;
    try {
      return await resolvePlanningTotals(params.householdId, params.scenario, manualPeople);
    } catch (err) {
      if (err instanceof PlanningNotFoundError) {
        set.status = 404;
        return { error: "Not found" };
      }
      logger.error("Planning totals failed", { err: String(err) });
      set.status = 500;
      return { error: "Internal error" };
    }
  },
  {
    params: t.Object({
      householdId: t.String({ minLength: 1, maxLength: 64 }),
      scenario: t.Union([t.Literal("shelter_in_place"), t.Literal("evacuation")]),
    }),
    query: t.Object({
      people: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
    }),
    detail: {
      summary: "Resolve effective planning totals for a household and scenario",
      description: `
Returns effective water and calorie totals for 72h, 14d, 30d, and 90d horizons.
Policy precedence: scenario override → household global override → system default.
People precedence: manual override → scenario-bound profile → active profile → household baseline.
      `.trim(),
    },
  }
);
