import { Elysia, t } from "elysia";
import { resolvePlanningTotals } from "../../lib/policyEngine";
import { requireHouseholdScope } from "../../lib/routeAuth";

type Scenario = "shelter_in_place" | "evacuation";

export const planningRoute = new Elysia({ prefix: "/planning", tags: ["planning"] })

  .get("/:householdId/:scenario", async ({ request, set, params, query }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    const manualPeople = query.people ? Number(query.people) : undefined;
    return resolvePlanningTotals(
      params.householdId,
      params.scenario as Scenario,
      manualPeople
    );
  }, {
    query: t.Object({
      people: t.Optional(t.String()),
    }),
    detail: {
      summary: "Resolve effective planning totals for a household and scenario",
      description: `
Returns effective water and calorie totals for 72h, 14d, 30d, and 90d horizons.
Policy precedence: scenario override → household global override → system default.
People precedence: manual override → scenario-bound profile → active profile → household baseline.
      `.trim(),
    },
  });
