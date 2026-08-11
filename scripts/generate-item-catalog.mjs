import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const API = "https://www.poewiki.net/w/api.php";
const OUTPUT = new URL("../app/data/items.ts", import.meta.url);
const USER_AGENT = "VaalOdds/1.0 (free Path of Exile fan tool; item catalog sync)";

const CLASS_TO_BASE = {
  Helmet: "helmet",
  "Body Armour": "body_armour",
  Gloves: "gloves",
  Boots: "boots",
  Shield: "shield",
  Amulet: "amulet",
  Ring: "ring",
  Belt: "belt",
  Quiver: "quiver",
  Wand: "wand",
  Sceptre: "sceptre",
  Claw: "claw",
  Dagger: "dagger",
  "Rune Dagger": "rune_dagger",
  "One Hand Sword": "sword",
  "Thrusting One Hand Sword": "rapier",
  "One Hand Axe": "axe",
  "One Hand Mace": "mace",
  Bow: "bow",
  Staff: "staff",
  Warstaff: "warstaff",
  "Two Hand Sword": "two_hand_sword",
  "Two Hand Axe": "two_hand_axe",
  "Two Hand Mace": "two_hand_mace",
  FishingRod: "fishing_rod",
};

function decodeHtml(value) {
  if (!value) return "";
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stableId(item) {
  return createHash("sha1")
    .update(`${item.classId}|${item.rarity}|${item.name}|${item.baseType}|${item.iconFile}`)
    .digest("hex")
    .slice(0, 12);
}

async function getJson(params) {
  const url = new URL(API);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`PoE Wiki request failed: ${response.status}`);
  return response.json();
}

const classNames = Object.keys(CLASS_TO_BASE);
const quotedClasses = classNames.map((name) => `"${name}"`).join(",");
const where = `is_in_game=1 AND rarity_id IN ("normal","unique") AND class_id IN (${quotedClasses})`;
const rows = [];

for (let offset = 0; ; offset += 500) {
  const response = await getJson({
    action: "cargoquery",
    format: "json",
    tables: "items",
    fields: "name,class_id,rarity_id,metadata_id,inventory_icon,base_item,drop_enabled",
    where,
    order_by: "class_id,rarity_id,name",
    limit: 500,
    offset,
  });
  const page = response.cargoquery ?? [];
  rows.push(...page.map((entry) => entry.title));
  if (page.length < 500) break;
}

const deduped = new Map();
for (const row of rows) {
  const classId = decodeHtml(row["class id"]);
  const name = decodeHtml(row.name);
  const rarity = row["rarity id"] === "unique" ? "unique" : "base";
  const iconFile = decodeHtml(row["inventory icon"]);
  const baseType = decodeHtml(row["base item"]) || name;
  if (!name || !iconFile || !CLASS_TO_BASE[classId]) continue;
  const key = `${classId}|${rarity}|${name}|${baseType}|${iconFile}`;
  deduped.set(key, {
    id: "",
    name,
    baseType,
    baseCategoryId: CLASS_TO_BASE[classId],
    classId,
    rarity,
    iconFile,
    imageUrl: "",
    wikiUrl: `https://www.poewiki.net/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`,
  });
}

const items = [...deduped.values()];
const iconFiles = [...new Set(items.map((item) => item.iconFile))];
const iconUrls = new Map();

for (let index = 0; index < iconFiles.length; index += 40) {
  const batch = iconFiles.slice(index, index + 40);
  const response = await getJson({
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: 160,
    titles: batch.join("|"),
  });
  for (const page of Object.values(response.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    if (info) iconUrls.set(page.title, info.thumburl || info.url);
  }
}

for (const item of items) {
  item.id = stableId(item);
  item.imageUrl = iconUrls.get(item.iconFile) ?? "";
}

items.sort((a, b) => {
  if (a.rarity !== b.rarity) return a.rarity === "base" ? -1 : 1;
  return a.name.localeCompare(b.name) || a.baseType.localeCompare(b.baseType);
});

const payload =
  `// Generated from the Path of Exile Wiki Cargo and MediaWiki APIs.\n` +
  `// Sync date: ${new Date().toISOString().slice(0, 10)}.\n` +
  `export type GameItem = {\n` +
  `  id: string;\n  name: string;\n  baseType: string;\n  baseCategoryId: string;\n` +
  `  classId: string;\n  rarity: "base" | "unique";\n  imageUrl: string;\n  wikiUrl: string;\n};\n\n` +
  `export const GAME_ITEMS: GameItem[] = ${JSON.stringify(items, (key, value) => key === "iconFile" ? undefined : value, 2)};\n`;

await mkdir(dirname(OUTPUT.pathname.slice(1)), { recursive: true });
await writeFile(OUTPUT, payload, "utf8");
console.log(`Generated ${items.length} equipment items with ${iconUrls.size} resolved icons.`);
