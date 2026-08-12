"use client";
/* eslint-disable @next/next/no-img-element -- wiki thumbnails are remote catalog data shared with the static GitHub Pages build */

import { useEffect, useMemo, useState } from "react";
import { CORRUPTION_MODS, type CorruptionMod } from "./data/corruption-mods";
import { GAME_ITEMS, type GameItem } from "./data/items";

const DESTROYED_GIF_URL = "https://media1.tenor.com/m/M3YRIg48Te0AAAAC/%E3%81%A1%E3%81%84%E3%81%8B%E3%82%8F-%E3%83%8F%E3%83%81%E3%83%AF%E3%83%AC.gif";
const DESTROYED_GIF_PAGE = "https://tenor.com/view/%E3%81%A1%E3%81%84%E3%81%8B%E3%82%8F-%E3%83%8F%E3%83%81%E3%83%AF%E3%83%AC-gif-26619000";

type BaseCategory = { id: string; tags: string[] };
type CorruptionMethod = "vaal" | "locus";
type ItemFilter = "all" | "base" | "unique";
type OutcomeKind = "implicit" | "socket" | "rare" | "nothing" | "destroyed";
type RitualKey = "toucan" | "kuduku" | "chris";
type ImplicitHistoryEntry = { key: string; result: SimulationResult; count: number };

const RITUALS: { key: RitualKey; label: string }[] = [
  { key: "toucan", label: "Praise Toucan" },
  { key: "kuduku", label: "Praise Kuduku" },
  { key: "chris", label: "Pray to Chris" },
];
const OUTCOME_LABELS: { key: OutcomeKind; label: string }[] = [
  { key: "implicit", label: "Implicit" },
  { key: "socket", label: "Socket Color" },
  { key: "rare", label: "Krangled" },
  { key: "nothing", label: "No Change" },
  { key: "destroyed", label: "Destroyed" },
];

function emptyOutcomeCounts(): Record<OutcomeKind, number> {
  return { implicit: 0, socket: 0, rare: 0, nothing: 0, destroyed: 0 };
}

type SimulationResult = {
  kind: OutcomeKind;
  title: string;
  detail: string;
  mods: CorruptionMod[];
  rolledMods: string[];
};

type Props = {
  method: CorruptionMethod;
  onMethodChange: (method: CorruptionMethod) => void;
  bases: BaseCategory[];
};

function weightFor(mod: CorruptionMod, base: BaseCategory) {
  for (const spawn of mod.spawnWeights) {
    if (base.tags.includes(spawn.tag)) return spawn.weight;
  }
  return 0;
}

function weightedPick(pool: CorruptionMod[], base: BaseCategory) {
  const total = pool.reduce((sum, mod) => sum + weightFor(mod, base), 0);
  if (!total) return null;
  let roll = Math.random() * total;
  for (const mod of pool) {
    roll -= weightFor(mod, base);
    if (roll < 0) return mod;
  }
  return pool.at(-1) ?? null;
}

