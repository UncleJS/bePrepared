import { db } from "../client";
import { maintenanceTemplates } from "../schema";
import { randomUUID } from "crypto";

const TEMPLATES = [
  // Water
  { categorySlug: "water", name: "Water filter inspection",      taskType: "inspect" as const, defaultCalDays: 90,  graceDays: 14 },
  { categorySlug: "water", name: "Water filter full service",    taskType: "full_service" as const, defaultCalDays: 365, graceDays: 14 },
  // Power
  { categorySlug: "power", name: "Generator test run",           taskType: "test" as const, defaultCalDays: 90,  graceDays: 7 },
  { categorySlug: "power", name: "Generator full service",       taskType: "full_service" as const, defaultCalDays: 365, graceDays: 14 },
  { categorySlug: "power", name: "Solar panel cleaning",         taskType: "clean" as const, defaultCalDays: 90,  graceDays: 14 },
  { categorySlug: "power", name: "Inverter inspection",          taskType: "inspect" as const, defaultCalDays: 180, graceDays: 14 },
  // Batteries
  { categorySlug: "batteries", name: "Li-Ion storage recharge",  taskType: "recharge" as const, defaultCalDays: 90,  graceDays: 7 },
  { categorySlug: "batteries", name: "Lead-acid charge check",   taskType: "inspect" as const, defaultCalDays: 30,  graceDays: 5 },
  { categorySlug: "batteries", name: "Battery bank capacity test", taskType: "test" as const, defaultCalDays: 180, graceDays: 14 },
  // Communications
  { categorySlug: "comms", name: "Radio test and battery check", taskType: "test" as const, defaultCalDays: 90,  graceDays: 7 },
  // Medical
  { categorySlug: "medical", name: "First aid kit inspection",   taskType: "inspect" as const, defaultCalDays: 90,  graceDays: 14 },
  { categorySlug: "medical", name: "AED inspection",             taskType: "inspect" as const, defaultCalDays: 90,  graceDays: 7 },
  // Shelter
  { categorySlug: "shelter", name: "Tent/shelter inspection",    taskType: "inspect" as const, defaultCalDays: 180, graceDays: 14 },
  // Mobility / Vehicles
  { categorySlug: "mobility", name: "Vehicle emergency kit check", taskType: "inspect" as const, defaultCalDays: 180, graceDays: 14 },
  { categorySlug: "mobility", name: "Vehicle fuel level check",  taskType: "inspect" as const, defaultCalDays: 30,  graceDays: 5 },
  // Fire safety
  { categorySlug: "security", name: "Fire extinguisher inspection", taskType: "inspect" as const, defaultCalDays: 365, graceDays: 14 },
  { categorySlug: "security", name: "Smoke detector test",       taskType: "test" as const, defaultCalDays: 90,  graceDays: 7 },
  // General
  { categorySlug: "general", name: "Emergency binder review",    taskType: "inspect" as const, defaultCalDays: 180, graceDays: 14 },
  { categorySlug: "general", name: "Full household drill",       taskType: "test" as const, defaultCalDays: 180, graceDays: 30 },
];

export async function seedMaintenanceTemplates() {
  console.log("  Seeding maintenance templates...");
  for (const t of TEMPLATES) {
    await db.insert(maintenanceTemplates)
      .values({ id: randomUUID(), ...t })
      .onDuplicateKeyUpdate({ set: { defaultCalDays: t.defaultCalDays } });
  }
  console.log(`  ✓ ${TEMPLATES.length} maintenance templates`);
}
