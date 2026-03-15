#!/usr/bin/env python3
"""Scrape Pokemon Pokopia Pokemon data from Serebii.

This scraper extracts fields useful for grouping logic:
- dex_number
- name
- specialties
- ideal_habitat
- favorites
- where_to_find (habitat + locations + rarity + time + weather)
"""

from __future__ import annotations

import argparse
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, Tag

BASE_URL = "https://www.serebii.net"
INDEX_URL = f"{BASE_URL}/pokemonpokopia/availablepokemon.shtml"
DETAIL_PREFIX = "/pokemonpokopia/pokedex/"

DEFAULT_HEADERS = {
    "User-Agent": "pokopia-grouping-serebii-scraper/1.0 (+local dev)",
    "Accept": "text/html,application/xhtml+xml",
}


def fetch_html(session: requests.Session, url: str, retries: int = 3, timeout: int = 30) -> str:
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            response = session.get(url, timeout=timeout)
            response.raise_for_status()
            response.encoding = "latin-1"
            return response.text
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if attempt < retries:
                time.sleep(0.7 * attempt)
            else:
                raise

    if last_error is not None:
        raise last_error
    raise RuntimeError(f"Failed to fetch {url}")


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def unique_keep_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        cleaned = normalize_text(value)
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        out.append(cleaned)
    return out


def text_lines(tag: Tag | None) -> list[str]:
    if tag is None:
        return []
    text = tag.get_text("\n", strip=True)
    parts = [normalize_text(x) for x in text.splitlines()]
    return [x for x in parts if x]


