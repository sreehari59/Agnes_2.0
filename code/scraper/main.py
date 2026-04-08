import asyncio
import json
import random
import sqlite3
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import httpx

from .db import DB_PATH, create_enrichment_table, get_finished_goods, save_enrichment
from .models import ProductEnrichment
from .sources import SCRAPERS
from .sources.base import parse_sku_to_url
from .sources.playwright_base import PlaywrightScraper
from .sources.pw_costco import scrape_costco_pw
from .sources.pw_cvs import scrape_cvs_pw
from .sources.pw_iherb import scrape_iherb_pw
from .sources.pw_vitacost import scrape_vitacost_pw
from .sources.pw_vitamin_shoppe import scrape_vitamin_shoppe_pw
from .sources.pw_sams_club import scrape_sams_club_pw
from .sources.pw_walgreens import scrape_walgreens_pw

OUTPUT_PATH = Path(__file__).parent / "output" / "enriched_products.json"

RATE_LIMITS = {
    'iherb': 1.0,
    'walmart': 1.5,
    'target': 1.5,
    'amazon': 2.0,
    'vitamin_shoppe': 1.0,
    'walgreens': 1.5,
    'vitacost': 1.0,
    'cvs': 1.5,
    'costco': 2.0,
    'sams_club': 2.0,
    'gnc': 1.0,
    'thrive_upc': 0.5,
}

PW_SCRAPERS = {
    'iherb': scrape_iherb_pw,
    'vitamin_shoppe': scrape_vitamin_shoppe_pw,
    'vitacost': scrape_vitacost_pw,
    'cvs': scrape_cvs_pw,
    'costco': scrape_costco_pw,
    'sams_club': scrape_sams_club_pw,
    'walgreens': scrape_walgreens_pw,
}

PW_DELAYS = {
    'iherb': (1.5, 3.0),
    'vitamin_shoppe': (1.5, 3.0),
    'vitacost': (1.5, 3.0),
    'cvs': (2.0, 4.0),
    'costco': (2.0, 4.0),
    'sams_club': (2.0, 4.0),
    'walgreens': (2.0, 5.0),
}


def _is_blocked(exc: Exception) -> bool:
    """Return True if the exception looks like an anti-bot block."""
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in (403, 429, 503)
    return False


async def run(headless: bool = True):
    products = get_finished_goods()

    parseable = []
    skipped = []
    for p in products:
        parsed = parse_sku_to_url(p['sku'])
        if parsed:
            parseable.append({**p, **parsed})
        else:
            skipped.append(p['sku'])

    source_counts = Counter(p['source'] for p in parseable)
    print(f"Products matched: {len(parseable)}  |  unmatched: {len(skipped)}")
    for source, count in source_counts.most_common():
        print(f"  {source}: {count}")
    if skipped:
        print(f"  (unmatched SKUs: {skipped})")

    # Lazily start Playwright only if we actually need it
    browser: PlaywrightScraper | None = None

    async def get_browser() -> PlaywrightScraper:
        nonlocal browser
        if browser is None:
            print("  → Starting Playwright browser...")
            browser = PlaywrightScraper(headless=headless)
            await browser.start()
        return browser

    results = []
    conn = sqlite3.connect(DB_PATH)
    create_enrichment_table(conn)

    for i, product in enumerate(parseable, 1):
        source = product['source']
        sku = product['sku']
        url = product['url']

        print(f"[{i}/{len(parseable)}] [{source}] {sku}")

        if product.get('requires_search'):
            results.append(ProductEnrichment(
                sku=sku, source=source, url=url,
                scrape_success=False,
                error_message="Search-based lookup not implemented",
                scrape_timestamp=datetime.now(timezone.utc).isoformat(),
            ).model_dump())
            print(f"  ⚠ skipped (search not implemented)")
            continue

        scraper = SCRAPERS.get(source)
        if not scraper:
            results.append(ProductEnrichment(
                sku=sku, source=source, url=url,
                scrape_success=False,
                error_message=f"No scraper for source: {source}",
                scrape_timestamp=datetime.now(timezone.utc).isoformat(),
            ).model_dump())
            print(f"  ⚠ no scraper registered")
            continue

        enrichment = None
        try:
            enrichment = await scraper.scrape(url, sku)
            print(f"  ✓ {enrichment.product_name or '(no name)'}")
        except Exception as e:
            if _is_blocked(e) and source in PW_SCRAPERS:
                print(f"  ✗ blocked ({e}) → retrying with Playwright")
                try:
                    pw = await get_browser()
                    pw_fn = PW_SCRAPERS[source]
                    enrichment = await pw_fn(pw, url, sku)
                    lo, hi = PW_DELAYS.get(source, (1.5, 3.0))
                    await asyncio.sleep(lo + random.random() * (hi - lo))
                    if enrichment.scrape_success:
                        print(f"  ✓ (pw) {enrichment.product_name or '(no name)'}")
                    else:
                        print(f"  ✗ (pw) {enrichment.error_message}")
                except Exception as pw_e:
                    enrichment = ProductEnrichment(
                        sku=sku, source=source, url=url,
                        scrape_success=False,
                        error_message=f"httpx: {e} | playwright: {pw_e}",
                        scrape_timestamp=datetime.now(timezone.utc).isoformat(),
                    )
                    print(f"  ✗ (pw) {pw_e}")
            else:
                enrichment = ProductEnrichment(
                    sku=sku, source=source, url=url,
                    scrape_success=False,
                    error_message=str(e),
                    scrape_timestamp=datetime.now(timezone.utc).isoformat(),
                )
                print(f"  ✗ {e}")

        if enrichment.scrape_success:
            save_enrichment(conn, product['db_id'], enrichment)
        results.append(enrichment.model_dump())

        await asyncio.sleep(RATE_LIMITS.get(source, 1.0))

    if browser:
        await browser.stop()

    conn.close()

    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(results, f, indent=2)

    success = sum(1 for r in results if r.get('scrape_success', True))
    print(f"\nDone: {success}/{len(results)} succeeded → {OUTPUT_PATH}")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--visible', action='store_true', help='Run browser in visible mode for debugging')
    args = parser.parse_args()
    asyncio.run(run(headless=not args.visible))
