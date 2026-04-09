import asyncio
from datetime import datetime, timezone

from ..models import ProductEnrichment
from .playwright_base import PlaywrightScraper


async def scrape_cvs_pw(scraper: PlaywrightScraper, url: str, sku: str) -> ProductEnrichment:
    page = await scraper.new_page()
    try:
        await page.goto(url, wait_until='domcontentloaded', timeout=30000)
        await scraper.wait_for_product_page(page)

        # If redirected to search, click first result
        if '/search' in page.url:
            await page.wait_for_selector('.product-card, .css-1dbjc4n', timeout=10000)
            first = await page.query_selector('.product-card a, [data-testid="productCard"] a')
            if first:
                await first.click()
                await scraper.wait_for_product_page(page)

        product_name = await scraper.get_first_text(page, [
            'h1[data-testid="product_title"]',
            '[data-testid="product-title"]',
            'h1.css-1fjj7qj',
            'h1[class*="ProductTitle"]',
            '[itemprop="name"]',
            'h1',
        ], min_length=4)
        if not product_name:
            product_name = await scraper.get_json_ld_field(page, 'name')

        brand = await scraper.get_first_text(page, [
            '[data-testid="product-brand"]',
            'a[class*="brand"]',
            'span[class*="brand"]',
            '[itemprop="brand"]',
            '[class*="brand"] a',
        ])
        if not brand:
            brand = await scraper.get_json_ld_field(page, 'brand')

        dietary_claims = []
        for text in await scraper.get_all_text_from_selectors(page, [
            '[data-testid="product-features"] li',
            '.product-details li',
            '[class*="ProductDetails"] li',
            '[class*="features"] span',
            '[class*="feature"] li',
            '[class*="attribute"]',
            '[class*="badge"]',
        ]):
            if any(kw in text.lower() for kw in ['gluten', 'vegan', 'organic', 'non-gmo', 'kosher', 'dairy', 'vegetarian']):
                dietary_claims.append(text.strip())
        dietary_claims = list(dict.fromkeys(dietary_claims))

        ingredients_raw = None
        await scraper.click_first_button_by_text(page, ['Ingredients', 'Product details', 'Details'])
        await asyncio.sleep(1)
        ingredients_raw = await scraper.get_first_text(page, [
            '[data-testid="ingredients-content"]',
            '#ingredients',
            '[class*="Ingredients"] p',
            'div[class*="ingredients"]',
            '[class*="ingredient"]',
            '[data-testid*="ingredient"]',
        ], min_length=20)

        allergen_contains = await scraper.extract_allergen_contains(page)
        block_reason = await scraper.detect_block(page)

        return ProductEnrichment(
            sku=sku, source='cvs', url=page.url,
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
            sku=sku, source='cvs', url=url,
            scrape_success=False, error_message=str(e),
            scrape_timestamp=datetime.now(timezone.utc).isoformat(),
        )
    finally:
        await page.close()
