import json
import sqlite3
from pathlib import Path

from .models import ProductEnrichment

DB_PATH = Path(__file__).parent.parent.parent / "data" / "db.sqlite"


def get_finished_goods(db_path: Path = DB_PATH) -> list[dict]:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT Id, SKU FROM Product WHERE Type = 'finished-good'")
    rows = cursor.fetchall()
    conn.close()
    return [{"db_id": row[0], "sku": row[1]} for row in rows]


def create_enrichment_table(conn: sqlite3.Connection):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS Product_Enrichment (
            ProductId INTEGER PRIMARY KEY,
            ProductName TEXT,
            Brand TEXT,
            Certifications TEXT,
            DietaryClaims TEXT,
            AllergenContains TEXT,
            AllergenFreeFrom TEXT,
            IngredientsRaw TEXT,
            SourceURL TEXT,
            ScrapeTimestamp TEXT,
            FOREIGN KEY (ProductId) REFERENCES Product(Id)
        )
    """)
    conn.commit()


def save_enrichment(conn: sqlite3.Connection, product_id: int, enrichment: ProductEnrichment):
    conn.execute("""
        INSERT OR REPLACE INTO Product_Enrichment
        (ProductId, ProductName, Brand, Certifications, DietaryClaims,
         AllergenContains, AllergenFreeFrom, IngredientsRaw, SourceURL, ScrapeTimestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        product_id,
        enrichment.product_name,
        enrichment.brand,
        json.dumps(enrichment.certifications),
        json.dumps(enrichment.dietary_claims),
        json.dumps(enrichment.allergen_contains),
        json.dumps(enrichment.allergen_free_from),
        enrichment.ingredients_raw,
        enrichment.url,
        enrichment.scrape_timestamp,
    ))
    conn.commit()
