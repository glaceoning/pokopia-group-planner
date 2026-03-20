# Pokopia Group Planner

A local web app for importing the Pokémon you own, building a squad, and comparing Pokopia recommendations.

## Run locally

Use either option below from the repository root:

```bash
python3 run_app.py
```

or:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## How to use the app

1. Add Pokémon to your owned list from the catalog or by pasting a list.
2. Add owned Pokémon to the squad.
3. Adjust recommendation filters.
4. Review the recommendation table and add candidates as needed.

## Update the data

Install scraper dependencies:

```bash
python3 -m pip install -r requirements.txt
```

Run the scraper:

```bash
python3 scripts/scrape_pokopia_pokemon_serebii.py
```

This refreshes `data/pokopia_pokemon.json`.

## Scoring summary

For each candidate against each squad member:

- Ideal habitat: `+1` if matched, `-1` if conflicting, `0` otherwise.
- Favorites: `+n` where `n` is the number of shared favorites with that squad member.

Formula:

`combined_score = (1 - a) * habitat_score + (1 + a) * favorites_score`

## Project files

- `index.html` — page structure.
- `styles.css` — styling.
- `app.js` — browser behavior and saved filters/list state.
- `run_app.py` — local server helper.
- `data/pokopia_pokemon.json` — Pokémon data.
- `scripts/scrape_pokopia_pokemon_serebii.py` — optional data scraper.
