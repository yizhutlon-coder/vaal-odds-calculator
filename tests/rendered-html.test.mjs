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
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("GitHub Pages build contains the same simulator capabilities", async () => {
  const [html, app, data, component] = await Promise.all([
    readFile(new URL("../docs/index.html", import.meta.url), "utf8"),
    readFile(new URL("../docs/app.js", import.meta.url), "utf8"),
    readFile(new URL("../docs/data.js", import.meta.url), "utf8"),
    readFile(new URL("../app/CorruptionSimulator.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="simulator"/);
  assert.match(html, /id="item-search"/);
  assert.match(html, /SOCKET COLOR/);
  assert.match(html, /class="item-frame poe-tooltip unique"/);
  assert.match(html, />CORRUPTED</);
  assert.match(html, /id="socket-color-label"/);
  assert.match(html, /id="destroyed-gif"/);
  assert.match(html, /media1\.tenor\.com\/m\/M3YRIg48Te0AAAAC/);
  assert.ok(html.indexOf('id="sim-implicit-block"') < html.indexOf('id="sim-item-art"'));
  assert.match(app, /simulateCorruption/);
  assert.match(app, /rollModifierRanges/);
  assert.match(app, /simRolls/);
  assert.match(app, /simItem/);
  assert.match(component, /rolledMods/);
  assert.match(component, /Math\.min\(first, second\)/);
  assert.match(component, /rare-bricked/);
  assert.match(component, /result\?\.kind === "rare" \|\| result\?\.kind === "socket"\) && <p className="poe-corrupted">CORRUPTED/);
  assert.match(component, /result\?\.kind === "rare" \? selectedItem\.baseType : selectedItem\.name/);
  assert.match(component, /className="socket-color-label">Socket Color/);
  assert.match(component, /result\.kind !== "rare"/);
  assert.match(component, /className="destroyed-gif"/);
  assert.match(data, /window\.GAME_ITEMS/);
  assert.match(data, /Shavronne's Wrappings/);
});
