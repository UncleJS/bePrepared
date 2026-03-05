import { db } from "../client";
import { inventoryCategories } from "../schema";
import { randomUUID } from "crypto";

const CATEGORIES = [
  { slug: "water-storage",     name: "Water Storage",          sortOrder: 1 },
  { slug: "water-treatment",   name: "Water Treatment",        sortOrder: 2 },
  { slug: "food-staples",      name: "Food — Staples",         sortOrder: 3 },
  { slug: "food-canned",       name: "Food — Canned",          sortOrder: 4 },
  { slug: "food-freeze-dried", name: "Food — Freeze-Dried",    sortOrder: 5 },
  { slug: "food-supplements",  name: "Food — Supplements",     sortOrder: 6 },
  { slug: "medical-first-aid", name: "Medical — First Aid",    sortOrder: 7 },
  { slug: "medical-rx",        name: "Medical — Prescriptions",sortOrder: 8 },
  { slug: "medical-otc",       name: "Medical — OTC Meds",     sortOrder: 9 },
  { slug: "fuel",              name: "Fuel",                   sortOrder: 10 },
  { slug: "batteries-primary", name: "Batteries — Primary",    sortOrder: 11 },
  { slug: "batteries-rechargeable", name: "Batteries — Rechargeable", sortOrder: 12 },
  { slug: "hygiene",           name: "Hygiene Supplies",       sortOrder: 13 },
  { slug: "sanitation",        name: "Sanitation Supplies",    sortOrder: 14 },
  { slug: "lighting",          name: "Lighting",               sortOrder: 15 },
  { slug: "comms",             name: "Communications",         sortOrder: 16 },
  { slug: "tools",             name: "Tools and Hardware",     sortOrder: 17 },
  { slug: "documents",         name: "Documents and Records",  sortOrder: 18 },
  { slug: "cash",              name: "Cash Reserves",          sortOrder: 19 },
  { slug: "clothing",          name: "Clothing and Warmth",    sortOrder: 20 },
];

export async function seedInventoryCategories() {
  console.log("  Seeding inventory categories...");
  for (const c of CATEGORIES) {
    await db.insert(inventoryCategories)
      .values({ id: randomUUID(), ...c })
      .onDuplicateKeyUpdate({ set: { name: c.name } });
  }
  console.log(`  ✓ ${CATEGORIES.length} inventory categories`);
}
