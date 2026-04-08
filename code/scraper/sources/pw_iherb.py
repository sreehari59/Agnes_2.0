import asyncio
import random
from datetime import datetime, timezone

from ..models import ProductEnrichment
from .playwright_base import PlaywrightScraper


async def scrape_iherb_pw(scraper: PlaywrightScraper, url: str, sku: str) -> ProductEnrichment:
    page = await scraper.new_page()
    try:
        await page.goto(url, wait_until='networkidle', timeout=30000)
        await page.wait_for_selector('h1', timeout=10000)
        await asyncio.sleep(1 + random.random())

        product_name = await scraper.get_text(
            page, 'h1[data-part="product-title"], h1.product-title, h1'
        )
        brand = await scraper.get_text(
            page, 'a[data-part="brand-link"], span.brand, a.brand-link'
        )

        # Certifications via badge images
        certifications = []
        for img in await page.query_selector_all(
            'img[class*="cert"], img[class*="badge"], .product-certifications img'
        ):
            text = await img.get_attribute('alt') or await img.get_attribute('title')
            if text and not any(s in text.lower() for s in ['star', 'rating', 'review']):
                certifications.append(text)

        dietary_claims = await scraper.extract_dietary_claims(page)
        allergen_contains = await scraper.extract_allergen_contains(page)

        ingredients_raw = await scraper.extract_ingredients(page, [
            '#product-ingredients', '.supplement-facts',
            '[data-testid="ingredients"]',
        ])

        return ProductEnrichment(
            sku=sku, source='iherb', url=url,
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
            sku=sku, source='iherb', url=url,
            scrape_success=False, error_message=str(e),
            scrape_timestamp=datetime.now(timezone.utc).isoformat(),
        )
    finally:
        await page.close()
