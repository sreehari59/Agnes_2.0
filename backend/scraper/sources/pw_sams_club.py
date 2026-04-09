import asyncio
import re
from datetime import datetime, timezone

from ..models import ProductEnrichment
from .playwright_base import PlaywrightScraper


async def scrape_sams_club_pw(scraper: PlaywrightScraper, url: str, sku: str) -> ProductEnrichment:
    page = await scraper.new_page()
    try:
        prod_match = re.search(r'prod(\d+)|[- ](p\d+)', sku)
        product_id = prod_match.group(1) or prod_match.group(2) if prod_match else sku.split('-')[-1]

        await page.goto(
            f"https://www.samsclub.com/p/{product_id}",
            wait_until='domcontentloaded', timeout=30000,
        )
        await scraper.wait_for_product_page(page)

        # Fall back to search if redirected away from a product page
        if '/search' in page.url or 'error' in page.url.lower():
            await page.goto(
                f"https://www.samsclub.com/s/{product_id}",
                wait_until='domcontentloaded', timeout=30000,
            )
            await scraper.wait_for_product_page(page)
            first = await page.query_selector('[data-testid="productCard"] a, .sc-product-card a')
            if first:
                await first.click()
                await scraper.wait_for_product_page(page)

        product_name = await scraper.get_first_text(page, [
            'h1[data-testid="product-title"]',
            'h1.sc-pc-title-full-desktop',
            '.sc-product-header h1',
            'h1[class*="ProductTitle"]',
            '[itemprop="name"]',
            'h1',
        ], min_length=4)
        if not product_name:
            product_name = await scraper.get_json_ld_field(page, 'name')

        brand = await scraper.get_first_text(page, [
            '[data-testid="product-brand"]',
            'a[class*="brand"]',
            '.sc-product-brand',
            '[class*="brand"]',
        ])
        if not brand:
            brand = await scraper.get_json_ld_field(page, 'brand')
        if not brand and product_name and "member" in product_name.lower() and "mark" in product_name.lower():
            brand = "Member's Mark"

        dietary_claims = []
        for text in await scraper.get_all_text_from_selectors(page, [
            '[data-testid="product-features"] li',
            '.sc-product-features li',
            '[class*="features"] span',
            '[class*="feature"] li',
            '[class*="attribute"]',
            '[class*="badge"]',
        ]):
            if any(kw in text.lower() for kw in ['gluten', 'vegan', 'organic', 'non-gmo', 'kosher', 'usp', 'vegetarian']):
                dietary_claims.append(text.strip())
        dietary_claims = list(dict.fromkeys(dietary_claims))

        await scraper.click_first_button_by_text(page, ['Ingredients', 'Product details', 'Details'])
        await asyncio.sleep(1)
        ingredients_raw = await scraper.get_first_text(page, [
            '[data-testid="ingredients-panel"]',
            '#ingredients',
            '[class*="Ingredients"]',
            '[class*="ingredient"]',
            '[data-testid*="ingredient"]',
        ], min_length=20)

        allergen_contains = await scraper.extract_allergen_contains(page)
        block_reason = await scraper.detect_block(page)

        return ProductEnrichment(
            sku=sku, source='sams_club', url=page.url,
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
            sku=sku, source='sams_club', url=url,
            scrape_success=False, error_message=str(e),
            scrape_timestamp=datetime.now(timezone.utc).isoformat(),
        )
    finally:
        await page.close()
