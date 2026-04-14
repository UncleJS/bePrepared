import { Elysia, t } from "elysia";
import { resolvePlanningTotals } from "../../lib/policyEngine";
import { requireHouseholdScope } from "../../lib/routeAuth";

export const planningRoute = new Elysia({ prefix: "/planning", tags: ["planning"] }).get(
  "/:householdId/:scenario",
  async ({ request, set, params, query }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    const manualPeople = query.people;
    try {
      return await resolvePlanningTotals(params.householdId, params.scenario, manualPeople);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Internal error";
      set.status = msg.toLowerCase().includes("not found") ? 404 : 500;
      return { error: msg };
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
