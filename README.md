# Pokopia Group Planner

A local web app for building a Pokemon group and recommending which Pokemon to add next.

## Run

```bash
python3 -m http.server 8000
```

Open: <http://localhost:8000>

## Main flow

1. Search Pokemon by name or dex number, then add to current group.
2. Set recommendation requirements:
- required ideal habitat
- required specialties using checkbox multi-select (`A OR B OR C` matching)
- importance ratio slider (`a`) from `-1` (habitat-heavy) to `+1` (favorites-heavy)
3. View ranked recommendations and add directly from the results table.

## Current combined score (implemented)

For each candidate against each existing group member:

- Ideal habitat: `+1` if match, `-1` if in conflict, `0` otherwise.
- Favorites: `+n` where `n` is the number of shared favorites with that group member.

Then apply:

`combined_score = (1 - a) * habitat_score + (1 + a) * favorites_score`

The UI shows combined score to 2 decimal places.

This formula is intentionally simple for now and may be updated later.

## Data

The app reads `data/pokopia_pokemon.json`.

To refresh from Serebii:

```bash
.venv/bin/python scripts/scrape_pokopia_pokemon_serebii.py
```

