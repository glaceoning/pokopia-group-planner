#!/usr/bin/env python3
"""Scrape Pokopia Pokemon data from PokopiaDex into a local JSON file.

Output schema focuses on grouping helpers:
- dex_number
- name
- form_slug
- specialties
- ideal_habitat
- favorites
- where_to_find (list of habitats + conditions)
"""

from __future__ import annotations

import argparse
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://pokopiadex.com"
POKEDEX_URL = f"{BASE_URL}/pokedex"
POKEDEX_LINK_RE = re.compile(r"^/pokedex/[a-z0-9\-]+-\d{3}$")

DEFAULT_HEADERS = {
    "User-Agent": "pokopia-grouping-data-scraper/1.0 (+local dev)",
    "Accept": "text/html,application/xhtml+xml",
}


def fetch_text(session: requests.Session, url: str, retries: int = 3, timeout: int = 30) -> str:
    """Fetch URL content with lightweight retry behavior."""
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            response = session.get(url, timeout=timeout)
            response.raise_for_status()
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
        v = normalize_text(value)
        if not v or v in seen:
            continue
        seen.add(v)
        out.append(v)
    return out


def parse_index_links(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    hrefs: list[str] = []
    seen: set[str] = set()

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not POKEDEX_LINK_RE.match(href):
            continue
        if href in seen:
            continue
        seen.add(href)
        hrefs.append(href)

    return hrefs


def extract_field_block_values(soup: BeautifulSoup, label: str) -> list[str]:
    label_node = soup.find("div", class_="detail-label", string=lambda t: t and normalize_text(t) == label)
    if not label_node:
        return []

    field_block = label_node.parent
    if field_block is None:
        return []

    tags = [normalize_text(tag.get_text(" ", strip=True)) for tag in field_block.select(".detail-tag")]
    if tags:
        return unique_keep_order(tags)

    texts = [normalize_text(s) for s in field_block.stripped_strings if normalize_text(s) != label]
    return unique_keep_order(texts)


def parse_where_to_find(soup: BeautifulSoup) -> list[dict[str, Any]]:
    title = soup.find("h2", class_="detail-card-title", string=lambda t: t and "Where to Find" in t)
    if not title:
        return []

    card = title.find_parent("div", class_="detail-card")
    if not card:
        return []

    out: list[dict[str, Any]] = []
    for subcard in card.select("div.detail-subcard"):
        habitat_title = subcard.select_one("h3.detail-subcard-title")
        habitat_text = normalize_text(habitat_title.get_text(" ", strip=True)) if habitat_title else ""

        habitat_number: int | None = None
        habitat_name = habitat_text
        match = re.search(r"#\s*(\d+)\s*(.*)", habitat_text)
        if match:
            habitat_number = int(match.group(1))
            habitat_name = normalize_text(match.group(2))

        habitat_link = subcard.select_one('a[href^="/habitats/"]')
        habitat_slug = None
        if habitat_link and habitat_link.get("href"):
            habitat_slug = habitat_link["href"].removeprefix("/habitats/")

        entry: dict[str, Any] = {
            "habitat_number": habitat_number,
            "habitat_name": habitat_name,
            "habitat_slug": habitat_slug,
            "rarity": None,
            "time": [],
            "weather": [],
        }

        for label_node in subcard.select("div.detail-label"):
            label = normalize_text(label_node.get_text(" ", strip=True))
            block = label_node.parent
            titles = unique_keep_order([
                normalize_text(el.get("title", ""))
                for el in block.select("[title]")
                if normalize_text(el.get("title", ""))
            ])

            if label == "Rarity":
                entry["rarity"] = titles[0] if titles else None
            elif label == "Time":
                entry["time"] = titles
            elif label == "Weather":
                entry["weather"] = titles

        out.append(entry)

    return out


def parse_pokemon_page(html: str, page_url: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")

    h1 = soup.find("h1", class_="detail-title")
    header = normalize_text(h1.get_text(" ", strip=True)) if h1 else ""
    number_match = re.search(r"#\s*(\d+)", header)
    dex_number = int(number_match.group(1)) if number_match else None
    name = normalize_text(re.sub(r"#\s*\d+", "", header)) if header else None

    if not name:
        title = soup.title.get_text(" ", strip=True) if soup.title else ""
        name = normalize_text(title.split(" in Pokémon Pokopia")[0]) if title else None

    specialties = extract_field_block_values(soup, "Specialties")
    ideal_habitat_values = extract_field_block_values(soup, "Ideal Habitat")
    favorites = extract_field_block_values(soup, "Favorites")

    where_to_find = parse_where_to_find(soup)

    slug = page_url.rsplit("/", 1)[-1]

    return {
        "dex_number": dex_number,
        "name": name,
        "form_slug": slug,
        "source_url": page_url,
        "specialties": specialties,
        "ideal_habitat": ideal_habitat_values[0] if ideal_habitat_values else None,
        "favorites": favorites,
        "where_to_find": where_to_find,
    }


def sort_key(entry: dict[str, Any]) -> tuple[int, str]:
    dex_number = entry.get("dex_number")
    return (int(dex_number) if isinstance(dex_number, int) else 9999, entry.get("form_slug", ""))


def compute_missing_counts(pokemon_data: list[dict[str, Any]]) -> dict[str, int]:
    return {
        "ideal_habitat": sum(1 for p in pokemon_data if not p.get("ideal_habitat")),
        "specialties": sum(1 for p in pokemon_data if not p.get("specialties")),
        "favorites": sum(1 for p in pokemon_data if not p.get("favorites")),
        "where_to_find": sum(1 for p in pokemon_data if not p.get("where_to_find")),
    }


def scrape_all(delay_seconds: float = 0.12) -> dict[str, Any]:
    session = requests.Session()
    session.headers.update(DEFAULT_HEADERS)

    index_html = fetch_text(session, POKEDEX_URL)
    links = parse_index_links(index_html)

    pokemon_data: list[dict[str, Any]] = []
    total = len(links)

    for i, rel_link in enumerate(links, start=1):
        url = f"{BASE_URL}{rel_link}"
        page_html = fetch_text(session, url)
        record = parse_pokemon_page(page_html, url)
        pokemon_data.append(record)

        if i % 25 == 0 or i == total:
            print(f"Scraped {i}/{total} pages...")

        if delay_seconds > 0:
            time.sleep(delay_seconds)

    pokemon_data.sort(key=sort_key)

    return {
        "source": {
            "name": "PokopiaDex",
            "url": POKEDEX_URL,
        },
        "scraped_at_utc": datetime.now(timezone.utc).isoformat(),
        "counts": {
            "entries": len(pokemon_data),
            "unique_dex_numbers": len({entry.get("dex_number") for entry in pokemon_data}),
            "missing": compute_missing_counts(pokemon_data),
        },
        "pokemon": pokemon_data,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape Pokopia Pokémon data from PokopiaDex")
    parser.add_argument(
        "--output",
        default="data/pokopia_pokemon.json",
        help="Output JSON path (default: data/pokopia_pokemon.json)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.12,
        help="Delay between requests in seconds (default: 0.12)",
    )
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    data = scrape_all(delay_seconds=args.delay)
    output_path.write_text(json.dumps(data, ensure_ascii=True, indent=2) + "\n")

    print(f"Wrote {data['counts']['entries']} entries to {output_path}")


if __name__ == "__main__":
    main()
