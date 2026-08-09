import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const docs = new URL("../docs/", import.meta.url);

await mkdir(docs, { recursive: true });

const sourceData = await readFile(new URL("app/data/corruption-mods.ts", root), "utf8");
const dataMatch = sourceData.match(/export const CORRUPTION_MODS:[^=]+ = (\[[\s\S]+\]);\s*$/);
if (!dataMatch) throw new Error("Could not read corruption modifier data.");

const sourceCss = await readFile(new URL("app/globals.css", root), "utf8");
const staticCss = sourceCss
  .replace(/^@import "tailwindcss";\s*/m, "")
  .replace(':root {', ':root {\n  --font-display: "Cinzel";\n  --font-sans: "DM Sans";');

await writeFile(new URL("data.js", docs), `window.CORRUPTION_MODS = ${dataMatch[1]};\n`, "utf8");
await writeFile(new URL("styles.css", docs), staticCss, "utf8");
await copyFile(new URL("public/favicon.svg", root), new URL("favicon.svg", docs));

console.log("GitHub Pages files generated in docs/.");
