# Pokopia Group Planner

A local web app for building a Pokemon group and recommending which Pokemon to add next.

## Run

```bash
cd /Users/sungwonkim/Desktop/pokopia_grouping
python3 -m http.server 8000
```

Open: <http://localhost:8000>

## Main flow

1. Search Pokemon by name or dex number, then add to current group.
2. Set recommendation requirements:
- required ideal habitat
- required specialty (any selected)
3. View ranked recommendations.

## Current comfort score (implemented)

For each candidate against each existing group member:

- Ideal habitat: `+1` if match, `-1` if incompatible, `0` otherwise.
- Favorites: `+n` where `n` is the number of shared favorites with that group member.

Candidate `comfort_score` is the sum of those values across current group members.

Incompatible habitat pairs currently used:

- Bright vs Dark
- Humid vs Dry
- Warm vs Cool

## Data

The app reads `data/pokopia_pokemon.json`.

To refresh from Serebii:

```bash
.venv/bin/python scripts/scrape_pokopia_pokemon_serebii.py
```
