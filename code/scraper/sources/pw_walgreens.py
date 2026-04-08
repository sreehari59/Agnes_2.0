import asyncio
import random
import re
from datetime import datetime, timezone

from ..models import ProductEnrichment
from .playwright_base import PlaywrightScraper


async def scrape_walgreens_pw(scraper: PlaywrightScraper, url: str, sku: str) -> ProductEnrichment:
    page = await scraper.new_page()
    try:
        # Extract product ID — handles both prod123456 and plain numeric formats
        prod_match = re.search(r'prod(\d+)|[=-](\d{6,})', sku)
        prod_id = (prod_match.group(1) or prod_match.group(2)) if prod_match else sku.split('-')[-1]

        # Search is more reliable than the direct URL for Walgreens
        await page.goto(
            f"https://www.walgreens.com/search/results.jsp?Ntt={prod_id}",
            wait_until='networkidle', timeout=30000,
        )
        await asyncio.sleep(2 + random.random())

        first = await page.query_selector(
            '.product-card a, .product__title a, a[data-testid="product-card-link"]'
        )
        if first:
            await first.click()
            await page.wait_for_load_state('networkidle')

        await page.wait_for_selector('h1', timeout=10000)
        await asyncio.sleep(1 + random.random())

        product_name = await scraper.get_text(
            page, 'h1.product__title, h1[data-testid="product-title"], h1'
        )
        brand = await scraper.get_text(page, '.product__brand, [data-testid="brand-name"]')

        dietary_claims = await scraper.extract_dietary_claims(page)
        allergen_contains = await scraper.extract_allergen_contains(page)
        ingredients_raw = await scraper.extract_ingredients(page, [
            '[data-testid="ingredients-section"]',
        ])

        return ProductEnrichment(
            sku=sku, source='walgreens', url=page.url,
            product_name=product_name, brand=brand,
            dietary_claims=dietary_claims,
            allergen_contains=allergen_contains,
            ingredients_raw=ingredients_raw,
            scrape_timestamp=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as e:
        await scraper.screenshot(page, sku)
        return ProductEnrichment(
            sku=sku, source='walgreens', url=url,
            scrape_success=False, error_message=str(e),
            scrape_timestamp=datetime.now(timezone.utc).isoformat(),
        )
    finally:
        await page.close()
