import { randomUUID } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../client";
import { guidanceDocs, sections } from "../schema";

export async function seedGuidanceDocs() {
  console.log("  Seeding guidance docs...");

  const rows = await db.query.sections.findMany({
    where: isNull(sections.archivedAt),
    orderBy: sections.sortOrder,
  });

  let count = 0;
  for (const s of rows) {
    const title = `${s.title} - Quick Guide`;
    const existing = await db.query.guidanceDocs.findFirst({
      where: and(
        eq(guidanceDocs.sectionId, s.id),
        eq(guidanceDocs.title, title),
        isNull(guidanceDocs.archivedAt)
      ),
    });

    const body = [
      `Purpose: establish a repeatable process for ${s.title.toLowerCase()}.`,
      "- Define minimum household standard and required stock/equipment.",
      "- Record storage location, owner, and replacement cadence.",
      "- Run a monthly check and log gaps as tasks.",
      "- Validate this section for both shelter-in-place and evacuation.",
    ].join("\n");

    if (existing) {
      await db.update(guidanceDocs)
        .set({ body, sortOrder: 1 })
        .where(eq(guidanceDocs.id, existing.id));
      count++;
      continue;
    }

    await db.insert(guidanceDocs).values({
      id: randomUUID(),
      sectionId: s.id,
      title,
      body,
      sortOrder: 1,
    });
    count++;
  }

  console.log(`  ✓ ${count} guidance docs`);
}
