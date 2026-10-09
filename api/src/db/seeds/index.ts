/**
 * db/seeds/index.ts — master seed runner
 */
import { db } from "../client";
import { seedPolicyDefaults } from "./policyDefaults";
import { seedModules } from "./modules";
import { seedBatteryProfiles } from "./batteryProfiles";
import { seedMaintenanceTemplates } from "./maintenanceTemplates";
import { seedInventoryCategories } from "./inventoryCategories";
import { seedEquipmentCategories } from "./equipmentCategories";
import { seedGuidanceDocs } from "./guidanceDocs";
import { seedTasksAndDependencies } from "./tasks";
import { seedHousehold } from "./household";
import { seedUsers } from "./users";

export async function seedReference() {
  await seedPolicyDefaults();
  await seedModules();
  await seedGuidanceDocs();
  await seedBatteryProfiles();
  await seedMaintenanceTemplates();
  await seedInventoryCategories();
  await seedEquipmentCategories();
  await seedTasksAndDependencies();
}

export async function seedDemo() {
  await seedHousehold();
  await seedUsers();
}

async function main() {
  const referenceOnly = process.argv.includes("--reference-only");
  const demoOnly = process.argv.includes("--demo-only");
  console.log("🌱 Starting seed...");
  if (!demoOnly) {
    console.log("  Reference data (modules, categories, policies)...");
    await seedReference();
  }
  if (!referenceOnly) {
    console.log("  Demo household and admin user...");
    await seedDemo();
  }
  console.log("✅ Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
