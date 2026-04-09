"""Entry point — run from the code/ directory:
    python -m scraper.main
or simply:
    python scraping.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from scraper.main import run

if __name__ == '__main__':
    asyncio.run(run())
