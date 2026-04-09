import re
from abc import ABC, abstractmethod

from ..models import ProductEnrichment

# Ordered list of (source, pattern, url_builder) — more specific patterns first
ALL_PATTERNS = [
    # === TIER 1 ===
    ('iherb',   r'FG-iherb-(\d+)',        lambda m: f"https://www.iherb.com/pr/p/{m.group(1)}"),
    ('amazon',  r'FG-amazon-([a-z0-9]+)', lambda m: f"https://www.amazon.com/dp/{m.group(1).upper()}"),
    ('target',  r'FG-target-a-(\d+)',     lambda m: f"https://www.target.com/p/-/A-{m.group(1)}"),
    ('walmart', r'FG-walmart-(\d+)',      lambda m: f"https://www.walmart.com/ip/{m.group(1)}"),

    # === TIER 2 ===
    ('vitamin_shoppe', r'FG-the-vitamin-shoppe-([a-z]{2}-\d+)',
     lambda m: f"https://www.vitaminshoppe.com/p/{m.group(1)}"),

    # Walgreens prod-prefixed IDs
    ('walgreens', r'FG-walgreens-(prod\d+)',
     lambda m: f"https://www.walgreens.com/store/c/product/ID={m.group(1)}-product"),

    # Walgreens plain numeric IDs
    ('walgreens', r'FG-walgreens-(\d+)$',
     lambda m: f"https://www.walgreens.com/store/c/product/ID={m.group(1)}-product"),

    ('vitacost', r'FG-vitacost-(.+)',
     lambda m: f"https://www.vitacost.com/products/{m.group(1)}"),

    ('cvs', r'FG-cvs-(\d+)',
     lambda m: f"https://www.cvs.com/shop/productid-{m.group(1)}"),

    ('costco', r'FG-costco-(\d+)',
     lambda m: f"https://www.costco.com/.product.{m.group(1)}.html"),

    ('sams_club', r'FG-sams-club-(prod\d+)',
     lambda m: f"https://www.samsclub.com/p/{m.group(1)}"),

    ('sams_club', r'FG-sams-club-(p\d+)',
     lambda m: f"https://www.samsclub.com/p/{m.group(1)}"),

    ('gnc', r'FG-gnc-(\d+)',
     lambda m: f"https://www.gnc.com/products/{m.group(1)}.html"),

    # Thrive Market — UPC (12-13 digits) → Open Food Facts API
    ('thrive_upc', r'FG-thrive-market-(\d{12,13})$',
     lambda m: f"API:openfoodfacts:{m.group(1)}"),

    # Thrive Market — slug → search not yet implemented
    ('thrive_slug', r'FG-thrive-market-([a-z].+)',
     lambda m: f"SEARCH:thrivemarket:{m.group(1)}"),
]


def parse_sku_to_url(sku: str) -> dict | None:
    for source, pattern, url_builder in ALL_PATTERNS:
        match = re.match(pattern, sku, re.IGNORECASE)
        if match:
            url = url_builder(match)
            return {
                'source': source,
                'product_id': match.group(1),
                'url': url,
                'requires_api': url.startswith('API:'),
                'requires_search': url.startswith('SEARCH:'),
            }
    return None


DEFAULT_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    ),
    'Accept-Language': 'en-US,en;q=0.9',
}


class BaseScraper(ABC):
    source: str

    @abstractmethod
    async def scrape(self, url: str, sku: str) -> ProductEnrichment:
        ...
