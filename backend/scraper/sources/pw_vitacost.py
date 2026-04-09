import asyncio
import random
from datetime import datetime, timezone

from ..models import ProductEnrichment
from .playwright_base import PlaywrightScraper


async def scrape_vitacost_pw(scraper: PlaywrightScraper, url: str, sku: str) -> ProductEnrichment:
    page = await scraper.new_page()
    try:
        # Try /products/{slug} then /{slug} as fallback
        slug = url.split('/products/')[-1]
        fallback_urls = [url, f"https://www.vitacost.com/{slug}"]

        final_url = url
        for try_url in fallback_urls:
            resp = await page.goto(try_url, wait_until='networkidle', timeout=30000)
            if resp and resp.status == 200 and await page.query_selector('h1'):
                final_url = page.url
                break

        await asyncio.sleep(1 + random.random())

        product_name = await scraper.get_text(
            page, 'h1[data-qa="product-name"], h1.product-name, h1[itemprop="name"], h1'
        )
        brand = await scraper.get_text(
            page, '[data-qa="brand-name"], .product-brand a, span[itemprop="brand"]'
        )

        dietary_claims = await scraper.extract_dietary_claims(page)
        allergen_contains = await scraper.extract_allergen_contains(page)
        ingredients_raw = await scraper.extract_ingredients(page, [
            '#ingredients', '.ingredients-panel', '[data-section="ingredients"]',
        ])

        return ProductEnrichment(
            sku=sku, source='vitacost', url=final_url,
            product_name=product_name, brand=brand,
            dietary_claims=dietary_claims,
            allergen_contains=allergen_contains,
            ingredients_raw=ingredients_raw,
            scrape_timestamp=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as e:
        await scraper.screenshot(page, sku)
        return ProductEnrichment(
            sku=sku, source='vitacost', url=url,
            scrape_success=False, error_message=str(e),
            scrape_timestamp=datetime.now(timezone.utc).isoformat(),
        )
    finally:
        await page.close()
