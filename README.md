# Vaal Odds

A Path of Exile 1 calculator for the weighted chance of hitting a specific equipment corruption with a Vaal Orb.

## What it calculates

- Filters corruption implicits by equipment base class
- Applies item-level requirements
- Respects first-matching item-tag weights and zero-weight exclusions
- Multiplies the target's share of the eligible pool by the Vaal Orb's 25% implicit outcome
- Shows average attempts and the attempts needed for 50% and 90% cumulative chances

The dataset contains 238 active equipment corruption rows and was reviewed against the PoE Wiki on August 9, 2026.

## Development

```bash
npm install
npm run dev
```

Generate the static GitHub Pages version with:

```bash
npm run build:pages
```

The hosted static files are in `docs/`.

## Sources

- [Corruption mechanics](https://www.poewiki.net/wiki/Corrupted)
- [Modifier weighting rules](https://www.poewiki.net/wiki/Modifier)
- [Equipment corruption implicit modifiers](https://www.poewiki.net/wiki/List_of_item_corruption_implicit_modifiers)
