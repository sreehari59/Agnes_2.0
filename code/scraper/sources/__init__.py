from .amazon import AmazonScraper
from .iherb import IHerbScraper
from .target import TargetScraper
from .walmart import WalmartScraper

SCRAPERS = {
    'iherb': IHerbScraper(),
    'amazon': AmazonScraper(),
    'target': TargetScraper(),
    'walmart': WalmartScraper(),
}
