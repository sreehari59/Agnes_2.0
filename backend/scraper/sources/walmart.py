import re
from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup

from ..models import ProductEnrichment
from .base import BaseScraper, DEFAULT_HEADERS

DIETARY_KEYWORDS = [
    'vegan', 'vegetarian', 'gluten-free', 'gluten free',
    'kosher', 'halal', 'organic', 'non-gmo', 'dairy-free', 'dairy free',
]


class WalmartScraper(BaseScraper):
    source = 'walmart'

    async def scrape(self, url: str, sku: str) -> ProductEnrichment:
        async with httpx.AsyncClient(headers=DEFAULT_HEADERS, follow_redirects=True, timeout=15) as client:
            response = await client.get(url)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, 'lxml')
        page_text = soup.get_text(separator=' ')

        # Product name
        name_elem = soup.select_one('h1[itemprop="name"]') or soup.select_one('h1')
        product_name = name_elem.get_text(strip=True) if name_elem else None

        # Brand
        brand_elem = soup.select_one('[itemprop="brand"]') or soup.select_one('.prod-brandName')
        brand = brand_elem.get_text(strip=True) if brand_elem else None

        # Certifications
        certifications = []
        for badge in soup.select('[class*="cert"], [class*="badge"], [class*="claim"]'):
            text = badge.get('alt') or badge.get('title') or badge.get_text(strip=True)
            if text and len(text) < 80:
                certifications.append(text.strip())
        certifications = list(dict.fromkeys(certifications))

        # Dietary claims
        page_lower = page_text.lower()
        dietary_claims = [kw.title() for kw in DIETARY_KEYWORDS if kw in page_lower]
        dietary_claims = list(dict.fromkeys(dietary_claims))

        # Allergens
        allergen_contains = []
        match = re.search(r'contains[:\s]+([^.;\n]+)', page_text, re.IGNORECASE)
        if match:
            allergen_contains = [a.strip().rstrip(',') for a in match.group(1).split(',') if a.strip()]

        # Free-from
        allergen_free_from = []
        free_matches = re.findall(r'(\w[\w\s-]+?)-?free\b', page_text, re.IGNORECASE)
        known_allergens = {'gluten', 'dairy', 'soy', 'nuts', 'peanut', 'wheat', 'egg', 'shellfish', 'lactose'}
        for m in free_matches:
            candidate = m.strip().lower()
            if any(allergen in candidate for allergen in known_allergens):
                allergen_free_from.append(m.strip().title())
        allergen_free_from = list(dict.fromkeys(allergen_free_from))

        # Ingredients
        ingredients_raw = None
        ing_heading = soup.find(string=re.compile(r'\bingredients\b', re.I))
        if ing_heading:
            parent = ing_heading.find_parent(['div', 'section', 'p', 'li'])
            if parent:
                ingredients_raw = parent.get_text(separator=' ', strip=True)

        return ProductEnrichment(
            sku=sku,
            source='walmart',
            url=url,
            product_name=product_name,
            brand=brand,
            certifications=certifications,
            dietary_claims=dietary_claims,
            allergen_contains=allergen_contains,
            allergen_free_from=allergen_free_from,
            ingredients_raw=ingredients_raw,
            scrape_timestamp=datetime.now(timezone.utc).isoformat(),
        )
