from datetime import datetime, timezone

import httpx

from ..models import ProductEnrichment
from .base import BaseScraper

CERT_LABEL_MAP = {
    'en:usda-organic': 'USDA Organic',
    'en:non-gmo-project-verified': 'Non-GMO Project Verified',
    'en:vegan': 'Vegan Certified',
    'en:vegetarian': 'Vegetarian Certified',
    'en:gluten-free': 'Certified Gluten-Free',
    'en:kosher': 'Kosher',
    'en:halal': 'Halal',
    'en:fair-trade': 'Fair Trade',
}


class ThriveUPCScraper(BaseScraper):
    """Looks up Thrive Market UPC-based products via the Open Food Facts API."""
    source = 'thrive_upc'

    async def scrape(self, url: str, sku: str) -> ProductEnrichment:
        # url is "API:openfoodfacts:{upc}"
        upc = url.split(':')[-1]
        api_url = f"https://world.openfoodfacts.org/api/v2/product/{upc}.json"

        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(api_url)

        if response.status_code == 404 or response.json().get('status') != 1:
            return ProductEnrichment(
                sku=sku,
                source='thrive_upc',
                url=f"https://world.openfoodfacts.org/product/{upc}",
                scrape_success=False,
                error_message=f"UPC {upc} not found in Open Food Facts",
                scrape_timestamp=datetime.now(timezone.utc).isoformat(),
            )

        product = response.json().get('product', {})

        certifications = [
            CERT_LABEL_MAP[label]
            for label in product.get('labels_tags', [])
            if label in CERT_LABEL_MAP
        ]

        allergen_contains = [
            a.replace('en:', '').replace('-', ' ').title()
            for a in product.get('allergens_tags', [])
        ]

        return ProductEnrichment(
            sku=sku,
            source='thrive_upc',
            url=f"https://world.openfoodfacts.org/product/{upc}",
            product_name=product.get('product_name'),
            brand=product.get('brands'),
            certifications=certifications,
            dietary_claims=[],
            allergen_contains=allergen_contains,
            allergen_free_from=[],
            ingredients_raw=product.get('ingredients_text') or None,
            scrape_timestamp=datetime.now(timezone.utc).isoformat(),
        )
