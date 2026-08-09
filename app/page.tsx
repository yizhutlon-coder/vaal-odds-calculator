"use client";

import { useMemo, useState } from "react";
import { CORRUPTION_MODS, type CorruptionMod } from "./data/corruption-mods";

type BaseCategory = {
  id: string;
  label: string;
  family: "Armour" | "Jewellery" | "One-handed weapons" | "Two-handed weapons" | "Other";
  tags: string[];
};

const BASES: BaseCategory[] = [
  { id: "helmet", label: "Helmet", family: "Armour", tags: ["helmet", "armour"] },
  { id: "body_armour", label: "Body Armour", family: "Armour", tags: ["body_armour", "armour"] },
  { id: "gloves", label: "Gloves", family: "Armour", tags: ["gloves", "armour"] },
  { id: "boots", label: "Boots", family: "Armour", tags: ["boots", "armour"] },
  { id: "shield", label: "Shield", family: "Armour", tags: ["shield", "armour"] },
  { id: "amulet", label: "Amulet", family: "Jewellery", tags: ["amulet"] },
  { id: "ring", label: "Ring", family: "Jewellery", tags: ["ring"] },
  { id: "belt", label: "Belt", family: "Jewellery", tags: ["belt"] },
  { id: "quiver", label: "Quiver", family: "Jewellery", tags: ["quiver"] },
  { id: "wand", label: "Wand", family: "One-handed weapons", tags: ["wand", "one_hand_weapon", "weapon"] },
  { id: "sceptre", label: "Sceptre", family: "One-handed weapons", tags: ["sceptre", "one_hand_weapon", "weapon"] },
  { id: "claw", label: "Claw", family: "One-handed weapons", tags: ["claw", "one_hand_weapon", "weapon"] },
  { id: "dagger", label: "Dagger", family: "One-handed weapons", tags: ["attack_dagger", "dagger", "one_hand_weapon", "weapon"] },
  { id: "rune_dagger", label: "Rune Dagger", family: "One-handed weapons", tags: ["dagger", "one_hand_weapon", "weapon"] },
  { id: "sword", label: "One-Handed Sword", family: "One-handed weapons", tags: ["sword", "one_hand_weapon", "weapon"] },
  { id: "rapier", label: "Thrusting One-Handed Sword", family: "One-handed weapons", tags: ["rapier", "sword", "one_hand_weapon", "weapon"] },
  { id: "axe", label: "One-Handed Axe", family: "One-handed weapons", tags: ["axe", "one_hand_weapon", "weapon"] },
  { id: "mace", label: "One-Handed Mace", family: "One-handed weapons", tags: ["mace", "one_hand_weapon", "weapon"] },
  { id: "bow", label: "Bow", family: "Two-handed weapons", tags: ["bow", "two_hand_weapon", "weapon"] },
  { id: "staff", label: "Staff", family: "Two-handed weapons", tags: ["staff", "two_hand_weapon", "weapon"] },
  { id: "warstaff", label: "Warstaff", family: "Two-handed weapons", tags: ["warstaff", "staff", "two_hand_weapon", "weapon"] },
  { id: "two_hand_sword", label: "Two-Handed Sword", family: "Two-handed weapons", tags: ["sword", "two_hand_weapon", "weapon"] },
  { id: "two_hand_axe", label: "Two-Handed Axe", family: "Two-handed weapons", tags: ["axe", "two_hand_weapon", "weapon"] },
  { id: "two_hand_mace", label: "Two-Handed Mace", family: "Two-handed weapons", tags: ["mace", "two_hand_weapon", "weapon"] },
  { id: "fishing_rod", label: "Fishing Rod", family: "Other", tags: ["fishing_rod", "weapon"] },
];

const FAMILIES = ["Armour", "Jewellery", "One-handed weapons", "Two-handed weapons", "Other"] as const;
const IMPLICIT_OUTCOME_CHANCE = 0.25;

function weightFor(mod: CorruptionMod, base: BaseCategory) {
  for (const spawn of mod.spawnWeights) {
    if (base.tags.includes(spawn.tag)) return spawn.weight;
  }
  return 0;
}

function percent(value: number, digits = 3) {
  if (value === 0) return "0%";
  if (value < 0.0001) return `${(value * 100).toFixed(5)}%`;
  return `${(value * 100).toFixed(digits)}%`;
}

