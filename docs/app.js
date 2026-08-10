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
const state = {
  method: "vaal",
  baseId: "ring",
  itemLevel: 86,
  selectedId: "V2MaxPowerChargesCorrupted",
  itemCost: "10",
  vaalCost: "1",
  locusCost: "100",
  finishedCost: "",
};
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
  if (value <= 0) return "-";
  const denominator = 1 / value;
  return denominator < 100 ? `1 in ${denominator.toFixed(1)}` : `1 in ${Math.round(denominator).toLocaleString()}`;
}

function attemptsFor(probability, confidence) {
  if (probability <= 0) return null;
  return Math.ceil(Math.log(1 - confidence) / Math.log(1 - probability));
}

function costValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatChaos(value) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)} Chaos`;
}

function targetInEitherSlotChance(pool, target, base) {
  const totalWeight = pool.reduce((sum, mod) => sum + weightFor(mod, base), 0);
  const targetWeight = weightFor(target, base);
  if (!totalWeight || !targetWeight) return 0;
  let chance = targetWeight / totalWeight;
  for (const first of pool) {
    if (first.id === target.id || first.group === target.group) continue;
    const blockedGroupWeight = pool.filter((mod) => mod.group === first.group).reduce((sum, mod) => sum + weightFor(mod, base), 0);
    const secondRollWeight = totalWeight - blockedGroupWeight;
    if (secondRollWeight > 0) chance += (weightFor(first, base) / totalWeight) * (targetWeight / secondRollWeight);
  }
  return chance;
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
    option.textContent = `${mod.stat}${mod.level > state.itemLevel ? ` - needs ilvl ${mod.level}` : ""}`;
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
  const singleChance = poolWeight ? targetWeight / poolWeight : 0;
  const doubleChance = targetEligible ? targetInEitherSlotChance(eligiblePool, selected, base) : 0;
  const conditionalChance = state.method === "locus" ? doubleChance : singleChance;
  const perAttemptChance = conditionalChance * 0.25;
  const average = perAttemptChance ? Math.ceil(1 / perAttemptChance) : null;
  const median = attemptsFor(perAttemptChance, 0.5);
  const ninety = attemptsFor(perAttemptChance, 0.9);
  const isLocus = state.method === "locus";
  const unit = isLocus ? "altars" : "orbs";
  const itemCost = costValue(state.itemCost);
  const attemptCurrencyCost = isLocus ? costValue(state.locusCost) : costValue(state.vaalCost);
  const costPerAttempt = itemCost + attemptCurrencyCost;
  const expectedAttempts = perAttemptChance ? 1 / perAttemptChance : 0;
  const expectedCost = expectedAttempts * costPerAttempt;
  const medianCost = (median || 0) * costPerAttempt;
  const ninetyCost = (ninety || 0) * costPerAttempt;
  const finishedCost = costValue(state.finishedCost);

  $("method-vaal").classList.toggle("active", !isLocus);
  $("method-locus").classList.toggle("active", isLocus);
  $("method-vaal").setAttribute("aria-checked", String(!isLocus));
  $("method-locus").setAttribute("aria-checked", String(isLocus));
  $("target-card").classList.toggle("target-locked", !targetEligible);
  $("target-status").textContent = targetEligible ? "TARGET IS IN THE POOL" : "TARGET IS LOCKED";
  $("target-stat").textContent = selected.stat;
  $("target-meta").textContent = `Requires item level ${selected.level} | weight ${weightFor(selected, base).toLocaleString()}${isLocus ? " | target may be in either slot" : ""}`;

  $("odds-label").textContent = `CHANCE PER ${isLocus ? "LOCUS ALTAR" : "VAAL ORB"}`;
  $("big-odds").textContent = oneIn(perAttemptChance);
  $("big-odds").classList.toggle("zero-odds", !perAttemptChance);
  $("big-percent").textContent = `${percent(perAttemptChance)} exact chance`;
  $("conditional-label").textContent = isLocus ? "Target in either slot" : "Target in pool";
  $("conditional-percent").textContent = percent(conditionalChance, 2);
  $("attempt-label").textContent = `Per ${isLocus ? "altar" : "orb"}`;
  $("orb-percent").textContent = percent(perAttemptChance, 3);
  $("average-attempts").textContent = average?.toLocaleString() ?? "-";
  $("median-attempts").textContent = median?.toLocaleString() ?? "-";
  $("ninety-attempts").textContent = ninety?.toLocaleString() ?? "-";
  document.querySelectorAll(".attempt-unit").forEach((element) => { element.textContent = unit; });
  $("eligible-count").textContent = eligiblePool.length.toLocaleString();
  $("pool-weight").textContent = poolWeight.toLocaleString();
  $("target-weight").textContent = targetWeight.toLocaleString();
  $("vaal-track").hidden = isLocus;
  $("locus-track").hidden = !isLocus;
  $("method-title").textContent = isLocus ? "Two rolls. No repeated group." : "Weighted, not evenly split.";
  $("method-description").textContent = isLocus
    ? "The altar has four equal outcomes. On the two-implicit outcome, the first modifier is selected by weight; then every modifier in that same group is removed before the second weighted roll. The calculator sums the chance your target lands in either slot, then multiplies it by the altar's 25% double-implicit outcome."
    : "First, item level removes locked implicits. Then the base's first matching tag supplies each modifier's weight; a zero-weight match excludes it. Your target's weight is divided by the full eligible pool, then multiplied by 25%.";

  $("vaal-cost-row").hidden = isLocus;
  $("locus-cost-row").hidden = !isLocus;
  $("locus-reminder").hidden = !isLocus;
  $("cost-formula-label").textContent = isLocus ? "item + Locus altar per attempt" : "item + 1 Vaal Orb per attempt";
  $("cost-per-attempt").textContent = formatChaos(costPerAttempt);
  $("expected-cost").textContent = formatChaos(expectedCost);
  $("expected-cost-meta").textContent = expectedAttempts ? `${expectedAttempts.toLocaleString(undefined, { maximumFractionDigits: 1 })} attempts on average` : "Target is not eligible";
  $("median-cost").textContent = formatChaos(medianCost);
  $("median-cost-meta").textContent = median ? `${median.toLocaleString()} attempts` : "Target is not eligible";
  $("ninety-cost").textContent = formatChaos(ninetyCost);
  $("ninety-cost-meta").textContent = ninety ? `${ninety.toLocaleString()} attempts` : "Target is not eligible";

  const comparison = $("buy-comparison");
  if (finishedCost > 0 && expectedCost > 0) {
    const buyingCheaper = finishedCost <= expectedCost;
    const difference = Math.abs(expectedCost - finishedCost);
    const label = document.createElement("span");
    const amount = document.createElement("strong");
    const copy = document.createElement("p");
    comparison.className = `buy-verdict ${buyingCheaper ? "buy-finished" : "gamble-cheaper"}`;
    label.textContent = buyingCheaper ? "BUYING LOOKS CHEAPER" : "GAMBLING HAS THE LOWER AVERAGE";
    amount.textContent = `${formatChaos(difference)} difference`;
    copy.textContent = buyingCheaper
      ? "The finished item's asking price is below the gamble's average spend."
      : "The asking price is above the gamble's average spend—but luck can still run far over budget.";
    comparison.replaceChildren(label, amount, copy);
  } else {
    comparison.className = "buy-prompt";
    comparison.textContent = "Enter a finished-item price to compare buying it against the average gamble.";
  }

  const warning = $("level-warning");
  warning.hidden = targetEligible;
  warning.textContent = targetEligible ? "" : `Raise the item to level ${selected.level} or choose another corruption.`;
  $("level-range").style.setProperty("--level", `${state.itemLevel}%`);
}

$("method-vaal").addEventListener("click", () => { state.method = "vaal"; render(); });
$("method-locus").addEventListener("click", () => { state.method = "locus"; render(); });
$("base-select").addEventListener("change", (event) => {
  state.baseId = event.target.value;
  const base = BASES.find((entry) => entry.id === state.baseId);
  state.selectedId = compatibleMods(base)[0]?.id ?? "";
  render();
});
$("corruption-select").addEventListener("change", (event) => { state.selectedId = event.target.value; render(); });

function setLevel(value) {
  state.itemLevel = Math.min(100, Math.max(1, Number(value) || 1));
  $("level-input").value = state.itemLevel;
  $("level-range").value = state.itemLevel;
  render();
}

$("level-input").addEventListener("input", (event) => setLevel(event.target.value));
$("level-range").addEventListener("input", (event) => setLevel(event.target.value));
for (const [id, key] of [["item-cost", "itemCost"], ["vaal-cost", "vaalCost"], ["locus-cost", "locusCost"], ["finished-cost", "finishedCost"]]) {
  $(id).addEventListener("input", (event) => { state[key] = event.target.value; render(); });
}
fillBaseSelect();
render();
