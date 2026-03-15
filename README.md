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
- required specialties using checkbox multi-select (`A OR B OR C` matching)
- importance ratio slider (`a`) from `-1` (habitat-heavy) to `+1` (favorites-heavy)
3. View ranked recommendations and add directly from the results table.

## Current combined score (implemented)

For each candidate against each existing group member:

- Ideal habitat: `+1` if match, `-1` if incompatible by current rule set, `0` otherwise.
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

## Publish On GitHub Pages

1. Create a new public GitHub repository (for example `pokopia-group-planner`).
2. Push this project:

```bash
git add .
git commit -m "Prepare Pokopia group planner for public hosting"
git remote add origin https://github.com/<YOUR_USERNAME>/pokopia-group-planner.git
git push -u origin main
```

3. On GitHub: `Settings -> Pages`
- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`
- Save

4. Wait 1-2 minutes, then open:
- `https://<YOUR_USERNAME>.github.io/pokopia-group-planner/`

### Optional: GitHub CLI shortcut

If you use `gh` and are logged in:

```bash
gh repo create pokopia-group-planner --public --source=. --remote=origin --push
```
