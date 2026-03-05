import { db } from "../client";
import { equipmentCategories } from "../schema";
import { randomUUID } from "crypto";
import { and, eq, isNull } from "drizzle-orm";

const CATEGORIES = [
  { slug: "power", name: "Power", sortOrder: 1 },
  { slug: "water", name: "Water", sortOrder: 2 },
  { slug: "medical", name: "Medical", sortOrder: 3 },
  { slug: "tools", name: "Tools", sortOrder: 4 },
  { slug: "lighting", name: "Lighting", sortOrder: 5 },
  { slug: "comms", name: "Communications", sortOrder: 6 },
  { slug: "security", name: "Security", sortOrder: 7 },
  { slug: "shelter", name: "Shelter", sortOrder: 8 },
  { slug: "mobility", name: "Mobility", sortOrder: 9 },
  { slug: "general", name: "General", sortOrder: 10 },
];

export async function seedEquipmentCategories() {
  console.log("  Seeding equipment categories...");
  for (const c of CATEGORIES) {
    const existing = await db.query.equipmentCategories.findFirst({
      where: and(
        isNull(equipmentCategories.householdId),
        eq(equipmentCategories.slug, c.slug),
        eq(equipmentCategories.isSystem, true),
        isNull(equipmentCategories.archivedAt)
      ),
    });

    if (existing) {
      await db
        .update(equipmentCategories)
        .set({ name: c.name, sortOrder: c.sortOrder })
        .where(eq(equipmentCategories.id, existing.id));
      continue;
    }

    await db.insert(equipmentCategories).values({
      id: randomUUID(),
      householdId: null,
      isSystem: true,
      slug: c.slug,
      name: c.name,
      sortOrder: c.sortOrder,
    });
  }
  console.log(`  ✓ ${CATEGORIES.length} equipment categories`);
}
