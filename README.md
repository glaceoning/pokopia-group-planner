# Pokopia Group Planner

A beginner-friendly local web app for building a Pokémon group and recommending which Pokémon to add next.

## What this app is

This repository is a **static website**. That means:

- there is no account system,
- there is no database,
- nothing needs to be deployed to GitHub to test it locally,
- and you can use it directly on your own computer.

Because the app loads `data/pokopia_pokemon.json` in the browser, you should open it through a **small local web server** instead of double-clicking `index.html`.

## Fastest way to run it

### Option A: one command

From this repository folder, run:

```bash
python3 run_app.py
```

That starts a local server and tries to open the app in your browser.

### Option B: plain Python built-in server

If you prefer the standard Python way:

```bash
python3 -m http.server 8000
```

Then open:

<http://localhost:8000>

## Step-by-step for a beginner

1. Open a terminal.
2. Change into this project folder.
3. Run `python3 run_app.py`.
4. Open the printed local URL in your browser.
5. Add Pokémon into **Current Group**.
6. Adjust the filters and importance slider.
7. Read the **Recommendations** table for suggested additions.

## What I changed so it works better for personal use

The app now supports personal/local customization:

- **Personal Setup** lets you save your trainer name, your own planner title, and personal notes.
- Your **current group** is now saved in your browser.
- Your **filters and slider settings** are now saved in your browser.
- The app includes an in-page **How To Use This App** section.
- A new `run_app.py` helper gives you a simpler way to launch the app.

These saved values live in your browser's local storage on your own device. They are not uploaded anywhere.

## Do you need to change anything because this was forked?

For local personal use, usually **no major code changes are required** just because the repo was forked.

What matters is mostly this:

### 1. Repository ownership
Your fork is already your own copy on GitHub. That is enough to make changes for yourself.

### 2. Branding / personalization
If you want the app to feel like yours, you can now do that inside the app using **Personal Setup**.

### 3. Data updates
If you want fresher Pokémon data later, you can rerun the scraper.

## Updating the Pokémon data

Install the scraper dependencies:

```bash
python3 -m pip install -r requirements.txt
```

Then run:

```bash
python3 scripts/scrape_pokopia_pokemon_serebii.py
```

That refreshes `data/pokopia_pokemon.json` from Serebii.

## Current combined score

For each candidate against each existing group member:

- Ideal habitat: `+1` if match, `-1` if in conflict, `0` otherwise.
- Favorites: `+n` where `n` is the number of shared favorites with that group member.

Then apply:

`combined_score = (1 - a) * habitat_score + (1 + a) * favorites_score`

The UI shows combined score to 2 decimal places.

## Group total scores

Group total score is computed from the current group only (not candidates), with two modes:

- `stacked` overlap mode:
  - For a shared feature with `k` Pokémon, contribution is `1 + 2 + ... + (k - 1)`.
  - Example: `k = 3 -> 3`, `k = 4 -> 6`.
- `simple` overlap mode:
  - For a shared feature with `k` Pokémon, contribution is `k - 1`.
  - Example: `k = 3 -> 2`, `k = 4 -> 3`.

Conflicting ideal habitat is subtracted as `-1` per conflicting pair in both modes.

Combined group total uses the same slider weighting:

`group_total = (1 - a) * habitat_total + (1 + a) * favorites_total`

## Project files you will care about most

- `index.html` — page structure and app sections.
- `styles.css` — page styling.
- `app.js` — app behavior and local browser saving.
- `run_app.py` — simplest way to launch the app locally.
- `data/pokopia_pokemon.json` — Pokémon data used by the planner.
- `scripts/scrape_pokopia_pokemon_serebii.py` — optional scraper for refreshing the dataset.
