import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the calculator and simulator", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Vaal Odds — PoE Corruption Calculator<\/title>/i);
  assert.match(html, /What are you/);
  assert.match(html, /Corrupt it yourself\./);
  assert.match(html, /Find an item/);
  assert.match(html, /Socket Color/i);
  assert.match(html, /Copy luck link/i);
  assert.match(html, /Praise Toucan/i);
  assert.match(html, /Praise Kuduku/i);
  assert.match(html, /Pray to Chris/i);
  assert.match(html, /Community rituals/i);
  assert.match(html, /Who has the luck/i);
  assert.match(html, /Outcomes this run/i);
  assert.ok(html.indexOf('aria-label="Corruption simulator"') < html.indexOf('aria-label="Corruption chance calculator"'));
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("GitHub Pages build contains the same simulator capabilities", async () => {
  const [html, app, data, component, unluckyImage] = await Promise.all([
    readFile(new URL("../docs/index.html", import.meta.url), "utf8"),
    readFile(new URL("../docs/app.js", import.meta.url), "utf8"),
    readFile(new URL("../docs/data.js", import.meta.url), "utf8"),
    readFile(new URL("../app/CorruptionSimulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../docs/chris-unlucky.png", import.meta.url)),
  ]);

  assert.match(html, /id="simulator"/);
  assert.match(html, /id="item-search"/);
  assert.match(html, /SOCKET COLOR/);
  assert.match(html, /class="item-frame poe-tooltip unique"/);
  assert.match(html, />CORRUPTED</);
  assert.match(html, /id="socket-color-label"/);
  assert.match(html, /id="destroyed-gif"/);
  assert.match(html, /id="unlucky-reaction"/);
  assert.match(html, /data-ritual="toucan"/);
  assert.match(html, /id="community-choices-toucan"/);
  assert.match(html, /id="ritual-rate-toucan"/);
  assert.match(html, /id="implicit-history-list"/);
  assert.match(html, /media1\.tenor\.com\/m\/M3YRIg48Te0AAAAC/);
  assert.ok(html.indexOf('id="sim-implicit-block"') < html.indexOf('id="sim-item-art"'));
  assert.match(app, /simulateCorruption/);
  assert.match(app, /rollModifierRanges/);
  assert.match(app, /simRolls/);
  assert.match(app, /simItem/);
  assert.match(app, /calculatorShell\.before\(simulatorShell\)/);
  assert.match(app, /pendingRitual/);
  assert.match(app, /ritualSucceeded/);
  assert.match(app, /recordCommunityRitual/);
  assert.match(app, /outcomeCounts/);
  assert.match(component, /rolledMods/);
  assert.match(component, /Math\.min\(first, second\)/);
  assert.match(component, /rare-bricked/);
  assert.match(component, /result\.kind === "rare" \? "KRANGLED" : "CORRUPTED"/);
  assert.match(component, /result\?\.kind === "rare" \? selectedItem\.baseType : selectedItem\.name/);
  assert.match(component, /className="socket-color-label">Socket Color/);
  assert.match(component, /result\.kind !== "rare"/);
  assert.match(component, /className="destroyed-gif"/);
  assert.match(component, /Long unlucky streak/);
  assert.match(component, /KRANGLED/);
  assert.match(component, /ritualSuccessRate/);
  assert.match(component, /api\/ritual-stats/);
  assert.match(component, /entry\.count \/ attempts/);
  assert.ok(unluckyImage.length > 1000);
  assert.match(data, /window\.GAME_ITEMS/);
  assert.match(data, /Shavronne's Wrappings/);
});

test("community ritual totals use anonymous aggregate persistence", async () => {
  const [route, schema, migration, hosting] = await Promise.all([
    readFile(new URL("../app/api/ritual-stats/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_windy_carnage.sql", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(route, /onConflictDoUpdate/);
  assert.match(route, /Access-Control-Allow-Origin/);
  assert.match(route, /choices.*\+ 1/s);
  assert.match(schema, /ritual_stats/);
  assert.match(migration, /CREATE TABLE `ritual_stats`/);
  assert.equal(JSON.parse(hosting).d1, "DB");
});
