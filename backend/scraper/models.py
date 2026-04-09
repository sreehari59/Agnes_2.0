from pydantic import BaseModel
from typing import Optional


class ProductEnrichment(BaseModel):
    sku: str
    source: str
    url: str

    product_name: Optional[str] = None
    brand: Optional[str] = None

    certifications: list[str] = []
    dietary_claims: list[str] = []
    allergen_contains: list[str] = []
    allergen_free_from: list[str] = []

    ingredients_raw: Optional[str] = None

    scrape_timestamp: str
    scrape_success: bool = True
    error_message: Optional[str] = None
