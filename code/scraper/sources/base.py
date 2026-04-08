import re
from abc import ABC, abstractmethod

from ..models import ProductEnrichment

TIER1_PATTERNS = {
    'iherb':   (r'FG-iherb-(\d+)',       lambda m: f"https://www.iherb.com/pr/p/{m.group(1)}"),
    'amazon':  (r'FG-amazon-([a-z0-9]+)', lambda m: f"https://www.amazon.com/dp/{m.group(1).upper()}"),
    'target':  (r'FG-target-a-(\d+)',     lambda m: f"https://www.target.com/p/-/A-{m.group(1)}"),
    'walmart': (r'FG-walmart-(\d+)',      lambda m: f"https://www.walmart.com/ip/{m.group(1)}"),
}


def parse_sku_to_url(sku: str) -> dict | None:
    for source, (pattern, url_builder) in TIER1_PATTERNS.items():
        match = re.match(pattern, sku, re.IGNORECASE)
        if match:
            return {
                'source': source,
                'product_id': match.group(1),
                'url': url_builder(match),
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
