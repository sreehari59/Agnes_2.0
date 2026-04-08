import asyncio
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from .db import DB_PATH, create_enrichment_table, get_finished_goods, save_enrichment
from .models import ProductEnrichment
from .sources import SCRAPERS
from .sources.base import parse_sku_to_url

OUTPUT_PATH = Path(__file__).parent / "output" / "enriched_products.json"

# Seconds to wait between requests per source
RATE_LIMITS = {
    'iherb': 1.0,
    'walmart': 1.5,
    'target': 1.5,
    'amazon': 2.0,
}


async def run():
    products = get_finished_goods()

    tier1 = []
    for p in products:
        parsed = parse_sku_to_url(p['sku'])
        if parsed:
            tier1.append({**p, **parsed})

    print(f"Found {len(tier1)} Tier 1 products across {len({p['source'] for p in tier1})} sources")

    results = []
    conn = sqlite3.connect(DB_PATH)
    create_enrichment_table(conn)

    for product in tier1:
        source = product['source']
        scraper = SCRAPERS.get(source)
        if not scraper:
            continue

        print(f"  [{source}] {product['sku']} → {product['url']}")
        try:
            enrichment = await scraper.scrape(product['url'], product['sku'])
            save_enrichment(conn, product['db_id'], enrichment)
            results.append(enrichment.model_dump())
            print(f"    ✓ {enrichment.product_name or '(no name)'}")
        except Exception as e:
            error_record = ProductEnrichment(
                sku=product['sku'],
                source=source,
                url=product['url'],
                scrape_success=False,
                error_message=str(e),
                scrape_timestamp=datetime.now(timezone.utc).isoformat(),
            )
            results.append(error_record.model_dump())
            print(f"    ✗ {e}")

        await asyncio.sleep(RATE_LIMITS.get(source, 1.0))

    conn.close()

    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(results, f, indent=2)

    success = sum(1 for r in results if r.get('scrape_success', False))
    print(f"\nDone: {success}/{len(results)} succeeded → {OUTPUT_PATH}")


if __name__ == '__main__':
    asyncio.run(run())
