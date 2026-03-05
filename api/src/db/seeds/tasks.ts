import { db } from "../client";
import { tasks } from "../schema";
import { randomUUID } from "crypto";
import { and, eq, isNull } from "drizzle-orm";

// Tasks organized by module, level, class
const TASKS = [
  // ── WATER ──────────────────────────────────────────────────────────────────
  { moduleSlug:"water", readinessLevel:"l1_72h",  taskClass:"acquire",  scenario:"both",              title:"Store minimum 3-day water supply (bottled or containers)", evidencePrompt:"How many litres stored? Where?" },
  { moduleSlug:"water", readinessLevel:"l1_72h",  taskClass:"acquire",  scenario:"both",              title:"Acquire water purification tablets (e.g. Aquatabs)", evidencePrompt:"Brand and qty?" },
  { moduleSlug:"water", readinessLevel:"l2_14d",  taskClass:"acquire",  scenario:"both",              title:"Store 14-day water supply in food-grade containers", evidencePrompt:"Total litres? Container type?" },
  { moduleSlug:"water", readinessLevel:"l2_14d",  taskClass:"acquire",  scenario:"both",              title:"Acquire portable water filter (Sawyer, LifeStraw, or equivalent)", evidencePrompt:"Model and filter capacity?" },
  { moduleSlug:"water", readinessLevel:"l3_30d",  taskClass:"acquire",  scenario:"shelter_in_place",  title:"Store 30-day water supply (large-volume containers/barrels)", evidencePrompt:"Total litres and barrel count?" },
  { moduleSlug:"water", readinessLevel:"l3_30d",  taskClass:"acquire",  scenario:"both",              title:"Acquire gravity filter system (Big Berkey or equivalent)", evidencePrompt:"Model and capacity?" },
  { moduleSlug:"water", readinessLevel:"l3_30d",  taskClass:"test",     scenario:"both",              title:"Test all water purification methods end-to-end", evidencePrompt:"Methods tested and results?" },
  { moduleSlug:"water", readinessLevel:"l4_90d",  taskClass:"acquire",  scenario:"shelter_in_place",  title:"Store 90-day water supply or establish reliable collection/treatment system", evidencePrompt:"Source and treatment method?" },
  { moduleSlug:"water", readinessLevel:"l4_90d",  taskClass:"maintain", scenario:"both",              title:"Rotate water storage (replace every 6-12 months)", isRecurring:true, recurDays:180, evidencePrompt:"Date rotated and qty?" },

  // ── FOOD ───────────────────────────────────────────────────────────────────
  { moduleSlug:"food", readinessLevel:"l1_72h",  taskClass:"acquire",  scenario:"both",              title:"Store 72-hour food supply (no-cook or minimal-cook)", evidencePrompt:"Items stocked and caloric estimate?" },
  { moduleSlug:"food", readinessLevel:"l1_72h",  taskClass:"acquire",  scenario:"evacuation",        title:"Pack 72-hour evacuation food (lightweight, high-calorie)", evidencePrompt:"Items and pack weight?" },
  { moduleSlug:"food", readinessLevel:"l2_14d",  taskClass:"acquire",  scenario:"both",              title:"Store 14-day food supply (canned + dry goods)", evidencePrompt:"Caloric total and storage location?" },
  { moduleSlug:"food", readinessLevel:"l2_14d",  taskClass:"prepare",  scenario:"both",              title:"Create household meal plan for 14-day supply", evidencePrompt:"Plan document location?" },
  { moduleSlug:"food", readinessLevel:"l3_30d",  taskClass:"acquire",  scenario:"both",              title:"Store 30-day food supply with variety and nutrition balance", evidencePrompt:"Protein/carb/fat sources confirmed?" },
  { moduleSlug:"food", readinessLevel:"l3_30d",  taskClass:"acquire",  scenario:"both",              title:"Acquire camp stove + fuel for 30-day cooking capacity", evidencePrompt:"Stove type and fuel quantity?" },
  { moduleSlug:"food", readinessLevel:"l3_30d",  taskClass:"maintain", scenario:"both",              title:"Rotate food stock (FIFO — first in, first out)", isRecurring:true, recurDays:90, evidencePrompt:"Items rotated and expiry dates checked?" },
  { moduleSlug:"food", readinessLevel:"l4_90d",  taskClass:"acquire",  scenario:"shelter_in_place",  title:"Store 90-day food supply including long-shelf-life staples", evidencePrompt:"Total kcal banked?" },

  // ── POWER ──────────────────────────────────────────────────────────────────
  { moduleSlug:"power", readinessLevel:"l1_72h",  taskClass:"acquire",  scenario:"both",              title:"Acquire portable power bank (min 20,000 mAh) with charging cables", evidencePrompt:"Capacity and devices charged?" },
  { moduleSlug:"power", readinessLevel:"l1_72h",  taskClass:"acquire",  scenario:"both",              title:"Stock primary cell batteries for all critical devices (flashlights, radios)", evidencePrompt:"Types and quantities?" },
  { moduleSlug:"power", readinessLevel:"l2_14d",  taskClass:"acquire",  scenario:"both",              title:"Acquire solar charger panel (min 21W) for phones and power banks", evidencePrompt:"Model and wattage?" },
  { moduleSlug:"power", readinessLevel:"l2_14d",  taskClass:"maintain", scenario:"both",              title:"Check and recharge all batteries (Li-Ion/NiMH) in storage", isRecurring:true, recurDays:90, evidencePrompt:"Batteries checked and status?" },
  { moduleSlug:"power", readinessLevel:"l3_30d",  taskClass:"acquire",  scenario:"shelter_in_place",  title:"Acquire portable generator or large capacity battery station", evidencePrompt:"Model, wattage, runtime?" },
  { moduleSlug:"power", readinessLevel:"l3_30d",  taskClass:"test",     scenario:"both",              title:"Test generator/power station under load", isRecurring:true, recurDays:90, evidencePrompt:"Load tested and runtime confirmed?" },
  { moduleSlug:"power", readinessLevel:"l4_90d",  taskClass:"acquire",  scenario:"shelter_in_place",  title:"Install or acquire solar + battery storage for long-term operation", evidencePrompt:"System capacity and coverage?" },

  // ── COMMS ──────────────────────────────────────────────────────────────────
  { moduleSlug:"comms", readinessLevel:"l1_72h",  taskClass:"document", scenario:"both",              title:"Write household emergency contact list (physical copy)", evidencePrompt:"Contacts documented and accessible?" },
  { moduleSlug:"comms", readinessLevel:"l1_72h",  taskClass:"acquire",  scenario:"both",              title:"Acquire battery-powered or hand-crank AM/FM/weather radio", evidencePrompt:"Model and battery type?" },
  { moduleSlug:"comms", readinessLevel:"l2_14d",  taskClass:"document", scenario:"both",              title:"Establish out-of-area contact and meeting points", evidencePrompt:"Primary and backup contacts documented?" },
  { moduleSlug:"comms", readinessLevel:"l2_14d",  taskClass:"acquire",  scenario:"both",              title:"Acquire FRS/GMRS walkie-talkies (2+ handsets)", evidencePrompt:"Model and channel plan?" },
  { moduleSlug:"comms", readinessLevel:"l3_30d",  taskClass:"test",     scenario:"both",              title:"Conduct comms test across all household devices", isRecurring:true, recurDays:90, evidencePrompt:"All devices tested and functional?" },
  { moduleSlug:"comms", readinessLevel:"l4_90d",  taskClass:"acquire",  scenario:"both",              title:"Acquire amateur (ham) radio license and HF/VHF equipment", evidencePrompt:"License obtained? Equipment details?" },

  // ── MEDICAL ────────────────────────────────────────────────────────────────
  { moduleSlug:"medical", readinessLevel:"l1_72h",  taskClass:"acquire",  scenario:"both",              title:"Assemble basic first aid kit (IFAK minimum)", evidencePrompt:"Kit contents listed?" },
  { moduleSlug:"medical", readinessLevel:"l1_72h",  taskClass:"acquire",  scenario:"both",              title:"Stock 30-day prescription medications (as possible)", evidencePrompt:"Medications listed and qty confirmed?" },
  { moduleSlug:"medical", readinessLevel:"l2_14d",  taskClass:"acquire",  scenario:"both",              title:"Expand first aid kit (tourniquet, chest seal, SAM splint)", evidencePrompt:"Advanced items stocked?" },
  { moduleSlug:"medical", readinessLevel:"l2_14d",  taskClass:"maintain", scenario:"both",              title:"Inspect first aid kit and replace expired items", isRecurring:true, recurDays:90, evidencePrompt:"Expiry dates checked? Items replaced?" },
  { moduleSlug:"medical", readinessLevel:"l3_30d",  taskClass:"document", scenario:"both",              title:"Document household medical conditions and medication protocol", evidencePrompt:"Document created and stored?" },
  { moduleSlug:"medical", readinessLevel:"l3_30d",  taskClass:"prepare",  scenario:"both",              title:"Complete first aid / CPR training", evidencePrompt:"Certificate obtained? Date?" },

  // ── SHELTER ────────────────────────────────────────────────────────────────
  { moduleSlug:"shelter", readinessLevel:"l1_72h",  taskClass:"prepare",  scenario:"both",              title:"Identify safe room in home for shelter-in-place", evidencePrompt:"Room identified and documented?" },
  { moduleSlug:"shelter", readinessLevel:"l1_72h",  taskClass:"prepare",  scenario:"evacuation",        title:"Identify primary and secondary evacuation routes from home", evidencePrompt:"Routes mapped and shared with household?" },
  { moduleSlug:"shelter", readinessLevel:"l2_14d",  taskClass:"acquire",  scenario:"evacuation",        title:"Acquire quality sleeping bags rated for local winter conditions", evidencePrompt:"Rating and bag count?" },
  { moduleSlug:"shelter", readinessLevel:"l2_14d",  taskClass:"acquire",  scenario:"evacuation",        title:"Acquire emergency tent or tarp shelter for evacuation", evidencePrompt:"Shelter type and person-capacity?" },
  { moduleSlug:"shelter", readinessLevel:"l3_30d",  taskClass:"prepare",  scenario:"shelter_in_place",  title:"Prepare home for extended power outage (insulation, blackout)", evidencePrompt:"Insulation and blackout measures in place?" },
  { moduleSlug:"shelter", readinessLevel:"l4_90d",  taskClass:"test",     scenario:"evacuation",        title:"Conduct full evacuation drill to identified rally point", isRecurring:true, recurDays:180, evidencePrompt:"Drill date and time to rally point?" },

  // ── SANITATION ─────────────────────────────────────────────────────────────
  { moduleSlug:"sanitation", readinessLevel:"l1_72h",  taskClass:"acquire",  scenario:"both",              title:"Stock 30-day supply of hygiene essentials (soap, toothpaste, toilet paper)", evidencePrompt:"Items and quantities listed?" },
  { moduleSlug:"sanitation", readinessLevel:"l2_14d",  taskClass:"acquire",  scenario:"both",              title:"Acquire portable toilet / waste management solution", evidencePrompt:"Solution type and supplies?" },
  { moduleSlug:"sanitation", readinessLevel:"l3_30d",  taskClass:"prepare",  scenario:"shelter_in_place",  title:"Plan grey water and waste disposal for extended outage", evidencePrompt:"Disposal plan documented?" },

  // ── SECURITY ───────────────────────────────────────────────────────────────
  { moduleSlug:"security", readinessLevel:"l1_72h",  taskClass:"document", scenario:"both",              title:"Compile copies of vital documents (ID, insurance, deeds, medical)", evidencePrompt:"Documents copied and stored safely?" },
  { moduleSlug:"security", readinessLevel:"l2_14d",  taskClass:"prepare",  scenario:"both",              title:"Establish neighbourhood watch / community preparedness network", evidencePrompt:"Contacts established?" },
  { moduleSlug:"security", readinessLevel:"l3_30d",  taskClass:"acquire",  scenario:"both",              title:"Install exterior lighting (solar) and door/window security measures", evidencePrompt:"Measures installed?" },

  // ── MOBILITY ───────────────────────────────────────────────────────────────
  { moduleSlug:"mobility", readinessLevel:"l1_72h",  taskClass:"prepare",  scenario:"evacuation",        title:"Assemble 72-hour bug-out bag for each household member", evidencePrompt:"Bag weight and contents listed?" },
  { moduleSlug:"mobility", readinessLevel:"l2_14d",  taskClass:"document", scenario:"evacuation",        title:"Pre-plan 3 evacuation routes with alternates and rally points", evidencePrompt:"Routes mapped and printed?" },
  { moduleSlug:"mobility", readinessLevel:"l3_30d",  taskClass:"maintain", scenario:"evacuation",        title:"Maintain vehicle fuel above half-tank", isRecurring:true, recurDays:30, evidencePrompt:"Fuel level and vehicle ready?" },
  { moduleSlug:"mobility", readinessLevel:"l4_90d",  taskClass:"test",     scenario:"evacuation",        title:"Conduct timed evacuation drill (leave home within target time)", isRecurring:true, recurDays:180, evidencePrompt:"Target time and actual time?" },

  // ── GENERAL ────────────────────────────────────────────────────────────────
  { moduleSlug:"general", readinessLevel:"l1_72h",  taskClass:"document", scenario:"both",              title:"Create and share household emergency action plan", evidencePrompt:"Plan written and shared with all members?" },
  { moduleSlug:"general", readinessLevel:"l2_14d",  taskClass:"document", scenario:"both",              title:"Open emergency cash reserve (minimum $300 small bills)", evidencePrompt:"Amount reserved and stored?" },
  { moduleSlug:"general", readinessLevel:"l3_30d",  taskClass:"test",     scenario:"both",              title:"Conduct full household preparedness review", isRecurring:true, recurDays:90, evidencePrompt:"Review completed and gaps noted?" },
  { moduleSlug:"general", readinessLevel:"l4_90d",  taskClass:"maintain", scenario:"both",              title:"Review and update all readiness plans and inventories annually", isRecurring:true, recurDays:365, evidencePrompt:"Review date and key updates?" },
];

