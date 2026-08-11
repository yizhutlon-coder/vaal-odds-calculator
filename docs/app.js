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
const defaultSimItem = window.GAME_ITEMS.find((item) => item.name === "Shavronne's Wrappings") || window.GAME_ITEMS.find((item) => item.rarity === "unique") || window.GAME_ITEMS[0];
const simParams = new URLSearchParams(window.location.search);
const sharedSimItem = window.GAME_ITEMS.find((item) => item.id === simParams.get("simItem"));
const sharedSimLevel = Number(simParams.get("simIlvl"));
const sharedSimAttempts = Number(simParams.get("simAttempts"));
const sharedSimOutcome = simParams.get("simOutcome");
if (simParams.get("simMethod") === "locus" || simParams.get("simMethod") === "vaal") state.method = simParams.get("simMethod");
const simState = {
  item: sharedSimItem || defaultSimItem,
  query: (sharedSimItem || defaultSimItem).name,
  filter: "all",
  itemLevel: Number.isFinite(sharedSimLevel) && sharedSimLevel >= 1 && sharedSimLevel <= 100 ? sharedSimLevel : 86,
  attempts: Number.isFinite(sharedSimAttempts) && sharedSimAttempts > 0 ? sharedSimAttempts : 0,
  result: sharedSimOutcome && simParams.get("simTitle") && simParams.get("simDetail") ? {
    kind: sharedSimOutcome,
    title: simParams.get("simTitle"),
    detail: simParams.get("simDetail"),
  } : null,
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

function weightedPick(pool, base) {
  const total = pool.reduce((sum, mod) => sum + weightFor(mod, base), 0);
  if (!total) return null;
  let roll = Math.random() * total;
  for (const mod of pool) {
    roll -= weightFor(mod, base);
    if (roll < 0) return mod;
  }
  return pool.at(-1) || null;
}

function simulateCorruption(method, pool, base) {
  const branch = Math.floor(Math.random() * 4);
  if (branch === 0) {
    const first = weightedPick(pool, base);
    if (!first) return { kind: "implicit", title: "NO ELIGIBLE IMPLICIT", detail: "Raise the item level and try again." };
    if (method === "vaal") return { kind: "implicit", title: "CORRUPTED IMPLICIT", detail: first.stat };
    const second = weightedPick(pool.filter((mod) => mod.group !== first.group), base);
    return { kind: "implicit", title: "DOUBLE CORRUPTION", detail: second ? `${first.stat} + ${second.stat}` : first.stat };
  }
  if (branch === 1) return { kind: "socket", title: "SOCKET COLOR", detail: "The socket-color outcome was selected." };
  if (branch === 2) return { kind: "rare", title: "RARE BRICK", detail: "The item became a rare of the same base type." };
  return method === "locus"
    ? { kind: "destroyed", title: "DESTROYED", detail: "The temple claimed the item." }
    : { kind: "nothing", title: "NO CHANGE", detail: "Corrupted, but otherwise unchanged." };
}

function simulatorPool() {
  const base = BASES.find((entry) => entry.id === simState.item.baseCategoryId) || BASES[0];
  return {
    base,
    pool: window.CORRUPTION_MODS.filter((mod) => mod.level <= simState.itemLevel && weightFor(mod, base) > 0),
  };
}

function renderSimulator() {
  const item = simState.item;
  const { pool } = simulatorPool();
  $("sim-method-vaal").classList.toggle("active", state.method === "vaal");
  $("sim-method-locus").classList.toggle("active", state.method === "locus");
  $("sim-method-vaal").setAttribute("aria-checked", String(state.method === "vaal"));
  $("sim-method-locus").setAttribute("aria-checked", String(state.method === "locus"));
  $("corrupt-button").textContent = state.method === "locus" ? "OFFER TO THE LOCUS" : "USE VAAL ORB";
  $("sim-attempts").textContent = simState.attempts.toLocaleString();
  $("sim-level").value = simState.itemLevel;
  $("sim-level").style.setProperty("--level", `${simState.itemLevel}%`);
  $("sim-level-output").textContent = simState.itemLevel;
  $("sim-item-frame").className = `item-frame ${item.rarity}`;
  $("sim-rarity").textContent = item.rarity === "unique" ? "UNIQUE" : "ITEM BASE";
  $("sim-item-name").textContent = item.name;
  $("sim-item-meta").textContent = `${item.rarity === "unique" ? item.baseType : item.classId} · Item level ${simState.itemLevel}`;
  const art = $("sim-item-art");
  art.replaceChildren();
  if (item.imageUrl) {
    const image = document.createElement("img");
    image.src = item.imageUrl;
    image.alt = item.name;
    art.append(image);
  } else {
    const missing = document.createElement("span");
    missing.className = "missing-art";
    missing.textContent = "V";
    art.append(missing);
  }
  $("sim-eligible").textContent = pool.length.toLocaleString();
  $("sim-catalog-count").textContent = `${window.GAME_ITEMS.length.toLocaleString()} items`;
  const overlay = $("result-overlay");
  overlay.hidden = !simState.result;
  if (simState.result) {
    overlay.className = `result-overlay ${simState.result.kind}`;
    $("result-kicker").textContent = simState.result.kind === "destroyed" ? "✕" : "VAAL RESULT";
    $("result-title").textContent = simState.result.title;
    $("result-detail").textContent = simState.result.detail;
  }
  $("sim-share").disabled = !simState.result;
}

function renderItemSearch() {
  const list = $("item-search-results");
  const needle = simState.query.trim().toLocaleLowerCase();
  if (!needle || simState.query.trim() === simState.item.name) {
    list.hidden = true;
    list.replaceChildren();
    return;
  }
  const matches = window.GAME_ITEMS
    .filter((item) => simState.filter === "all" || item.rarity === simState.filter)
    .filter((item) => `${item.name} ${item.baseType} ${item.classId}`.toLocaleLowerCase().includes(needle))
    .sort((a, b) => {
      const aName = a.name.toLocaleLowerCase();
      const bName = b.name.toLocaleLowerCase();
      const aRank = aName === needle ? 0 : aName.startsWith(needle) ? 1 : 2;
      const bRank = bName === needle ? 0 : bName.startsWith(needle) ? 1 : 2;
      return aRank - bRank || (a.rarity === b.rarity ? a.name.localeCompare(b.name) : a.rarity === "unique" ? -1 : 1);
    })
    .slice(0, 12);
  list.replaceChildren();
  for (const item of matches) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "option");
    const art = document.createElement("span");
    art.className = `mini-item-art ${item.rarity}`;
    if (item.imageUrl) {
      const image = document.createElement("img");
      image.src = item.imageUrl;
      image.alt = "";
      image.loading = "lazy";
      art.append(image);
    } else {
      const fallback = document.createElement("b");
      fallback.textContent = "V";
      art.append(fallback);
    }
    const copy = document.createElement("span");
    const name = document.createElement("strong");
    const meta = document.createElement("small");
    name.textContent = item.name;
    meta.textContent = item.rarity === "unique" ? `${item.baseType} · Unique` : `${item.classId} · Base`;
    copy.append(name, meta);
    button.append(art, copy);
    button.addEventListener("click", () => {
      simState.item = item;
      simState.query = item.name;
      simState.attempts = 0;
      simState.result = null;
      $("item-search").value = item.name;
      $("sim-share-status").textContent = "Share the item, outcome, and attempt count.";
      list.hidden = true;
      renderSimulator();
    });
    list.append(button);
  }
  list.hidden = matches.length === 0;
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
  renderSimulator();
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
$("sim-method-vaal").addEventListener("click", () => { state.method = "vaal"; render(); });
$("sim-method-locus").addEventListener("click", () => { state.method = "locus"; render(); });
$("item-search").value = simState.query;
$("item-search").addEventListener("input", (event) => {
  simState.query = event.target.value;
  renderItemSearch();
});
document.querySelectorAll("[data-item-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    simState.filter = button.dataset.itemFilter;
    document.querySelectorAll("[data-item-filter]").forEach((entry) => entry.classList.toggle("active", entry === button));
    renderItemSearch();
  });
});
$("sim-level").addEventListener("input", (event) => {
  simState.itemLevel = Number(event.target.value);
  simState.result = null;
  renderSimulator();
});
$("corrupt-button").addEventListener("click", () => {
  const { base, pool } = simulatorPool();
  simState.result = simulateCorruption(state.method, pool, base);
  simState.attempts += 1;
  $("sim-share-status").textContent = "Share the item, outcome, and attempt count.";
  renderSimulator();
});
$("sim-reset").addEventListener("click", () => {
  simState.attempts = 0;
  simState.result = null;
  $("sim-share-status").textContent = "Share the item, outcome, and attempt count.";
  renderSimulator();
});
$("sim-share").addEventListener("click", async () => {
  if (!simState.result) return;
  const url = new URL(window.location.href);
  url.hash = "simulator";
  url.searchParams.set("simItem", simState.item.id);
  url.searchParams.set("simIlvl", String(simState.itemLevel));
  url.searchParams.set("simMethod", state.method);
  url.searchParams.set("simAttempts", String(simState.attempts));
  url.searchParams.set("simOutcome", simState.result.kind);
  url.searchParams.set("simTitle", simState.result.title);
  url.searchParams.set("simDetail", simState.result.detail);
  try {
    await navigator.clipboard.writeText(url.toString());
    $("sim-share-status").textContent = "Luck link copied";
  } catch {
    window.history.replaceState({}, "", url);
    $("sim-share-status").textContent = "Copy the page URL to share this result";
  }
});
for (const [id, key] of [["item-cost", "itemCost"], ["vaal-cost", "vaalCost"], ["locus-cost", "locusCost"], ["finished-cost", "finishedCost"]]) {
  $(id).addEventListener("input", (event) => { state[key] = event.target.value; render(); });
}
fillBaseSelect();
render();
