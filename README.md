# Pokopia Group Planner

A local web app for building a Pokemon group and recommending which Pokemon to add next.

## Run

```bash
python3 -m http.server 8000
```

Open: <http://localhost:8000>



## Current combined score

For each candidate against each existing group member:

- Ideal habitat: `+1` if match, `-1` if in conflict, `0` otherwise.
- Favorites: `+n` where `n` is the number of shared favorites with that group member.

Then apply:

`combined_score = (1 - a) * habitat_score + (1 + a) * favorites_score`

The UI shows combined score to 2 decimal places.

This formula is intentionally simple for now and may be updated later.

## Group total scores

Group total score is computed from the current group only (not candidates), with two modes:

- `stacked` overlap mode:
  - For a shared feature with `k` Pokemon, contribution is `1 + 2 + ... + (k - 1)` (equivalent to pairwise count).
  - Example: `k = 3 -> 3`, `k = 4 -> 6`.
- `simple` overlap mode:
  - For a shared feature with `k` Pokemon, contribution is `k - 1`.
  - Example: `k = 3 -> 2`, `k = 4 -> 3`.

Conflicting Ideal Habitat is subtracted as `-1` per conflicting pair in both modes.

Combined group total uses the same slider weighting:

`group_total = (1 - a) * habitat_total + (1 + a) * favorites_total`

The app shows both totals at the same time.



## Data

The app reads `data/pokopia_pokemon.json`.

To refresh from Serebii:

```bash
.venv/bin/python scripts/scrape_pokopia_pokemon_serebii.py
```