def parse_index_links(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    links: list[str] = []
    seen: set[str] = set()

    # The available list includes both image and text anchors for each entry.
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href.startswith(DETAIL_PREFIX) or not href.endswith(".shtml"):
            continue
        if "/specialty/" in href or "/idealhabitat/" in href:
            continue
        if href in seen:
            continue
        seen.add(href)
        links.append(href)

    return links


def parse_h1(soup: BeautifulSoup) -> tuple[int | None, str | None]:
    h1 = soup.find("h1")
    if h1 is None:
        return None, None

    header = normalize_text(h1.get_text(" ", strip=True))
    m = re.match(r"#\s*(\d+)\s*(.*)", header)
    if not m:
        return None, header if header else None

    dex_number = int(m.group(1))
    name = normalize_text(m.group(2)) if m.group(2) else None
    return dex_number, name


def parse_stats_block(soup: BeautifulSoup) -> tuple[list[str], str | None, list[str]]:
    specialties: list[str] = []
    ideal_habitat: str | None = None
    favorites: list[str] = []

    stats_table: Tag | None = None
    for table in soup.find_all("table"):
        header_cells = [normalize_text(td.get_text(" ", strip=True)).lower() for td in table.find_all("td", class_="foo")]
        if "specialty" in header_cells and "ideal habitat" in header_cells and "favorites" in header_cells:
            stats_table = table
            break

    if stats_table is None:
        return specialties, ideal_habitat, favorites

    header_row: Tag | None = None
    for tr in stats_table.find_all("tr"):
        cols = [normalize_text(td.get_text(" ", strip=True)).lower() for td in tr.find_all("td", class_="foo")]
        if cols == ["specialty", "ideal habitat", "favorites"]:
            header_row = tr
            break

    data_row: Tag | None = header_row.find_next_sibling("tr") if header_row else None
    if data_row is None:
        return specialties, ideal_habitat, favorites

    cells = data_row.find_all("td", recursive=False)
    if len(cells) < 3:
        return specialties, ideal_habitat, favorites

    specialty_cell, habitat_cell, favorites_cell = cells[:3]

    specialty_links = [
        normalize_text(a.get_text(" ", strip=True))
        for a in specialty_cell.find_all("a", href=True)
        if "/pokemonpokopia/pokedex/specialty/" in a["href"] and normalize_text(a.get_text(" ", strip=True))
    ]
    specialties = unique_keep_order(specialty_links)

    ideal_habitat_text = normalize_text(habitat_cell.get_text(" ", strip=True))
    ideal_habitat = ideal_habitat_text if ideal_habitat_text else None

    favorites = text_lines(favorites_cell)

    return specialties, ideal_habitat, favorites


def parse_location_cell(cell: Tag) -> list[str]:
    links = [
        normalize_text(a.get_text(" ", strip=True))
        for a in cell.find_all("a", href=True)
        if "/pokemonpokopia/locations/" in a["href"]
    ]
    if links:
        return unique_keep_order(links)

    lines = text_lines(cell)
    out = [x for x in lines if x.lower() not in {"location", "location:"} and x != ":"]
    return unique_keep_order(out)


def parse_rarity_cell(cell: Tag) -> str | None:
    lines = [x for x in text_lines(cell) if x.lower() not in {"rarity", "rarity:"} and x != ":"]
    return lines[0] if lines else None


def parse_time_weather_cell(cell: Tag) -> tuple[list[str], list[str]]:
    nested = cell.find("table")
    if nested is None:
        return [], []

    nested_tds = nested.find_all("td")
    if len(nested_tds) >= 4:
        time_values = text_lines(nested_tds[2])
        weather_values = text_lines(nested_tds[3])
        return unique_keep_order(time_values), unique_keep_order(weather_values)

    text = normalize_text(nested.get_text(" ", strip=True))
    if not text:
        return [], []

    return [], []


def parse_habitats_block(soup: BeautifulSoup) -> list[dict[str, Any]]:
    table: Tag | None = None
    for t in soup.find_all("table"):
        h2 = t.find("h2")
        if h2 and "Habitats & Locations" in normalize_text(h2.get_text(" ", strip=True)):
            table = t
            break

    if table is None:
        return []

    habitat_cells = [
        td
        for td in table.find_all("td", class_="fooevo")
        if td.find("a", href=lambda h: bool(h and "/pokemonpokopia/habitatdex/" in h))
    ]

    habitats: list[dict[str, Any]] = []
    for cell in habitat_cells:
        link = cell.find("a", href=True)
        href = link["href"] if link else ""
        slug = Path(href).name.replace(".shtml", "") if href else None
        habitats.append(
            {
                "habitat_name": normalize_text(cell.get_text(" ", strip=True)) or None,
                "habitat_slug": slug,
                "locations": [],
                "rarity": None,
                "time": [],
                "weather": [],
            }
        )

    location_cells: list[Tag] = []
    rarity_cells: list[Tag] = []
    time_weather_cells: list[Tag] = []

    for cell in table.find_all("td", class_="fooinfo"):
        b = cell.find("b")
        b_text = normalize_text(b.get_text(" ", strip=True)).lower() if b else ""

        if b_text == "location":
            location_cells.append(cell)
            continue
        if b_text == "rarity":
            rarity_cells.append(cell)
            continue

        nested = cell.find("table")
        if nested:
            headers = {normalize_text(x.get_text(" ", strip=True)).lower() for x in nested.find_all("b")}
            if {"time", "weather"}.issubset(headers):
                time_weather_cells.append(cell)

    count = max(len(habitats), len(location_cells), len(rarity_cells), len(time_weather_cells))
    if count == 0:
        return []

    while len(habitats) < count:
        habitats.append(
            {
                "habitat_name": None,
                "habitat_slug": None,
                "locations": [],
                "rarity": None,
                "time": [],
                "weather": [],
            }
        )

    for i in range(count):
        if i < len(location_cells):
            habitats[i]["locations"] = parse_location_cell(location_cells[i])
        if i < len(rarity_cells):
            habitats[i]["rarity"] = parse_rarity_cell(rarity_cells[i])
        if i < len(time_weather_cells):
            t_values, w_values = parse_time_weather_cell(time_weather_cells[i])
            habitats[i]["time"] = t_values
            habitats[i]["weather"] = w_values

    return habitats


def canonical_slug_from_url(url: str) -> str:
    return Path(url).name.replace(".shtml", "")


def parse_pokemon_page(html: str, url: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")

    dex_number, name = parse_h1(soup)
    specialties, ideal_habitat, favorites = parse_stats_block(soup)
    where_to_find = parse_habitats_block(soup)

    locations: list[str] = []
    for entry in where_to_find:
        locations.extend(entry.get("locations", []))

    return {
        "dex_number": dex_number,
        "name": name,
        "form_slug": canonical_slug_from_url(url),
        "source_url": url,
        "specialties": specialties,
        "ideal_habitat": ideal_habitat,
        "favorites": favorites,
        "locations": unique_keep_order(locations),
        "where_to_find": where_to_find,
    }


def patch_known_number_errors(entries: list[dict[str, Any]]) -> None:
    # Serebii currently reports Toxtricity Low Key Form as #00 on-page.
    for entry in entries:
        if entry.get("form_slug") == "toxtricitylowkeyform" and entry.get("dex_number") in {0, None}:
            entry["dex_number"] = 197


def compute_missing_counts(entries: list[dict[str, Any]]) -> dict[str, int]:
    return {
        "ideal_habitat": sum(1 for e in entries if not e.get("ideal_habitat")),
        "specialties": sum(1 for e in entries if not e.get("specialties")),
        "favorites": sum(1 for e in entries if not e.get("favorites")),
        "where_to_find": sum(1 for e in entries if not e.get("where_to_find")),
    }


def sort_key(entry: dict[str, Any]) -> tuple[int, str]:
    dex = entry.get("dex_number")
    if isinstance(dex, int):
        return dex, entry.get("form_slug", "")
    return 9999, entry.get("form_slug", "")


def scrape_all(delay_seconds: float = 0.15) -> dict[str, Any]:
    session = requests.Session()
    session.headers.update(DEFAULT_HEADERS)

    index_html = fetch_html(session, INDEX_URL)
    links = parse_index_links(index_html)

    entries: list[dict[str, Any]] = []
    total = len(links)

    for i, rel in enumerate(links, start=1):
        url = urljoin(BASE_URL, rel)
        page_html = fetch_html(session, url)
        entries.append(parse_pokemon_page(page_html, url))

        if i % 25 == 0 or i == total:
            print(f"Scraped {i}/{total} pages...")

        if delay_seconds > 0:
            time.sleep(delay_seconds)

    patch_known_number_errors(entries)
    entries.sort(key=sort_key)

    unique_dex_numbers = {e.get("dex_number") for e in entries if isinstance(e.get("dex_number"), int)}

    return {
        "source": {
            "name": "Serebii",
            "url": INDEX_URL,
        },
        "scraped_at_utc": datetime.now(timezone.utc).isoformat(),
        "counts": {
            "entries": len(entries),
            "unique_dex_numbers": len(unique_dex_numbers),
            "missing": compute_missing_counts(entries),
        },
        "pokemon": entries,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape Pokopia Pokemon data from Serebii")
    parser.add_argument(
        "--output",
        default="data/pokopia_pokemon.json",
        help="Output JSON path (default: data/pokopia_pokemon.json)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.15,
        help="Delay between requests in seconds (default: 0.15)",
    )
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    data = scrape_all(delay_seconds=args.delay)
    output_path.write_text(json.dumps(data, ensure_ascii=True, indent=2) + "\n")

    print(f"Wrote {data['counts']['entries']} entries to {output_path}")


if __name__ == "__main__":
    main()
