import { db } from "../client";
import { moduleCategories, modules, sections } from "../schema";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// System module categories (stable slugs — match old enum values exactly)
// ---------------------------------------------------------------------------
const MODULE_CATEGORIES: Array<{
  slug: string;
  title: string;
  sortOrder: number;
}> = [
  { slug: "water", title: "Water", sortOrder: 1 },
  { slug: "food", title: "Food", sortOrder: 2 },
  { slug: "shelter", title: "Shelter", sortOrder: 3 },
  { slug: "medical", title: "Medical", sortOrder: 4 },
  { slug: "power", title: "Power", sortOrder: 5 },
  { slug: "comms", title: "Communications", sortOrder: 6 },
  { slug: "sanitation", title: "Sanitation", sortOrder: 7 },
  { slug: "security", title: "Security", sortOrder: 8 },
  { slug: "mobility", title: "Mobility", sortOrder: 9 },
  { slug: "general", title: "General Preparedness", sortOrder: 10 },
];

// ---------------------------------------------------------------------------
// Modules + their sections
// ---------------------------------------------------------------------------
const MODULES: Array<{
  slug: string;
  title: string;
  categorySlug: string;
  sortOrder: number;
  description: string;
  sections: Array<{ slug: string; title: string; sortOrder: number }>;
}> = [
  {
    slug: "water",
    title: "Water",
    categorySlug: "water",
    sortOrder: 1,
    description:
      "Water storage, purification, and conservation strategies for all readiness levels.",
    sections: [
      { slug: "storage", title: "Storage", sortOrder: 1 },
      { slug: "purification", title: "Purification Methods", sortOrder: 2 },
      { slug: "conservation", title: "Conservation Strategies", sortOrder: 3 },
      { slug: "targets", title: "Planning Targets", sortOrder: 4 },
    ],
  },
  {
    slug: "food",
    title: "Food",
    categorySlug: "food",
    sortOrder: 2,
    description: "Food storage, rotation, caloric planning, and emergency cooking.",
    sections: [
      { slug: "storage-rotation", title: "Storage and Rotation", sortOrder: 1 },
      { slug: "caloric-planning", title: "Caloric Planning", sortOrder: 2 },
      { slug: "cooking", title: "Emergency Cooking", sortOrder: 3 },
      { slug: "special-diets", title: "Special Dietary Needs", sortOrder: 4 },
    ],
  },
  {
    slug: "shelter",
    title: "Shelter",
    categorySlug: "shelter",
    sortOrder: 3,
    description: "Shelter-in-place and evacuation shelter strategies, warmth, and safety.",
    sections: [
      { slug: "shelter-in-place", title: "Shelter-in-Place", sortOrder: 1 },
      { slug: "evacuation-kit", title: "Evacuation Kit", sortOrder: 2 },
      { slug: "warmth-cooling", title: "Warmth and Cooling", sortOrder: 3 },
    ],
  },
  {
    slug: "medical",
    title: "Medical",
    categorySlug: "medical",
    sortOrder: 4,
    description: "First aid supplies, medications, and emergency medical planning.",
    sections: [
      { slug: "first-aid", title: "First Aid Supplies", sortOrder: 1 },
      { slug: "medications", title: "Medications and Rx", sortOrder: 2 },
      { slug: "trauma", title: "Trauma and Wound Care", sortOrder: 3 },
      { slug: "mental-health", title: "Mental Health Resilience", sortOrder: 4 },
    ],
  },
  {
    slug: "power",
    title: "Power",
    categorySlug: "power",
    sortOrder: 5,
    description: "Backup power, batteries, lighting, and energy management.",
    sections: [
      { slug: "backup-power", title: "Backup Power Sources", sortOrder: 1 },
      { slug: "batteries", title: "Battery Management", sortOrder: 2 },
      { slug: "lighting", title: "Lighting", sortOrder: 3 },
      { slug: "solar", title: "Solar and Renewables", sortOrder: 4 },
    ],
  },
  {
    slug: "comms",
    title: "Communications",
    categorySlug: "comms",
    sortOrder: 6,
    description: "Emergency communications, radios, and information management.",
    sections: [
      { slug: "radio", title: "Emergency Radio", sortOrder: 1 },
      { slug: "contacts", title: "Contact Plans", sortOrder: 2 },
      { slug: "information", title: "Information Management", sortOrder: 3 },
    ],
  },
  {
    slug: "sanitation",
    title: "Sanitation",
    categorySlug: "sanitation",
    sortOrder: 7,
    description: "Hygiene, waste management, and sanitation without infrastructure.",
    sections: [
      { slug: "hygiene", title: "Personal Hygiene", sortOrder: 1 },
      { slug: "waste", title: "Waste Management", sortOrder: 2 },
      { slug: "disease-prevention", title: "Disease Prevention", sortOrder: 3 },
    ],
  },
  {
    slug: "security",
    title: "Security",
    categorySlug: "security",
    sortOrder: 8,
    description: "Home security, community coordination, and safety planning.",
    sections: [
      { slug: "home-security", title: "Home Security", sortOrder: 1 },
      { slug: "community", title: "Community Coordination", sortOrder: 2 },
      { slug: "documentation", title: "Document Safety", sortOrder: 3 },
    ],
  },
  {
    slug: "mobility",
    title: "Mobility",
    categorySlug: "mobility",
    sortOrder: 9,
    description: "Evacuation routes, vehicles, and bug-out planning.",
    sections: [
      { slug: "evacuation-routes", title: "Evacuation Routes", sortOrder: 1 },
      { slug: "vehicles", title: "Vehicle Readiness", sortOrder: 2 },
      { slug: "bug-out-bag", title: "Bug-Out Bag", sortOrder: 3 },
    ],
  },
  {
    slug: "general",
    title: "General Preparedness",
    categorySlug: "general",
    sortOrder: 10,
    description: "Overall household readiness plans, drills, and documentation.",
    sections: [
      { slug: "household-plan", title: "Household Plan", sortOrder: 1 },
      { slug: "drills", title: "Drills and Exercises", sortOrder: 2 },
      { slug: "finances", title: "Emergency Finances", sortOrder: 3 },
    ],
  },
];