export function rollModifierRanges(stat: string, random = Math.random) {
  return stat.replace(/\((-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\)/g, (_match, firstText: string, secondText: string) => {
    const first = Number(firstText);
    const second = Number(secondText);
    const minimum = Math.min(first, second);
    const maximum = Math.max(first, second);
    const decimalPlaces = Math.max(firstText.split(".")[1]?.length ?? 0, secondText.split(".")[1]?.length ?? 0);
    const scale = 10 ** decimalPlaces;
    const scaledMinimum = Math.round(minimum * scale);
    const scaledMaximum = Math.round(maximum * scale);
    const rolled = scaledMinimum + Math.floor(random() * (scaledMaximum - scaledMinimum + 1));
    return (rolled / scale).toFixed(decimalPlaces);
  });
}

function simulate(method: CorruptionMethod, pool: CorruptionMod[], base: BaseCategory): SimulationResult {
  const branch = Math.floor(Math.random() * 4);
  if (branch === 0) {
    const first = weightedPick(pool, base);
    if (!first) return { kind: "implicit", title: "NO ELIGIBLE IMPLICIT", detail: "Raise the item level and try again.", mods: [], rolledMods: [] };
    if (method === "vaal") {
      const rolledMods = [rollModifierRanges(first.stat)];
      return { kind: "implicit", title: "CORRUPTED IMPLICIT", detail: rolledMods[0], mods: [first], rolledMods };
    }
    const secondPool = pool.filter((mod) => mod.group !== first.group);
    const second = weightedPick(secondPool, base);
    const mods = second ? [first, second] : [first];
    const rolledMods = mods.map((mod) => rollModifierRanges(mod.stat));
    return {
      kind: "implicit",
      title: "DOUBLE CORRUPTION",
      detail: rolledMods.join(" + "),
      mods,
      rolledMods,
    };
  }
  if (branch === 1) return { kind: "socket", title: "SOCKET COLOR", detail: "The socket-color outcome was selected.", mods: [], rolledMods: [] };
  if (branch === 2) return { kind: "rare", title: "RARE BRICK", detail: "The item became a rare of the same base type.", mods: [], rolledMods: [] };
  if (method === "locus") return { kind: "destroyed", title: "DESTROYED", detail: "The temple claimed the item.", mods: [], rolledMods: [] };
  return { kind: "nothing", title: "NO CHANGE", detail: "Corrupted, but otherwise unchanged.", mods: [], rolledMods: [] };
}

export default function CorruptionSimulator({ method, onMethodChange, bases }: Props) {
  const defaultItem = GAME_ITEMS.find((item) => item.name === "Shavronne's Wrappings") ?? GAME_ITEMS.find((item) => item.rarity === "unique") ?? GAME_ITEMS[0];
  const [selectedItem, setSelectedItem] = useState<GameItem>(defaultItem);
  const [query, setQuery] = useState(defaultItem.name);
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [itemLevel, setItemLevel] = useState(86);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [revealKey, setRevealKey] = useState(0);
  const [shareStatus, setShareStatus] = useState("");
  const [ritualCounts, setRitualCounts] = useState<Record<RitualKey, number>>({ toucan: 0, kuduku: 0, chris: 0 });
  const [ritualAvailable, setRitualAvailable] = useState(false);
  const [chosenRitual, setChosenRitual] = useState<RitualKey | null>(null);
  const [unluckyStreak, setUnluckyStreak] = useState(0);
  const [outcomeCounts, setOutcomeCounts] = useState<Record<OutcomeKind, number>>(emptyOutcomeCounts);
  const [implicitHistory, setImplicitHistory] = useState<ImplicitHistoryEntry[]>([]);

  useEffect(() => {
    const loadSharedResult = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const sharedItem = GAME_ITEMS.find((item) => item.id === params.get("simItem"));
      const sharedLevel = Number(params.get("simIlvl"));
      const sharedAttempts = Number(params.get("simAttempts"));
      const sharedMethod = params.get("simMethod");
      const kind = params.get("simOutcome") as OutcomeKind | null;
      const title = params.get("simTitle");
      const detail = params.get("simDetail");
      let rolledMods: string[] = [];
      try {
        const parsed = JSON.parse(params.get("simRolls") ?? "[]");
        if (Array.isArray(parsed)) rolledMods = parsed.filter((value): value is string => typeof value === "string");
      } catch {
        rolledMods = [];
      }
      if (sharedItem) {
        setSelectedItem(sharedItem);
        setQuery(sharedItem.name);
      }
      if (Number.isFinite(sharedLevel) && sharedLevel >= 1 && sharedLevel <= 100) setItemLevel(sharedLevel);
      if (Number.isFinite(sharedAttempts) && sharedAttempts > 0) setAttempts(sharedAttempts);
      if (sharedMethod === "vaal" || sharedMethod === "locus") onMethodChange(sharedMethod);
      if (kind && title && detail) setResult({ kind, title, detail, mods: [], rolledMods: rolledMods.length ? rolledMods : kind === "implicit" ? [detail] : [] });
    }, 0);
    return () => window.clearTimeout(loadSharedResult);
  }, [onMethodChange]);

  const searchResults = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return [];
    return GAME_ITEMS
      .filter((item) => filter === "all" || item.rarity === filter)
      .filter((item) => `${item.name} ${item.baseType} ${item.classId}`.toLocaleLowerCase().includes(needle))
      .sort((a, b) => {
        const aName = a.name.toLocaleLowerCase();
        const bName = b.name.toLocaleLowerCase();
        const aRank = aName === needle ? 0 : aName.startsWith(needle) ? 1 : 2;
        const bRank = bName === needle ? 0 : bName.startsWith(needle) ? 1 : 2;
        return aRank - bRank || (a.rarity === b.rarity ? a.name.localeCompare(b.name) : a.rarity === "unique" ? -1 : 1);
      })
      .slice(0, 12);
  }, [filter, query]);

  const base = bases.find((entry) => entry.id === selectedItem.baseCategoryId) ?? bases[0];
  const eligiblePool = CORRUPTION_MODS.filter((mod) => mod.level <= itemLevel && weightFor(mod, base) > 0);
  const showResults = query.trim() !== selectedItem.name && searchResults.length > 0;

  function chooseItem(item: GameItem) {
    setSelectedItem(item);
    setQuery(item.name);
    setAttempts(0);
    setResult(null);
    setShareStatus("");
    setRitualCounts({ toucan: 0, kuduku: 0, chris: 0 });
    setRitualAvailable(false);
    setChosenRitual(null);
    setUnluckyStreak(0);
    setOutcomeCounts(emptyOutcomeCounts());
    setImplicitHistory([]);
  }

  function corrupt() {
    const nextResult = simulate(method, eligiblePool, base);
    setResult(nextResult);
    setAttempts((value) => value + 1);
    setRevealKey((value) => value + 1);
    setShareStatus("");
    setRitualAvailable(true);
    setChosenRitual(null);
    setUnluckyStreak((value) => nextResult.kind === "implicit" ? 0 : value + 1);
    setOutcomeCounts((counts) => ({ ...counts, [nextResult.kind]: counts[nextResult.kind] + 1 }));
    if (nextResult.kind === "implicit" && nextResult.rolledMods.length) {
      const key = nextResult.rolledMods.join(" | ");
      setImplicitHistory((history) => {
        const existing = history.find((entry) => entry.key === key);
        return existing
          ? history.map((entry) => entry.key === key ? { ...entry, count: entry.count + 1, result: nextResult } : entry)
          : [{ key, result: nextResult, count: 1 }, ...history];
      });
    }
  }

  function performRitual(key: RitualKey) {
    if (!ritualAvailable) return;
    setRitualCounts((counts) => ({ ...counts, [key]: counts[key] + 1 }));
    setRitualAvailable(false);
    setChosenRitual(key);
  }

  function reset() {
    setAttempts(0);
    setResult(null);
    setShareStatus("");
    setRitualCounts({ toucan: 0, kuduku: 0, chris: 0 });
    setRitualAvailable(false);
    setChosenRitual(null);
    setUnluckyStreak(0);
    setOutcomeCounts(emptyOutcomeCounts());
    setImplicitHistory([]);
  }

  async function share() {
    if (!result) return;
    const url = new URL(window.location.href);
    url.hash = "simulator";
    url.searchParams.set("simItem", selectedItem.id);
    url.searchParams.set("simIlvl", String(itemLevel));
    url.searchParams.set("simMethod", method);
    url.searchParams.set("simAttempts", String(attempts));
    url.searchParams.set("simOutcome", result.kind);
    url.searchParams.set("simTitle", result.title);
    url.searchParams.set("simDetail", result.detail);
    url.searchParams.set("simRolls", JSON.stringify(result.rolledMods));
    try {
      await navigator.clipboard.writeText(url.toString());
      setShareStatus("Luck link copied");
    } catch {
      setShareStatus("Copy the page URL to share this result");
      window.history.replaceState({}, "", url);
    }
  }

  return (
    <section className="simulator-shell" id="simulator" aria-label="Corruption simulator">
      <div className="simulator-controls">
        <div className="section-kicker"><span>01</span> Tempt fate</div>
        <h2>Corrupt it yourself.</h2>
        <p className="simulator-intro">Choose a real equipment base or unique, set its item level, then take the gamble.</p>

        <div className="method-toggle simulator-method" role="radiogroup" aria-label="Simulator corruption method">
          <button type="button" role="radio" aria-checked={method === "vaal"} className={method === "vaal" ? "active" : ""} onClick={() => onMethodChange("vaal")}>
            <span>Vaal Orb</span><small>Four equal branches</small>
          </button>
          <button type="button" role="radio" aria-checked={method === "locus"} className={method === "locus" ? "active" : ""} onClick={() => onMethodChange("locus")}>
            <span>Locus Altar</span><small>Risk total destruction</small>
          </button>
        </div>

        <label className="field-label" htmlFor="item-search">Find an item</label>
        <div className="item-search-wrap">
          <input id="item-search" type="search" value={query} placeholder="Try Headhunter, Astral Plate…" autoComplete="off" onChange={(event) => setQuery(event.target.value)} />
          <span aria-hidden="true">⌕</span>
          {showResults && (
            <div className="item-search-results" role="listbox" aria-label="Matching equipment">
              {searchResults.map((item) => (
                <button type="button" role="option" aria-selected={item.id === selectedItem.id} key={item.id} onClick={() => chooseItem(item)}>
                  <span className={`mini-item-art ${item.rarity}`}>
                    {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <b>V</b>}
                  </span>
                  <span><strong>{item.name}</strong><small>{item.rarity === "unique" ? `${item.baseType} · Unique` : `${item.classId} · Base`}</small></span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="item-filter" aria-label="Item type filter">
          {(["all", "base", "unique"] as const).map((value) => (
            <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "All items" : value === "base" ? "Bases" : "Uniques"}</button>
          ))}
        </div>

        <div className="level-row simulator-level">
          <label className="field-label" htmlFor="sim-level">Item level</label>
          <output htmlFor="sim-level">{itemLevel}</output>
        </div>
        <input id="sim-level" className="level-range" type="range" min="1" max="100" value={itemLevel} style={{ "--level": `${itemLevel}%` } as React.CSSProperties} onChange={(event) => setItemLevel(Number(event.target.value))} />
        <div className="range-labels"><span>1</span><span>100</span></div>

        <div className="simulator-actions">
          <button type="button" className="corrupt-button" onClick={corrupt}>{method === "locus" ? "OFFER TO THE LOCUS" : "USE VAAL ORB"}</button>
          <button type="button" className="reset-button" onClick={reset}>Reset run</button>
        </div>
        <div className="ritual-panel" aria-label="Pre-corruption rituals">
          <div className="ritual-heading"><span>RITUALS</span><small>{ritualAvailable ? "Choose one for this attempt" : chosenRitual ? "Ritual recorded" : "Corrupt once to earn a ritual"}</small></div>
          <div className="ritual-actions">
            {RITUALS.map((ritual) => (
              <button type="button" key={ritual.key} className={chosenRitual === ritual.key ? "chosen" : ""} disabled={!ritualAvailable} onClick={() => performRitual(ritual.key)}>
                <span>{ritual.label}</span><strong>{ritualCounts[ritual.key].toLocaleString()}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="simulator-stage">
        <div className="stage-topline"><span>ATTEMPTS</span><strong>{attempts.toLocaleString()}</strong></div>
        <div className={`item-display ${result?.kind ?? ""}`}>
          <div className={`item-frame poe-tooltip ${selectedItem.rarity} ${result?.kind === "rare" ? "rare-bricked" : ""} ${result?.kind === "destroyed" ? "destroyed-hidden" : ""} ${result?.kind === "implicit" || result?.kind === "nothing" || result?.kind === "rare" || result?.kind === "socket" ? "item-revealed" : ""}`} key={`${selectedItem.id}-${revealKey}`}>
            <div className="poe-nameplate">
              <h3>{result?.kind === "rare" ? selectedItem.baseType : selectedItem.name}</h3>
              {selectedItem.rarity === "unique" && result?.kind !== "rare" && <strong>{selectedItem.baseType}</strong>}
            </div>
            <div className="poe-tooltip-body">
              {result?.rolledMods.length ? (
                <div className="poe-implicit-block">
                  {result.rolledMods.map((rolledMod, index) => <p className="poe-implicit" key={`${rolledMod}-${index}`}>{rolledMod}</p>)}
                  <div className="poe-separator" aria-hidden="true" />
                </div>
              ) : null}
              <div className="poe-art-area">
                {selectedItem.imageUrl && <img className="poe-item-art" src={selectedItem.imageUrl} alt="" aria-hidden="true" />}
                {result?.kind === "socket" && <div className="socket-color-label">Socket Color</div>}
              </div>
              <div className="poe-property poe-class">{selectedItem.classId}</div>
              <div className="poe-property"><span>Item Level:</span> <b>{itemLevel}</b></div>
              <div className="poe-separator" aria-hidden="true" />
              {(result?.kind === "implicit" || result?.kind === "nothing" || result?.kind === "rare" || result?.kind === "socket") && <p className="poe-corrupted">{result.kind === "rare" ? "KRANGLED" : "CORRUPTED"}</p>}
            </div>
          </div>

          {result?.kind === "destroyed" && (
            <a className="destroyed-gif" href={DESTROYED_GIF_PAGE} target="_blank" rel="noreferrer" aria-label="Open the destroyed-item animation on Tenor">
              <img src={DESTROYED_GIF_URL} alt="Cartoon reaction to the item being destroyed" />
            </a>
          )}

        </div>

        {unluckyStreak >= 10 && (
          <div className="unlucky-reaction" role="status">
            <img src="/chris-unlucky.png" alt="Chris Wilson watching over an unlucky corruption streak" />
            <div><span>THE VISION ENDURES</span><strong>Long unlucky streak</strong><p>{unluckyStreak} attempts without an implicit.</p></div>
          </div>
        )}

        {result && result.kind !== "implicit" && result.kind !== "nothing" && result.kind !== "socket" && result.kind !== "rare" && (
          <div className={`result-overlay ${result.kind}`} key={revealKey}>
            <span>{result.kind === "destroyed" ? "✕" : "VAAL RESULT"}</span>
            <strong>{result.title}</strong>
            <p>{result.detail}</p>
          </div>
        )}

        <div className="run-ledger" aria-label="Outcomes this run">
          <div className="run-ledger-heading"><span>THIS RUN</span><strong>{attempts.toLocaleString()} attempts</strong></div>
          <div className="outcome-counts">
            {OUTCOME_LABELS.map((outcome) => <div key={outcome.key}><span>{outcome.label}</span><strong>{outcomeCounts[outcome.key].toLocaleString()}</strong></div>)}
          </div>
          <div className="implicit-history">
            <div className="implicit-history-heading"><span>IMPLICIT ROLLS</span><small>Click one to view</small></div>
            {implicitHistory.length ? (
              <div className="implicit-history-list">
                {implicitHistory.map((entry) => (
                  <button type="button" key={entry.key} onClick={() => { setResult(entry.result); setRevealKey((value) => value + 1); }}>
                    <span>{entry.result.rolledMods.join(" + ")}</span>
                    <strong>{attempts ? ((entry.count / attempts) * 100).toFixed(1) : "0.0"}%</strong>
                    <small>×{entry.count}</small>
                  </button>
                ))}
              </div>
            ) : <p>No implicit outcomes yet.</p>}
          </div>
        </div>

        <div className="simulator-readout">
          <div><span>Eligible implicits</span><strong>{eligiblePool.length}</strong></div>
          <div><span>Catalog</span><strong>{GAME_ITEMS.length.toLocaleString()} items</strong></div>
        </div>

        <div className="share-row">
          <button type="button" disabled={!result} onClick={share}>Copy luck link</button>
          <span aria-live="polite">{shareStatus || "Share the item, outcome, and attempt count."}</span>
        </div>
        <p className="simulator-note">The socket branch is intentionally shown only as “Socket Color” for the current league. Rare-item affixes are not generated.</p>
      </div>
    </section>
  );
}
