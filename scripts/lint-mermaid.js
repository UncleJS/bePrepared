import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DOC_DIRS = ["docs"];
const EXTRA_FILES = ["README.md"];

const HEADER_RE = /^```mermaid\s*$/;
const FOOTER_RE = /^```\s*$/;
const FIRST_DIRECTIVE_RE =
  /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|sankey-beta|xychart-beta|block-beta)\b/;

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

const markdownFiles = [...DOC_DIRS.flatMap(listMarkdownFiles), ...EXTRA_FILES.filter(existsPath)];

const errors = markdownFiles.flatMap(lintFile);

if (errors.length > 0) {
  console.error("Mermaid lint failed:\n");
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log(`Mermaid lint passed (${markdownFiles.length} markdown files checked).`);