export async function seedModules() {
  console.log("  Seeding module categories...");

  // 1. Upsert categories
  for (const cat of MODULE_CATEGORIES) {
    await db
      .insert(moduleCategories)
      .values({ id: randomUUID(), ...cat })
      .onDuplicateKeyUpdate({ set: { title: cat.title, sortOrder: cat.sortOrder } });
  }

  // 2. Build slug → id lookup
  const catRows = await db.query.moduleCategories.findMany();
  const catBySlug = new Map(catRows.map((c) => [c.slug, c.id]));

  console.log("  Seeding modules and sections...");
  let mCount = 0,
    sCount = 0;

  for (const mod of MODULES) {
    const { sections: secs, categorySlug, ...modData } = mod;
    const categoryId = catBySlug.get(categorySlug);
    if (!categoryId) throw new Error(`Category not found for slug: ${categorySlug}`);

    const modId = randomUUID();
    await db
      .insert(modules)
      .values({ id: modId, categoryId, ...modData })
      .onDuplicateKeyUpdate({ set: { title: modData.title } });

    // Re-fetch to get real id in case of upsert
    const existing = await db.query.modules.findFirst({
      where: (m, { eq }) => eq(m.slug, modData.slug),
    });
    const moduleId = existing?.id ?? modId;
    mCount++;

    for (const sec of secs) {
      await db
        .insert(sections)
        .values({ id: randomUUID(), moduleId, ...sec })
        .onDuplicateKeyUpdate({ set: { title: sec.title } });
      sCount++;
    }
  }

  console.log(`  ✓ ${MODULE_CATEGORIES.length} categories, ${mCount} modules, ${sCount} sections`);
}
