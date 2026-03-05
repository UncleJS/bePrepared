import { db } from "../client";
import { policyDefaults } from "../schema";

export async function seedPolicyDefaults() {
  console.log("  Seeding policy defaults...");
  const defaults = [
    {
      key: "water_liters_per_person_per_day",
      valueDecimal: "4.0",
      valueInt: null,
      unit: "L/person/day",
      description:
        "Drinking + minimal food prep and basic hygiene. WHO emergency minimum is 2L/day; 4L provides a realistic planning buffer.",
    },
    {
      key: "calories_kcal_per_person_per_day",
      valueDecimal: null,
      valueInt: 2200,
      unit: "kcal/person/day",
      description:
        "Baseline adult mixed-household caloric planning value. Sedentary adult minimum is ~1800; 2200 covers light-activity shelter operations.",
    },
    {
      key: "alert_upcoming_days",
      valueDecimal: null,
      valueInt: 14,
      unit: "days",
      description:
        "Number of days ahead to generate 'upcoming' alerts for expiry, replacement, and maintenance.",
    },
    {
      key: "alert_grace_days",
      valueDecimal: null,
      valueInt: 3,
      unit: "days",
      description: "Grace window in days past due before escalating from due to overdue.",
    },
  ];

  for (const row of defaults) {
    await db
      .insert(policyDefaults)
      .values(row)
      .onDuplicateKeyUpdate({ set: { description: row.description } });
  }
  console.log(`  ✓ ${defaults.length} policy defaults`);
}
