import asyncio
from pathlib import Path

try:
    from .sources.playwright_base import PlaywrightScraper
except ImportError:
    from sources.playwright_base import PlaywrightScraper


TEST_URLS = {
    'cvs': 'https://www.cvs.com/shop/cvs-health-vitamin-d3-softgels-25-mcg-1000-iu-prodid-480254',
    'costco': 'https://www.costco.com/kirkland-signature-vitamin-d3-50-mcg.%2c-600-softgels.product.11467951.html',
    'sams_club': 'https://www.samsclub.com/p/members-mark-vitamin-d3-50-mcg-2000-iu/prod21292026',
    'vitacost': 'https://www.vitacost.com/vitacost-vitamin-d3',
}


async def capture_debug_pages(headless: bool = False):
    debug_dir = Path(__file__).resolve().parent / 'debug_pages'
    debug_dir.mkdir(exist_ok=True)

    scraper = PlaywrightScraper(headless=headless)
    await scraper.start()

    try:
        for source, url in TEST_URLS.items():
            page = await scraper.new_page()
            try:
                print(f'\n{"=" * 50}')
                print(f'Loading {source}: {url}')
                print(f'{"=" * 50}')
                await page.goto(url, wait_until='domcontentloaded', timeout=45000)
                await scraper.wait_for_product_page(page, extra_delay=3.0)

                paths = await scraper.save_debug_page(page, source, directory=str(debug_dir))
                print(f"  Screenshot saved: {paths['png']}")
                print(f"  HTML saved: {paths['html']}")

                h1_text = await scraper.get_first_text(page, ['h1'], min_length=1)
                print(f'  H1 found: {h1_text[:60]}' if h1_text else '  H1 NOT FOUND')

                block_reason = await scraper.detect_block(page)
                if block_reason:
                    print(f'  BLOCK DETECTED: {block_reason}')
            except Exception as exc:
                print(f'  ERROR: {exc}')
            finally:
                await page.close()
    finally:
        await scraper.stop()


if __name__ == '__main__':
    asyncio.run(capture_debug_pages())
