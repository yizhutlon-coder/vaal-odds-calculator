import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const sourcePath =
  "C:/Users/thelo/.codex/attachments/a27be212-0cc3-424c-ac56-5db88b1df6ba/pasted-text.txt";
const outputPath = new URL("../app/data/corruption-mods.ts", import.meta.url);

const source = await readFile(sourcePath, "utf8");
const lines = source.replace(/\r/g, "").split("\n");
const mods = [];
let current = null;

function addWeight(text) {
  const match = text.trim().match(/^([a-z0-9_]+)\s+(\d+)$/);
  if (!match || !current) return false;
  current.spawnWeights.push({ tag: match[1], weight: Number(match[2]) });
  return true;
}

function flush() {
  if (!current) return;
  current.stat = current.stat.replace(/\s+/g, " ").trim();
  if (current.spawnWeights.length) mods.push(current);
  current = null;
}

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line || line === "Equipment" || line.startsWith("Main article:")) continue;
  if (line.startsWith("Name\tGroups\t")) continue;

  const cells = rawLine.split("\t");
  if (/^[A-Za-z0-9_]+$/.test(cells[0] ?? "") && /^\d+$/.test(cells[2] ?? "")) {
    flush();
    current = {
      id: cells[0].trim(),
      group: cells[1].trim(),
      level: Number(cells[2]),
      stat: "",
      spawnWeights: [],
    };

    const tail = cells.slice(3).map((cell) => cell.trim()).filter(Boolean);
    if (tail.length && addWeight(tail.at(-1))) tail.pop();
    current.stat = tail.join(" ");
    continue;
  }

  if (!current) continue;
  const continuation = rawLine.split("\t").map((cell) => cell.trim()).filter(Boolean);
  if (continuation.length && addWeight(continuation.at(-1))) continuation.pop();
  if (continuation.length) current.stat += ` ${continuation.join(" ")}`;
}

flush();

const payload = `// Generated from the modifier table supplied for this calculator.\n` +
  `// Reviewed against the PoE Wiki corruption and modifier mechanics pages on 2026-08-09.\n` +
  `export type SpawnWeight = { tag: string; weight: number };\n` +
  `export type CorruptionMod = {\n` +
  `  id: string;\n  group: string;\n  level: number;\n  stat: string;\n  spawnWeights: SpawnWeight[];\n};\n\n` +
  `export const CORRUPTION_MODS: CorruptionMod[] = ${JSON.stringify(mods, null, 2)};\n`;

await mkdir(dirname(outputPath.pathname.slice(1)), { recursive: true });
await writeFile(outputPath, payload, "utf8");
console.log(`Generated ${mods.length} corruption modifiers.`);
