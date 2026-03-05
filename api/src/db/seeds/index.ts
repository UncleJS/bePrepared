/**
 * db/seeds/index.ts — master seed runner
 */
import { db } from "../client";
import { seedPolicyDefaults }     from "./policyDefaults";
import { seedModules }            from "./modules";
import { seedBatteryProfiles }    from "./batteryProfiles";
import { seedMaintenanceTemplates } from "./maintenanceTemplates";
import { seedInventoryCategories } from "./inventoryCategories";
import { seedTasksAndDependencies } from "./tasks";
import { seedHousehold }          from "./household";
import { seedUsers }              from "./users";

async function main() {
  console.log("🌱 Starting seed...");
  await seedPolicyDefaults();
  await seedModules();
  await seedBatteryProfiles();
  await seedMaintenanceTemplates();
  await seedInventoryCategories();
  await seedTasksAndDependencies();
  await seedHousehold();
  await seedUsers();
  console.log("✅ Seed complete.");
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
