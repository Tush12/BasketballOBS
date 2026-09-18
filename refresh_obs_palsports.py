from __future__ import annotations

import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urljoin, urlparse

import requests
from bs4 import BeautifulSoup


# ============================================================
# OBS / PAL SPORTS REFRESH SCRAPER
# ============================================================

BASE_URL = "https://obs.palsports.net/"
LEAGUE_ID = 1
SEASON_ID = 1

# Current imported PAL state in Supabase as of this refresh script.
# These are only used for the end-of-run summary. The scraper still
# re-reads old pages so corrections on PAL Sports are captured too.
PREVIOUS_MAX_GAME_ID = 48
PREVIOUS_MAX_PLAYER_ID = 174

OUTPUT_FILE = Path("basketball_scraped_data_refresh.json")

REQUEST_DELAY_SECONDS = 0.20
TIMEOUT_SECONDS = 30

session = requests.Session()
session.headers.update(
    {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/153.0 Safari/537.36 "
            "OBS-Basketball-Data-Refresh/1.0"
        ),
        "Accept-Language": "en-US,en;q=0.9,zh-HK;q=0.8",
    }
)


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def normalize_url(href: str | None) -> str | None:
    if not href:
        return None

    href = href.strip()

    if not href or href.startswith("#") or href.startswith("javascript:"):
        return None

    absolute = urljoin(BASE_URL, href)

    parsed = urlparse(absolute)

    # Only keep PAL Sports URLs.
    if parsed.netloc.lower() != urlparse(BASE_URL).netloc.lower():
        return None

    return absolute


def extract_numeric_query_id(url: str, key: str = "id") -> int | None:
    try:
        values = parse_qs(urlparse(url).query).get(key)
        if not values:
            return None

        return int(values[0])
    except (TypeError, ValueError):
        return None


def fetch(url: str) -> str:
    print(f"GET {url}")

    response = session.get(
        url,
        timeout=TIMEOUT_SECONDS,
    )

    response.raise_for_status()

    # PAL pages are normally UTF-8, but requests can guess incorrectly.
    if not response.encoding or response.encoding.lower() == "iso-8859-1":
        response.encoding = response.apparent_encoding or "utf-8"

    time.sleep(REQUEST_DELAY_SECONDS)

    return response.text


def parse_table(table) -> list[dict[str, str]]:
    rows = table.find_all("tr")

    if not rows:
        return []

    parsed_rows: list[list[str]] = []

    for tr in rows:
        cells = tr.find_all(["th", "td"])

        if not cells:
            continue

        parsed_rows.append(
            [
                clean_text(cell.get_text(" ", strip=True))
                for cell in cells
            ]
        )

    if not parsed_rows:
        return []

    # Prefer explicit TH row as header.
    first_tr = rows[0]
    explicit_header = bool(first_tr.find_all("th"))

    if explicit_header:
        headers = parsed_rows[0]
        data_rows = parsed_rows[1:]
    else:
        # If the first row looks like a header, use it.
        first = parsed_rows[0]

        looks_like_header = any(
            re.search(
                r"(日期|時間|主隊|客隊|地點|NO\.?|NAME|TEAM|PTS?|REB|AST|STL|BLK|TO|PF|EFF|聯賽|球隊)",
                cell,
                re.I,
            )
            for cell in first
        )

        if looks_like_header:
            headers = first
            data_rows = parsed_rows[1:]
        else:
            max_cols = max(len(row) for row in parsed_rows)
            headers = [str(i) for i in range(max_cols)]
            data_rows = parsed_rows

    # Make empty/duplicate headers safe.
    safe_headers: list[str] = []
    seen: dict[str, int] = {}

    for idx, header in enumerate(headers):
        base = header or str(idx)
        count = seen.get(base, 0)
        seen[base] = count + 1

        safe_headers.append(
            base if count == 0 else f"{base}_{count + 1}"
        )

    result: list[dict[str, str]] = []

    for row in data_rows:
        item: dict[str, str] = {}

        for idx, value in enumerate(row):
            key = safe_headers[idx] if idx < len(safe_headers) else str(idx)
            item[key] = value

        if any(value for value in item.values()):
            result.append(item)

    return result


