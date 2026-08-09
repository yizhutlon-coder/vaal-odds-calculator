const BASES = [
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

const FAMILIES = ["Armour", "Jewellery", "One-handed weapons", "Two-handed weapons", "Other"];
const state = { baseId: "ring", itemLevel: 86, selectedId: "V2MaxPowerChargesCorrupted" };
const $ = (id) => document.getElementById(id);

function weightFor(mod, base) {
  for (const spawn of mod.spawnWeights) if (base.tags.includes(spawn.tag)) return spawn.weight;
  return 0;
}

function percent(value, digits = 3) {
  if (value === 0) return "0%";
  if (value < 0.0001) return `${(value * 100).toFixed(5)}%`;
  return `${(value * 100).toFixed(digits)}%`;
}

function oneIn(value) {
  if (value <= 0) return "—";
  const denominator = 1 / value;
  return denominator < 100 ? `1 in ${denominator.toFixed(1)}` : `1 in ${Math.round(denominator).toLocaleString()}`;
}

function attemptsFor(probability, confidence) {
  if (probability <= 0) return null;
  return Math.ceil(Math.log(1 - confidence) / Math.log(1 - probability));
}

function compatibleMods(base) {
  return window.CORRUPTION_MODS.filter((mod) => weightFor(mod, base) > 0);
}

function fillBaseSelect() {
  const select = $("base-select");
  for (const family of FAMILIES) {
    const group = document.createElement("optgroup");
    group.label = family;
    for (const base of BASES.filter((entry) => entry.family === family)) {
      const option = document.createElement("option");
      option.value = base.id;
      option.textContent = base.label;
      group.append(option);
    }
    select.append(group);
  }
  select.value = state.baseId;
}

function fillCorruptionSelect(base) {
  const select = $("corruption-select");
  const mods = compatibleMods(base).sort((a, b) => a.level - b.level || a.stat.localeCompare(b.stat));
  select.replaceChildren();
  for (const mod of mods) {
    const option = document.createElement("option");
    option.value = mod.id;
    option.textContent = `${mod.stat}${mod.level > state.itemLevel ? ` — needs ilvl ${mod.level}` : ""}`;
    select.append(option);
  }
  if (!mods.some((mod) => mod.id === state.selectedId)) state.selectedId = mods[0]?.id ?? "";
  select.value = state.selectedId;
  return mods;
}

function render() {
  const base = BASES.find((entry) => entry.id === state.baseId) || BASES[0];
  const mods = fillCorruptionSelect(base);
  const selected = mods.find((mod) => mod.id === state.selectedId) || mods[0];
  if (!selected) return;

  state.selectedId = selected.id;
  const eligiblePool = mods.filter((mod) => mod.level <= state.itemLevel);
  const poolWeight = eligiblePool.reduce((sum, mod) => sum + weightFor(mod, base), 0);
  const targetEligible = selected.level <= state.itemLevel;
  const targetWeight = targetEligible ? weightFor(selected, base) : 0;
  const conditionalChance = poolWeight ? targetWeight / poolWeight : 0;
  const perOrbChance = conditionalChance * 0.25;
  const average = perOrbChance ? Math.ceil(1 / perOrbChance) : null;
  const median = attemptsFor(perOrbChance, 0.5);
  const ninety = attemptsFor(perOrbChance, 0.9);

  $("target-card").classList.toggle("target-locked", !targetEligible);
  $("target-status").textContent = targetEligible ? "TARGET IS IN THE POOL" : "TARGET IS LOCKED";
  $("target-stat").textContent = selected.stat;
  $("target-meta").textContent = `Requires item level ${selected.level} · weight ${weightFor(selected, base).toLocaleString()}`;

  $("big-odds").textContent = oneIn(perOrbChance);
  $("big-odds").classList.toggle("zero-odds", !perOrbChance);
  $("big-percent").textContent = `${percent(perOrbChance)} exact chance`;
  $("conditional-percent").textContent = percent(conditionalChance, 2);
  $("orb-percent").textContent = percent(perOrbChance, 3);
  $("average-attempts").textContent = average?.toLocaleString() ?? "—";
  $("median-attempts").textContent = median?.toLocaleString() ?? "—";
  $("ninety-attempts").textContent = ninety?.toLocaleString() ?? "—";
  $("eligible-count").textContent = eligiblePool.length.toLocaleString();
  $("pool-weight").textContent = poolWeight.toLocaleString();
  $("target-weight").textContent = targetWeight.toLocaleString();

  const warning = $("level-warning");
  warning.hidden = targetEligible;
  warning.textContent = targetEligible ? "" : `Raise the item to level ${selected.level} or choose another corruption.`;
  $("level-range").style.setProperty("--level", `${state.itemLevel}%`);
}

$("base-select").addEventListener("change", (event) => {
  state.baseId = event.target.value;
  const base = BASES.find((entry) => entry.id === state.baseId);
  state.selectedId = compatibleMods(base)[0]?.id ?? "";
  render();
});

$("corruption-select").addEventListener("change", (event) => {
  state.selectedId = event.target.value;
  render();
});

function setLevel(value) {
  state.itemLevel = Math.min(100, Math.max(1, Number(value) || 1));
  $("level-input").value = state.itemLevel;
  $("level-range").value = state.itemLevel;
  render();
}

$("level-input").addEventListener("input", (event) => setLevel(event.target.value));
$("level-range").addEventListener("input", (event) => setLevel(event.target.value));

fillBaseSelect();
render();
