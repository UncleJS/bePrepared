import { db } from "../client";
import { batteryProfiles } from "../schema";
import { randomUUID } from "crypto";

const PROFILES = [
  {
    name: "Alkaline AA/AAA",
    chemistry: "alkaline" as const,
    shelfLifeDays: 3650, // ~10 years
    recheckCycleDays: 365,
    storageTempMin: 10,
    storageTempMax: 25,
    notes: "Store at room temperature. Check annually for leakage. Replace if bulging.",
  },
  {
    name: "Lithium Primary (AA/AAA/CR123)",
    chemistry: "lithium_primary" as const,
    shelfLifeDays: 3650, // ~10 years
    recheckCycleDays: 365,
    storageTempMin: -20,
    storageTempMax: 30,
    notes: "Excellent cold-weather performance. Ideal for flashlights and critical devices.",
  },
  {
    name: "Li-Ion Rechargeable",
    chemistry: "liion" as const,
    shelfLifeDays: 730,
    recheckCycleDays: 90, // recharge to ~50% every 3 months in storage
    storageTempMin: 15,
    storageTempMax: 25,
    notes: "Store at 40-60% charge. Avoid full discharge. Recharge every 3 months in storage.",
  },
  {
    name: "NiMH Rechargeable",
    chemistry: "nimh" as const,
    shelfLifeDays: 365,
    recheckCycleDays: 90,
    storageTempMin: 10,
    storageTempMax: 20,
    notes: "Higher self-discharge than lithium. Check and recharge every 3 months.",
  },
  {
    name: "Lead-Acid (12V)",
    chemistry: "lead_acid" as const,
    shelfLifeDays: 365,
    recheckCycleDays: 30, // check charge monthly
    storageTempMin: 10,
    storageTempMax: 25,
    notes:
      "Check charge monthly. Top up to full charge. Keep terminals clean. Store in ventilated area.",
  },
];

export async function seedBatteryProfiles() {
  console.log("  Seeding battery profiles...");
  for (const p of PROFILES) {
    await db
      .insert(batteryProfiles)
      .values({ id: randomUUID(), ...p })
      .onDuplicateKeyUpdate({ set: { notes: p.notes } });
  }
  console.log(`  ✓ ${PROFILES.length} battery profiles`);
}
