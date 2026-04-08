import asyncio
import random
import re
from datetime import datetime, timezone

from ..models import ProductEnrichment
from .playwright_base import PlaywrightScraper


async def scrape_vitamin_shoppe_pw(scraper: PlaywrightScraper, url: str, sku: str) -> ProductEnrichment:
    page = await scraper.new_page()
    try:
        await page.goto(url, wait_until='networkidle', timeout=30000)
        await page.wait_for_selector('h1', timeout=10000)
        await asyncio.sleep(1 + random.random())

        product_name = await scraper.get_text(
            page, 'h1.product-name, h1[data-testid="product-title"], h1'
        )
        brand = await scraper.get_text(
            page, '.brand-name a, a[data-testid="brand-link"], .product-brand'
        )

        certifications = [
            c for c in await scraper.get_all_text(page, '.product-badges span, .certification-badge')
            if not any(s in c.lower() for s in ['star', 'review', 'best seller'])
        ]

        dietary_claims = await scraper.extract_dietary_claims(page)
        allergen_contains = await scraper.extract_allergen_contains(page)
        ingredients_raw = await scraper.extract_ingredients(page, [
            '#ingredients', '.ingredients-section', '[data-testid="ingredients"]',
        ])

        return ProductEnrichment(
            sku=sku, source='vitamin_shoppe', url=url,
            product_name=product_name, brand=brand,
            certifications=certifications,
            dietary_claims=dietary_claims,
            allergen_contains=allergen_contains,
            ingredients_raw=ingredients_raw,
            scrape_timestamp=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as e:
        await scraper.screenshot(page, sku)
        return ProductEnrichment(
            sku=sku, source='vitamin_shoppe', url=url,
            scrape_success=False, error_message=str(e),
            scrape_timestamp=datetime.now(timezone.utc).isoformat(),
        )
    finally:
        await page.close()
