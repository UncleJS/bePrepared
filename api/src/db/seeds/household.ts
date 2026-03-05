import { db } from "../client";
import { households, householdPeopleProfiles } from "../schema";
import { randomUUID } from "crypto";

export async function seedHousehold() {
  console.log("  Seeding demo household...");
  const id = "demo-household-001";

  await db
    .insert(households)
    .values({
      id,
      name: "My Household",
      targetPeople: 2,
      activeScenario: "shelter_in_place",
      notes: "Default demo household created during initial seed. Edit in Settings.",
    })
    .onDuplicateKeyUpdate({ set: { name: "My Household" } });

  const profiles = [
    {
      id: randomUUID(),
      householdId: id,
      name: "Normal — 2 people",
      peopleCount: 2,
      isDefault: true,
      scenarioBound: null,
      notes: "Default household occupancy",
    },
    {
      id: randomUUID(),
      householdId: id,
      name: "Evacuation — 2 people",
      peopleCount: 2,
      isDefault: false,
      scenarioBound: "evacuation" as const,
      notes: "Evacuation scenario — same count, lighter resources assumed",
    },
    {
      id: randomUUID(),
      householdId: id,
      name: "Extended family — 5 people",
      peopleCount: 5,
      isDefault: false,
      scenarioBound: null,
      notes: "For when extended family shelters with you",
    },
  ];

  for (const p of profiles) {
    await db
      .insert(householdPeopleProfiles)
      .values(p)
      .onDuplicateKeyUpdate({ set: { notes: p.notes } });
  }
  console.log(`  ✓ Demo household + ${profiles.length} profiles`);
}
