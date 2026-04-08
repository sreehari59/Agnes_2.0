"""Shared parsing helpers reused across Tier 2 scrapers."""
import re
from typing import Optional

from bs4 import BeautifulSoup

DIETARY_KEYWORDS = [
    'vegan', 'vegetarian', 'gluten-free', 'gluten free',
    'kosher', 'halal', 'organic', 'non-gmo', 'dairy-free', 'dairy free',
]

KNOWN_ALLERGENS = {'gluten', 'dairy', 'soy', 'nuts', 'peanut', 'wheat', 'egg', 'shellfish', 'lactose'}


def extract_dietary_claims(page_text: str) -> list[str]:
    lower = page_text.lower()
    seen = []
    for kw in DIETARY_KEYWORDS:
        if kw in lower and kw.title() not in seen:
            seen.append(kw.title())
    return seen


def extract_allergen_contains(page_text: str) -> list[str]:
    match = re.search(r'contains[:\s]+([^.;\n]+)', page_text, re.IGNORECASE)
    if match:
        return [a.strip().rstrip(',') for a in match.group(1).split(',') if a.strip()]
    return []


def extract_allergen_free_from(page_text: str) -> list[str]:
    free_matches = re.findall(r'(\w[\w\s-]+?)-?free\b', page_text, re.IGNORECASE)
    results = []
    for m in free_matches:
        if any(allergen in m.lower() for allergen in KNOWN_ALLERGENS):
            title = m.strip().title()
            if title not in results:
                results.append(title)
    return results


def extract_ingredients(soup: BeautifulSoup, extra_selectors: list[str] | None = None) -> Optional[str]:
    selectors = (extra_selectors or []) + [
        '.ingredients', '#ingredients', '[data-testid="ingredients"]',
        '[class*="ingredient"]',
    ]
    for sel in selectors:
        elem = soup.select_one(sel)
        if elem:
            return elem.get_text(separator=' ', strip=True)

    # Fallback: heading search
    heading = soup.find(string=re.compile(r'\bingredients\b', re.I))
    if heading:
        parent = heading.find_parent(['div', 'section', 'p', 'li'])
        if parent:
            return parent.get_text(separator=' ', strip=True)
    return None


def extract_certifications(soup: BeautifulSoup, selectors: list[str] | None = None) -> list[str]:
    default = ['[class*="cert"]', '[class*="badge"]', '[class*="claim"]']
    results = []
    for sel in (selectors or default):
        for elem in soup.select(sel):
            text = elem.get('alt') or elem.get('title') or elem.get_text(strip=True)
            if text and len(text) < 80 and text not in results:
                results.append(text.strip())
    return results
