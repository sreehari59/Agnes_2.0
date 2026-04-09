from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup

from ..models import ProductEnrichment
from .base import BaseScraper, DEFAULT_HEADERS
from ._common import (
    extract_allergen_contains, extract_allergen_free_from,
    extract_certifications, extract_dietary_claims, extract_ingredients,
)


class VitacostScraper(BaseScraper):
    source = 'vitacost'

    async def scrape(self, url: str, sku: str) -> ProductEnrichment:
        async with httpx.AsyncClient(headers=DEFAULT_HEADERS, follow_redirects=True, timeout=15) as client:
            response = await client.get(url)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, 'lxml')
        page_text = soup.get_text(separator=' ')

        name_elem = (
            soup.select_one('h1[data-qa="product-name"]')
            or soup.select_one('h1.product-title')
            or soup.select_one('h1')
        )
        product_name = name_elem.get_text(strip=True) if name_elem else None

        brand_elem = (
            soup.select_one('[data-qa="brand-name"]')
            or soup.select_one('.brand-name')
        )
        brand = brand_elem.get_text(strip=True) if brand_elem else None

        return ProductEnrichment(
            sku=sku,
            source='vitacost',
            url=url,
            product_name=product_name,
            brand=brand,
            certifications=extract_certifications(soup),
            dietary_claims=extract_dietary_claims(page_text),
            allergen_contains=extract_allergen_contains(page_text),
            allergen_free_from=extract_allergen_free_from(page_text),
            ingredients_raw=extract_ingredients(soup, ['[data-qa="ingredients"]']),
            scrape_timestamp=datetime.now(timezone.utc).isoformat(),
        )
