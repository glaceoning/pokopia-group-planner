# Pokopia Group Planner

A local web app for importing the Pokémon you own, building active squads, saving map-valid Houses, and comparing Pokopia recommendations.

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
2. Add available owned Pokémon to the active squad.
3. Save that squad as a House to permanently lock those Pokémon together, or auto-generate a new House from your unassigned owned Pokémon.
4. Adjust recommendation filters for the active squad, including a target map.
5. Review the recommendation table and add candidates that fit your current squad and selected map.


## Houses workflow

- **Save current squad as a House**: lock the active squad into a saved House, record its synergy score/rating and weighting, validate that every member is available on the selected map, and clear the active squad so you can build the next one.
- **Auto-generate a House**: choose a minimum and maximum size, a target map, and optional filters, then let the app assemble the best available House from your unassigned owned Pokémon that can actually appear there.
- **Release a House**: unlock its Pokémon so they can be used in future squads or Houses again.

Pokémon assigned to a House are removed from the available pool for manual squad building and from future recommendation results until that House is released.

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

## Import tips

The paste importer accepts several common clipboard formats:

- one Pokémon per line (`Bulbasaur`)
- dex number prefixes (`025 Pikachu`, `#025`)
- bullet lists (`- Pikachu`)
- comma-separated rows (`Pikachu, Lucario, Eevee`)

## Scoring summary

For each candidate against each squad member:

- Ideal habitat: `+1` if matched, `-1` if conflicting, `0` otherwise.
- Favorites: `+n` where `n` is the number of shared favorites with that squad member.

Formula:

`combined_score = (1 - a) * habitat_score + (1 + a) * favorites_score`

Saved Houses preserve the weighting value `a` that was used when they were generated or saved, so later edits remain explainable.

## Project files

- `index.html` — page structure.
- `styles.css` — styling.
- `app.js` — browser behavior and saved filters/list state.
- `planner-core.mjs` — shared normalization, map, and import helpers.
- `run_app.py` — local server helper.
- `data/pokopia_pokemon.json` — Pokémon data.
- `scripts/scrape_pokopia_pokemon_serebii.py` — optional data scraper.