export async function seedTasksAndDependencies() {
  console.log("  Seeding tasks...");

  // Fetch all modules to resolve slugs -> ids
  const allModules = await db.query.modules.findMany();
  const slugToId: Record<string, string> = {};
  for (const m of allModules) slugToId[m.slug] = m.id;

  for (const [i, task] of TASKS.entries()) {
    const moduleId = slugToId[task.moduleSlug];
    if (!moduleId) {
      console.warn(`  ⚠ Module slug not found: ${task.moduleSlug}`);
      continue;
    }
    const existing = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.moduleId, moduleId),
        eq(tasks.title, task.title),
        isNull(tasks.archivedAt)
      ),
    });

    if (existing) {
      await db.update(tasks)
        .set({
          taskClass: task.taskClass as "acquire" | "prepare" | "test" | "maintain" | "document",
          readinessLevel: task.readinessLevel as "l1_72h" | "l2_14d" | "l3_30d" | "l4_90d",
          scenario: task.scenario as "both" | "shelter_in_place" | "evacuation",
          isRecurring: task.isRecurring ?? false,
          recurDays: task.recurDays,
          sortOrder: i,
          evidencePrompt: task.evidencePrompt,
        })
        .where(eq(tasks.id, existing.id));
      continue;
    }

    await db.insert(tasks).values({
      id:             randomUUID(),
      moduleId,
      title:          task.title,
      taskClass:      task.taskClass as "acquire" | "prepare" | "test" | "maintain" | "document",
      readinessLevel: task.readinessLevel as "l1_72h" | "l2_14d" | "l3_30d" | "l4_90d",
      scenario:       task.scenario as "both" | "shelter_in_place" | "evacuation",
      isRecurring:    task.isRecurring ?? false,
      recurDays:      task.recurDays,
      sortOrder:      i,
      evidencePrompt: task.evidencePrompt,
    });
  }
  console.log(`  ✓ ${TASKS.length} tasks seeded`);
}
