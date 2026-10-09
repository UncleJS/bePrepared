import { readdirSync, readFileSync } from "fs";
import path from "path";

const dir = path.join(import.meta.dir, "../api/src/db/migrations");
const journal = JSON.parse(readFileSync(path.join(dir, "meta/_journal.json"), "utf8")) as {
  entries: { tag: string }[];
};

const tags = new Set(journal.entries.map((entry) => entry.tag));
const files = readdirSync(dir).filter((name) => name.endsWith(".sql"));
const fileTags = new Set(files.map((name) => name.replace(/\.sql$/, "")));

let failed = false;
for (const tag of fileTags) {
  if (!tags.has(tag)) {
    console.error(`SQL migration missing from journal: ${tag}`);
    failed = true;
  }
}
for (const tag of tags) {
  if (!fileTags.has(tag)) {
    console.error(`Journal entry missing SQL file: ${tag}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`Migration journal matches ${files.length} SQL files.`);