function oneIn(value: number) {
  if (value <= 0) return "—";
  const denominator = 1 / value;
  return denominator < 100 ? `1 in ${denominator.toFixed(1)}` : `1 in ${Math.round(denominator).toLocaleString()}`;
}

function attemptsFor(probability: number, confidence: number) {
  if (probability <= 0) return null;
  return Math.ceil(Math.log(1 - confidence) / Math.log(1 - probability));
}

export default function Home() {
  const [baseId, setBaseId] = useState("ring");
  const [itemLevel, setItemLevel] = useState(86);
  const base = BASES.find((entry) => entry.id === baseId) ?? BASES[6];

  const compatibleMods = useMemo(
    () => CORRUPTION_MODS.filter((mod) => weightFor(mod, base) > 0),
    [base],
  );

  const preferredDefault =
    compatibleMods.find((mod) => mod.id === "V2MaxPowerChargesCorrupted") ?? compatibleMods[0];
  const [selectedId, setSelectedId] = useState(preferredDefault?.id ?? "");
  const selected = compatibleMods.find((mod) => mod.id === selectedId) ?? preferredDefault;

  const eligiblePool = useMemo(
    () => compatibleMods.filter((mod) => mod.level <= itemLevel),
    [compatibleMods, itemLevel],
  );

  const poolWeight = eligiblePool.reduce((sum, mod) => sum + weightFor(mod, base), 0);
  const targetEligible = Boolean(selected && selected.level <= itemLevel);
  const targetWeight = targetEligible && selected ? weightFor(selected, base) : 0;
  const conditionalChance = poolWeight ? targetWeight / poolWeight : 0;
  const perOrbChance = conditionalChance * IMPLICIT_OUTCOME_CHANCE;
  const average = perOrbChance ? Math.ceil(1 / perOrbChance) : null;
  const median = attemptsFor(perOrbChance, 0.5);
  const ninety = attemptsFor(perOrbChance, 0.9);

  function changeBase(nextId: string) {
    const nextBase = BASES.find((entry) => entry.id === nextId) ?? BASES[0];
    const nextMods = CORRUPTION_MODS.filter((mod) => weightFor(mod, nextBase) > 0);
    setBaseId(nextId);
    setSelectedId(nextMods[0]?.id ?? "");
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Vaal Odds home">
          <span className="brand-mark" aria-hidden="true">V</span>
          <span>VAAL ODDS</span>
        </a>
        <div className="dataset-pill"><span /> PoE 1 · Equipment</div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow">CORRUPTION CALCULATOR</div>
        <h1>What are you<br />willing to <em>lose?</em></h1>
        <p>
          Pick a base class, item level, and desired corrupted implicit. We’ll weigh every
          eligible result, then factor in the Vaal Orb’s 1-in-4 implicit outcome.
        </p>
      </section>

      <section className="calculator-shell" aria-label="Corruption chance calculator">
        <div className="rune rune-one" aria-hidden="true" />
        <div className="rune rune-two" aria-hidden="true" />

        <div className="inputs-panel">
          <div className="section-kicker"><span>01</span> Choose the sacrifice</div>

          <label className="field-label" htmlFor="base-select">Item base class</label>
          <div className="select-wrap">
            <select id="base-select" value={baseId} onChange={(event) => changeBase(event.target.value)}>
              {FAMILIES.map((family) => (
                <optgroup label={family} key={family}>
                  {BASES.filter((entry) => entry.family === family).map((entry) => (
                    <option value={entry.id} key={entry.id}>{entry.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <p className="field-hint">Named bases share the pool of their class.</p>

          <div className="level-row">
            <label className="field-label" htmlFor="level-input">Item level</label>
            <input
              id="level-input"
              className="level-number"
              type="number"
              min="1"
              max="100"
              value={itemLevel}
              onChange={(event) => setItemLevel(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
            />
          </div>
          <input
            className="level-range"
            aria-label="Item level slider"
            type="range"
            min="1"
            max="100"
            value={itemLevel}
            style={{ "--level": `${itemLevel}%` } as React.CSSProperties}
            onChange={(event) => setItemLevel(Number(event.target.value))}
          />
          <div className="range-labels"><span>1</span><span>100</span></div>

          <label className="field-label corruption-label" htmlFor="corruption-select">Desired corruption</label>
          <div className="select-wrap select-wrap-tall">
            <select
              id="corruption-select"
              value={selected?.id ?? ""}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {compatibleMods
                .slice()
                .sort((a, b) => a.level - b.level || a.stat.localeCompare(b.stat))
                .map((mod) => (
                  <option value={mod.id} key={mod.id}>
                    {mod.stat} {mod.level > itemLevel ? `— needs ilvl ${mod.level}` : ""}
                  </option>
                ))}
            </select>
          </div>

          {selected && (
            <div className={`target-card ${targetEligible ? "" : "target-locked"}`}>
              <div className="target-orb" aria-hidden="true">◈</div>
              <div>
                <span>{targetEligible ? "TARGET IS IN THE POOL" : "TARGET IS LOCKED"}</span>
                <strong>{selected.stat}</strong>
                <small>Requires item level {selected.level} · weight {weightFor(selected, base).toLocaleString()}</small>
              </div>
            </div>
          )}
        </div>

        <div className="results-panel" aria-live="polite">
          <div className="section-kicker light"><span>02</span> Read the omen</div>

          <div className="odds-label">CHANCE PER VAAL ORB</div>
          <div className={`big-odds ${perOrbChance ? "" : "zero-odds"}`}>{oneIn(perOrbChance)}</div>
          <div className="big-percent">{percent(perOrbChance)} exact chance</div>

          {!targetEligible && selected && (
            <div className="level-warning">
              Raise the item to level {selected.level} or choose another corruption.
            </div>
          )}

          <div className="formula" aria-label="Chance calculation">
            <div>
              <span>Implicit outcome</span>
              <strong>25%</strong>
            </div>
            <b>×</b>
            <div>
              <span>Target in pool</span>
              <strong>{percent(conditionalChance, 2)}</strong>
            </div>
            <b>=</b>
            <div className="formula-result">
              <span>Per orb</span>
              <strong>{percent(perOrbChance, 3)}</strong>
            </div>
          </div>

          <div className="outcome-track" aria-label="Vaal Orb outcome model">
            <div className="outcome-hit">IMPLICIT <span>25%</span></div>
            <div>OTHER VAAL OUTCOMES <span>75%</span></div>
          </div>

          <div className="attempts-grid">
            <div><span>Average</span><strong>{average?.toLocaleString() ?? "—"}</strong><small>orbs</small></div>
            <div><span>50% chance by</span><strong>{median?.toLocaleString() ?? "—"}</strong><small>orbs</small></div>
            <div><span>90% chance by</span><strong>{ninety?.toLocaleString() ?? "—"}</strong><small>orbs</small></div>
          </div>

          <div className="pool-readout">
            <div>
              <span>Eligible implicits</span>
              <strong>{eligiblePool.length}</strong>
            </div>
            <div>
              <span>Total pool weight</span>
              <strong>{poolWeight.toLocaleString()}</strong>
            </div>
            <div>
              <span>Target weight</span>
              <strong>{targetWeight.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="method-section">
        <div className="method-copy">
          <div className="section-kicker"><span>03</span> Know the ritual</div>
          <h2>Weighted, not evenly split.</h2>
          <p>
            First, item level removes locked implicits. Then the base’s first matching tag
            supplies each modifier’s weight; a zero-weight match excludes it. Your target’s
            weight is divided by the full eligible pool, then multiplied by 25%.
          </p>
        </div>
        <div className="method-note">
          <span>Important</span>
          <p>“1 in X” is a long-run average, not a guarantee. Every orb is an independent roll.</p>
        </div>
      </section>

      <footer>
        <div>
          <strong>VAAL ODDS</strong>
          <span>238 supplied equipment corruption rows · reviewed 9 Aug 2026</span>
        </div>
        <nav aria-label="Research sources">
          <a href="https://www.poewiki.net/wiki/Corrupted" target="_blank" rel="noreferrer">Corruption mechanics ↗</a>
          <a href="https://www.poewiki.net/wiki/Modifier" target="_blank" rel="noreferrer">Weighting rules ↗</a>
          <a href="https://www.poewiki.net/wiki/List_of_item_corruption_implicit_modifiers" target="_blank" rel="noreferrer">Modifier list ↗</a>
        </nav>
      </footer>
    </main>
  );
}
