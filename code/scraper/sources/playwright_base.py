import json
import os
import re
from pathlib import Path
from typing import Optional

from playwright.async_api import Browser, BrowserContext, Page, async_playwright

from ..models import ProductEnrichment


class PlaywrightScraper:
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.playwright = None
        self.browser: Browser = None
        self.context: BrowserContext = None

    async def start(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-dev-shm-usage',
            ],
        )
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent=(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/124.0.0.0 Safari/537.36'
            ),
            locale='en-US',
            timezone_id='America/New_York',
        )
        await self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        """)

    async def stop(self):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    async def new_page(self) -> Page:
        return await self.context.new_page()

    async def get_text(self, page: Page, selector: str) -> Optional[str]:
        try:
            elem = await page.query_selector(selector)
            if elem:
                return (await elem.inner_text()).strip()
        except Exception:
            pass
        return None

    async def get_all_text(self, page: Page, selector: str) -> list[str]:
        try:
            elems = await page.query_selector_all(selector)
            results = []
            for elem in elems:
                text = (await elem.inner_text()).strip()
                if text:
                    results.append(text)
            return results
        except Exception:
            return []

    async def get_first_text(
        self,
        page: Page,
        selectors: list[str],
        *,
        min_length: int = 1,
    ) -> Optional[str]:
        for selector in selectors:
            text = await self.get_text(page, selector)
            if text and len(text) >= min_length:
                return text
        return None

    async def get_all_text_from_selectors(self, page: Page, selectors: list[str]) -> list[str]:
        results: list[str] = []
        for selector in selectors:
            for text in await self.get_all_text(page, selector):
                if text and text not in results:
                    results.append(text)
        return results

    async def get_first_attr(
        self,
        page: Page,
        selectors: list[str],
        attr: str,
        *,
        min_length: int = 1,
    ) -> Optional[str]:
        for selector in selectors:
            try:
                elem = await page.query_selector(selector)
                if not elem:
                    continue
                value = await elem.get_attribute(attr)
                if value:
                    value = value.strip()
                    if len(value) >= min_length:
                        return value
            except Exception:
                continue
        return None

    async def get_json_ld_objects(self, page: Page) -> list[dict]:
        objects: list[dict] = []
        try:
            scripts = await page.query_selector_all('script[type="application/ld+json"]')
            for script in scripts:
                try:
                    raw = (await script.inner_text()).strip()
                    if not raw:
                        continue
                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        objects.extend(item for item in parsed if isinstance(item, dict))
                    elif isinstance(parsed, dict):
                        objects.append(parsed)
                except Exception:
                    continue
        except Exception:
            return []
        return objects

    async def get_json_ld_field(self, page: Page, *field_names: str) -> Optional[str]:
        for obj in await self.get_json_ld_objects(page):
            for field_name in field_names:
                value = obj.get(field_name)
                if isinstance(value, str) and value.strip():
                    return value.strip()
                if isinstance(value, dict):
                    nested = value.get('name')
                    if isinstance(nested, str) and nested.strip():
                        return nested.strip()
        return None

    async def click_first_button_by_text(self, page: Page, labels: list[str]) -> bool:
        for label in labels:
            for selector in (
                f'button:has-text("{label}")',
                f'[role="button"]:has-text("{label}")',
                f'summary:has-text("{label}")',
            ):
                try:
                    elem = await page.query_selector(selector)
                    if elem:
                        await elem.click()
                        return True
                except Exception:
                    continue
        return False

    async def wait_for_product_page(self, page: Page, extra_delay: float = 2.0):
        try:
            await page.wait_for_load_state('networkidle', timeout=15000)
        except Exception:
            pass
        if extra_delay > 0:
            import asyncio
            await asyncio.sleep(extra_delay)

    async def detect_block(self, page: Page) -> Optional[str]:
        try:
            html = (await page.content()).lower()
        except Exception:
            return None
        for marker in (
            'access denied',
            'captcha',
            'verify you are human',
            'bot detection',
            'temporarily unavailable',
        ):
            if marker in html:
                return marker
        return None

    async def save_debug_page(self, page: Page, name: str, directory: str = 'debug_pages') -> dict[str, str]:
        debug_dir = Path(directory)
        debug_dir.mkdir(parents=True, exist_ok=True)
        html_path = debug_dir / f'{name}.html'
        png_path = debug_dir / f'{name}.png'

        html = await page.content()
        html_path.write_text(html, encoding='utf-8')
        await page.screenshot(path=str(png_path), full_page=True)
        return {'html': str(html_path), 'png': str(png_path)}

    async def extract_ingredients(self, page: Page, extra_selectors: list[str] | None = None) -> Optional[str]:
        selectors = (extra_selectors or []) + [
            '#ingredients', '.ingredients', '[data-testid="ingredients"]',
            '[class*="ingredient"]', '#product-ingredients',
        ]
        for sel in selectors:
            text = await self.get_text(page, sel)
            if text and len(text) > 20:
                return text
        return None

    async def extract_allergen_contains(self, page: Page) -> list[str]:
        html = await page.content()
        match = re.search(r'contains[:\s]+([^.<;\n]+)', html, re.IGNORECASE)
        if match:
            return [a.strip().rstrip(',') for a in match.group(1).split(',') if a.strip() and len(a.strip()) < 40]
        return []

    async def extract_dietary_claims(self, page: Page) -> list[str]:
        keywords = [
            'vegan', 'vegetarian', 'gluten-free', 'gluten free',
            'kosher', 'halal', 'organic', 'non-gmo', 'dairy-free', 'dairy free',
        ]
        html = (await page.content()).lower()
        seen = []
        for kw in keywords:
            label = kw.title()
            if kw in html and label not in seen:
                seen.append(label)
        return seen

    async def screenshot(self, page: Page, sku: str):
        """Save a debug screenshot."""
        os.makedirs('debug', exist_ok=True)
        await page.screenshot(path=f'debug/{sku}.png', full_page=True)
