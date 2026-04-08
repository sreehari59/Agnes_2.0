import asyncio
import re
from datetime import datetime, timezone

from ..models import ProductEnrichment
from .playwright_base import PlaywrightScraper


async def scrape_costco_pw(scraper: PlaywrightScraper, url: str, sku: str) -> ProductEnrichment:
    page = await scraper.new_page()
    try:
        product_id = re.search(r'(\d{7,})', sku)
        product_id = product_id.group(1) if product_id else sku.split('-')[-1]

        try:
            await page.goto(url, wait_until='domcontentloaded', timeout=30000)
            await scraper.wait_for_product_page(page)
        except Exception:
            await page.goto(
                f"https://www.costco.com/CatalogSearch?dept=All&keyword={product_id}",
                wait_until='domcontentloaded', timeout=30000,
            )
            await scraper.wait_for_product_page(page)

        if 'CatalogSearch' in page.url or '/search' in page.url.lower():
            first = await page.query_selector(
                '.product-tile a, a[automation-id="productDescriptionLink"], .product a[href*="product"]'
            )
            if first:
                await first.click()
                await scraper.wait_for_product_page(page)

        product_name = await scraper.get_first_text(page, [
            'h1[automation-id="productName"]',
            'h1.product-h1-container',
            'h1[itemprop="name"]',
            '.product-title h1',
            '[data-testid*="product-name"]',
            'h1',
        ], min_length=4)
        if not product_name:
            product_name = await scraper.get_json_ld_field(page, 'name')

        brand = await scraper.get_first_text(page, [
            '[itemprop="brand"]',
            'a[href*="/brand/"]',
            '.product-brand',
            '[class*="brand"]',
        ])
        if not brand:
            brand = await scraper.get_json_ld_field(page, 'brand')
        if not brand and product_name and product_name.lower().startswith('kirkland'):
            brand = 'Kirkland Signature'

        dietary_claims = []
        for text in await scraper.get_all_text_from_selectors(page, [
            '.product-info-description li',
            '[class*="features"] li',
            '.product-info li',
            '[class*="feature"] li',
            '[class*="attribute"]',
        ]):
            if any(kw in text.lower() for kw in ['gluten', 'vegan', 'organic', 'non-gmo', 'kosher', 'usp', 'vegetarian']):
                dietary_claims.append(text.strip())
        dietary_claims = list(dict.fromkeys(dietary_claims))

        await scraper.click_first_button_by_text(page, ['Ingredients', 'Supplement Facts', 'Product Details'])
        await asyncio.sleep(1)
        ingredients_raw = await scraper.get_first_text(page, [
            '#product-tab-ingredients',
            '[class*="ingredients"]',
            '[data-testid*="ingredient"]',
            '[id*="ingredient"]',
        ], min_length=20)

        allergen_contains = await scraper.extract_allergen_contains(page)
        block_reason = await scraper.detect_block(page)

        return ProductEnrichment(
            sku=sku, source='costco', url=page.url,
            product_name=product_name, brand=brand,
            dietary_claims=dietary_claims,
            allergen_contains=allergen_contains,
            ingredients_raw=ingredients_raw,
            scrape_success=bool(product_name) and not block_reason,
            error_message=f'Blocked page detected: {block_reason}' if block_reason else None,
            scrape_timestamp=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as e:
        await scraper.screenshot(page, sku)
        return ProductEnrichment(
            sku=sku, source='costco', url=url,
            scrape_success=False, error_message=str(e),
            scrape_timestamp=datetime.now(timezone.utc).isoformat(),
        )
    finally:
        await page.close()
