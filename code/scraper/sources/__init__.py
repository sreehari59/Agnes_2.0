from .amazon import AmazonScraper
from .costco import CostcoScraper
from .cvs import CVSScraper
from .gnc import GNCScraper
from .iherb import IHerbScraper
from .sams_club import SamsClubScraper
from .target import TargetScraper
from .thrive import ThriveUPCScraper
from .vitacost import VitacostScraper
from .vitamin_shoppe import VitaminShoppeScraper
from .walgreens import WalgreensScraper
from .walmart import WalmartScraper

SCRAPERS = {
    # Tier 1
    'iherb': IHerbScraper(),
    'amazon': AmazonScraper(),
    'target': TargetScraper(),
    'walmart': WalmartScraper(),
    # Tier 2
    'vitamin_shoppe': VitaminShoppeScraper(),
    'walgreens': WalgreensScraper(),
    'vitacost': VitacostScraper(),
    'cvs': CVSScraper(),
    'costco': CostcoScraper(),
    'sams_club': SamsClubScraper(),
    'gnc': GNCScraper(),
    'thrive_upc': ThriveUPCScraper(),
}