def parse_page(url: str, html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")

    title = clean_text(soup.title.get_text(" ", strip=True)) if soup.title else ""

    links: list[dict[str, str]] = []
    seen_links: set[tuple[str, str]] = set()

    for anchor in soup.find_all("a"):
        href = normalize_url(anchor.get("href"))

        if not href:
            continue

        text = clean_text(anchor.get_text(" ", strip=True))
        key = (text, href)

        if key in seen_links:
            continue

        seen_links.add(key)

        links.append(
            {
                "text": text,
                "href": href,
            }
        )

    tables: list[list[dict[str, str]]] = []

    for table in soup.find_all("table"):
        parsed = parse_table(table)

        if parsed:
            tables.append(parsed)

    return {
        "url": url,
        "title": title,
        "text": clean_text(soup.get_text(" ", strip=True)),
        "links": links,
        "tables": tables,
    }


def discover_links(
    page: dict[str, Any],
    filename: str,
) -> dict[int, str]:
    found: dict[int, str] = {}

    for link in page.get("links", []):
        href = link.get("href", "")

        if f"/{filename}" not in href and not href.startswith(
            urljoin(BASE_URL, filename)
        ):
            continue

        source_id = extract_numeric_query_id(href)

        if source_id is not None:
            found[source_id] = href

    return found


def scrape_one(url: str) -> dict[str, Any]:
    html = fetch(url)
    return parse_page(url, html)


def main() -> None:
    print("=" * 72)
    print("OBS / PAL SPORTS DATA REFRESH")
    print("=" * 72)
    print()

    seed_urls = [
        BASE_URL,
        urljoin(
            BASE_URL,
            f"?season={SEASON_ID}&league={LEAGUE_ID}",
        ),
        urljoin(
            BASE_URL,
            f"schedule.php?league={LEAGUE_ID}&club=all&team=all",
        ),
        urljoin(
            BASE_URL,
            f"schedule.php?club={SEASON_ID}&league={LEAGUE_ID}",
        ),
        urljoin(
            BASE_URL,
            f"all_statistic.php?league={LEAGUE_ID}",
        ),
    ]

    seed_pages: list[dict[str, Any]] = []

    team_urls: dict[int, str] = {}
    match_urls: dict[int, str] = {}
    player_urls: dict[int, str] = {}

    # --------------------------------------------------------
    # 1. DISCOVERY PAGES
    # --------------------------------------------------------

    for url in seed_urls:
        try:
            page = scrape_one(url)
            seed_pages.append(page)

            team_urls.update(
                discover_links(
                    page,
                    "team.php",
                )
            )

            match_urls.update(
                discover_links(
                    page,
                    "match.php",
                )
            )

            player_urls.update(
                discover_links(
                    page,
                    "player.php",
                )
            )

        except Exception as exc:
            print(f"WARNING: discovery page failed: {url}")
            print(f"         {exc}")

    print()
    print(
        f"Discovery found {len(team_urls)} teams, "
        f"{len(match_urls)} matches and {len(player_urls)} players."
    )
    print()

    # --------------------------------------------------------
    # 2. TEAM PAGES
    #    Team pages are important because they reveal players
    #    and match links that may not be on the main page.
    # --------------------------------------------------------

    teams: list[dict[str, Any]] = []

    for source_team_id in sorted(team_urls):
        url = team_urls[source_team_id]

        try:
            page = scrape_one(url)

            teams.append(
                {
                    "source_team_id": source_team_id,
                    "page": page,
                }
            )

            match_urls.update(
                discover_links(
                    page,
                    "match.php",
                )
            )

            player_urls.update(
                discover_links(
                    page,
                    "player.php",
                )
            )

        except Exception as exc:
            print(
                f"WARNING: team {source_team_id} failed: {exc}"
            )

    print()
    print(
        f"After team crawl: {len(match_urls)} match links, "
        f"{len(player_urls)} player links."
    )
    print()

    # --------------------------------------------------------
    # 3. MATCH PAGES
    # --------------------------------------------------------

    matches: list[dict[str, Any]] = []

    for source_match_id in sorted(match_urls):
        url = match_urls[source_match_id]

        try:
            page = scrape_one(url)

            matches.append(
                {
                    "source_match_id": source_match_id,
                    "page": page,
                }
            )

            # Match pages can reveal player records too.
            player_urls.update(
                discover_links(
                    page,
                    "player.php",
                )
            )

            # They can also reveal a team link missed during discovery.
            team_urls.update(
                discover_links(
                    page,
                    "team.php",
                )
            )

        except Exception as exc:
            print(
                f"WARNING: match {source_match_id} failed: {exc}"
            )

    print()
    print(
        f"After match crawl: {len(player_urls)} player links."
    )
    print()

    # --------------------------------------------------------
    # 4. PLAYER PAGES
    # --------------------------------------------------------

    players: list[dict[str, Any]] = []

    for source_player_id in sorted(player_urls):
        url = player_urls[source_player_id]

        try:
            page = scrape_one(url)

            players.append(
                {
                    "source_player_id": source_player_id,
                    "page": page,
                }
            )

        except Exception as exc:
            print(
                f"WARNING: player {source_player_id} failed: {exc}"
            )

    # --------------------------------------------------------
    # 5. SUMMARY
    # --------------------------------------------------------

    scraped_match_ids = sorted(
        row["source_match_id"]
        for row in matches
    )

    scraped_player_ids = sorted(
        row["source_player_id"]
        for row in players
    )

    new_match_ids = [
        value
        for value in scraped_match_ids
        if value > PREVIOUS_MAX_GAME_ID
    ]

    new_player_ids = [
        value
        for value in scraped_player_ids
        if value > PREVIOUS_MAX_PLAYER_ID
    ]

    output = {
        "metadata": {
            "scraped_at_utc": datetime.now(timezone.utc).isoformat(),
            "base_url": BASE_URL,
            "league_id": LEAGUE_ID,
            "season_id": SEASON_ID,
            "previous_supabase_state": {
                "max_source_game_id": PREVIOUS_MAX_GAME_ID,
                "max_source_player_id": PREVIOUS_MAX_PLAYER_ID,
            },
            "counts": {
                "seed_pages": len(seed_pages),
                "teams": len(teams),
                "matches": len(matches),
                "players": len(players),
            },
            "new_source_ids": {
                "matches_above_previous_max": new_match_ids,
                "players_above_previous_max": new_player_ids,
            },
        },
        "seed_pages": seed_pages,
        "teams": teams,
        "matches": matches,
        "players": players,
    }

    OUTPUT_FILE.write_text(
        json.dumps(
            output,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print()
    print("=" * 72)
    print("REFRESH COMPLETE")
    print("=" * 72)
    print(f"Output: {OUTPUT_FILE.resolve()}")
    print(f"Teams scraped:   {len(teams)}")
    print(f"Matches scraped: {len(matches)}")
    print(f"Players scraped: {len(players)}")
    print()

    if new_match_ids:
        print(
            "New match IDs above current Supabase maximum "
            f"({PREVIOUS_MAX_GAME_ID}): "
            + ", ".join(map(str, new_match_ids))
        )
    else:
        print(
            "No match IDs above the current Supabase maximum "
            f"({PREVIOUS_MAX_GAME_ID}) were discovered."
        )

    if new_player_ids:
        print(
            "New player IDs above current Supabase maximum "
            f"({PREVIOUS_MAX_PLAYER_ID}): "
            + ", ".join(map(str, new_player_ids))
        )
    else:
        print(
            "No player IDs above the current Supabase maximum "
            f"({PREVIOUS_MAX_PLAYER_ID}) were discovered."
        )

    print()
    print(
        "IMPORTANT: This script does NOT modify Supabase. "
        "Upload basketball_scraped_data_refresh.json back to ChatGPT "
        "and we can compare/import the changes safely."
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nCancelled.")
        sys.exit(130)
    except Exception as exc:
        print("\nSCRAPE FAILED")
        print(exc)
        sys.exit(1)
