// =============================================================================
// lint-mermaid.js — Validate Mermaid diagram blocks in all Markdown files
// =============================================================================
//
// PURPOSE
//   Scans every Markdown file under docs/ and any EXTRA_FILES (e.g. README.md)
//   for fenced ```mermaid ... ``` blocks and validates each one. Checks:
//     - The block is not empty.
//     - The first non-comment line is a recognised Mermaid diagram directive
//       (graph, flowchart, sequenceDiagram, erDiagram, etc.).
//     - The fence is properly closed (no unclosed ``` blocks).
//
//   Prints a summary and exits with code 0 on pass, 1 on any error. Designed
//   to be run as a pre-commit hook or CI lint step via `bun run lint:mermaid`.
//
// PREREQUISITES
//   - Bun (or Node.js ≥ 18) — uses only Node built-ins (node:fs, node:path)
//   - Must be run from the project root (process.cwd() is used as ROOT)
//   - docs/ directory must exist (even if empty)
//
// PHASES
//   1. Config          — define ROOT, search dirs, extra files, and the
//                        regex patterns used during parsing
//   2. File discovery  — recursively collect .md files from DOC_DIRS;
//                        append EXTRA_FILES that exist on disk
//   3. Lint logic      — lintFile() state-machine: track inMermaid flag,
//                        collect block lines, validate on closing fence
//   4. Main + reporting — flatMap lintFile over all files; print errors and
//                         exit with appropriate code
//
// FLAGS / ENV VARS
//   (no CLI flags — pass file lists by editing DOC_DIRS / EXTRA_FILES)
//   (no env vars)
//
// USAGE
//   bun run scripts/lint-mermaid.js
//   node scripts/lint-mermaid.js
//
// EXAMPLES
//   bun run lint:mermaid             # run via package.json script
//   bun run scripts/lint-mermaid.js  # run directly
//
// =============================================================================

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// ── Config ────────────────────────────────────────────────────────────────────
// ROOT is resolved from the working directory so the script must be invoked
// from the repo root (as it is when called via `bun run lint:mermaid`).
//
// DOC_DIRS    — directories to scan recursively for .md files
// EXTRA_FILES — individual files outside DOC_DIRS to include (e.g. README.md)
//
// HEADER_RE          — matches the opening ```mermaid fence
// FOOTER_RE          — matches the closing ``` fence
// FIRST_DIRECTIVE_RE — matches all Mermaid diagram type keywords; the first
//                      non-comment line inside a block must match this pattern

const ROOT = process.cwd();
const DOC_DIRS = ["docs"];
const EXTRA_FILES = ["README.md"];

const HEADER_RE = /^```mermaid\s*$/;
const FOOTER_RE = /^```\s*$/;
const FIRST_DIRECTIVE_RE =
  /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|sankey-beta|xychart-beta|block-beta)\b/;

// ── File discovery ────────────────────────────────────────────────────────────
// Recursively walk a directory and return relative paths to all .md files.
// Symlinks to directories are not followed (readdirSync default behaviour).

function listMarkdownFiles(dirPath) {
  const abs = join(ROOT, dirPath);
  const out = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const full = join(abs, entry.name);
    if (entry.isDirectory()) {
      out.push(...listMarkdownFiles(join(dirPath, entry.name)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      out.push(join(dirPath, entry.name));
    }
  }
  return out;
}

// ── Lint logic ────────────────────────────────────────────────────────────────
// firstMeaningfulLine() skips blank lines and Mermaid %%-comments so that a
// diagram type keyword is always the first thing validated, regardless of how
// many comment lines precede it.
//
// lintFile() drives a two-state machine over the file's lines:
//   inMermaid=false  — scanning for an opening ```mermaid fence
//   inMermaid=true   — inside a block; collecting lines until closing fence
//
// Errors are returned as strings (not thrown) so all files are checked before
// the process exits, giving the engineer a full list of issues at once.

function firstMeaningfulLine(lines) {
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("%%")) continue;
    return line;
  }
  return "";
}

function lintFile(relPath) {
  const absPath = join(ROOT, relPath);
  const lines = readFileSync(absPath, "utf8").split(/\r?\n/);
  const errors = [];

  let inMermaid = false;
  let blockStart = 0;
  let blockLines = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (!inMermaid && HEADER_RE.test(line.trim())) {
      inMermaid = true;
      blockStart = i + 1;
      blockLines = [];
      continue;
    }

    if (inMermaid && FOOTER_RE.test(line.trim())) {
      const firstLine = firstMeaningfulLine(blockLines);
      if (!firstLine) {
        errors.push(`${relPath}:${blockStart}: empty mermaid block`);
      } else if (!FIRST_DIRECTIVE_RE.test(firstLine)) {
        errors.push(
          `${relPath}:${blockStart}: unsupported/invalid mermaid directive '${firstLine}'`
        );
      }
      inMermaid = false;
      blockLines = [];
      continue;
    }

    if (inMermaid) {
      blockLines.push(line);
    }
  }

  // A block that was opened but never closed is always an error.
  if (inMermaid) {
    errors.push(`${relPath}:${blockStart}: unclosed mermaid fence`);
  }

  return errors;
}

function existsPath(relPath) {
  try {
    return statSync(join(ROOT, relPath)).isFile();
  } catch {
    return false;
  }
}

// ── Main + reporting ──────────────────────────────────────────────────────────
// Collect all markdown files, run lintFile() on each, aggregate errors, and
// exit with code 1 if any were found. All errors are printed before exiting
// so the engineer sees the complete list rather than fixing one at a time.

const markdownFiles = [...DOC_DIRS.flatMap(listMarkdownFiles), ...EXTRA_FILES.filter(existsPath)];

const errors = markdownFiles.flatMap(lintFile);

if (errors.length > 0) {
  console.error("Mermaid lint failed:\n");
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log(`Mermaid lint passed (${markdownFiles.length} markdown files checked).`);
