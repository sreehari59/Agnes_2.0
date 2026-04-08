import argparse
import json
import sqlite3
from pathlib import Path


DEFAULT_DB = Path(__file__).resolve().parent.parent / "data" / "db.sqlite"
DEFAULT_INPUT = Path(__file__).resolve().parent / "scraper" / "output" / "standardized_products.json"


def create_standardized_table(conn: sqlite3.Connection):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS Product_Standardization (
            ProductId INTEGER PRIMARY KEY,
            SKU TEXT NOT NULL UNIQUE,
            Source TEXT,
            Retailer TEXT,
            SourceURL TEXT,
            ScrapeSuccess INTEGER NOT NULL DEFAULT 0,
            NormalizationStatus TEXT,
            ProductName TEXT,
            ProductCategory TEXT,
            Brand TEXT,
            Form TEXT,
            TargetDemographic TEXT,
            Flavor TEXT,
            Ingredients TEXT,
            DietaryFlags TEXT,
            AllergenContains TEXT,
            AllergenFreeFrom TEXT,
            Potency TEXT,
            PackageCountOrServings TEXT,
            RawProductName TEXT,
            RawBrand TEXT,
            RawDietaryClaims TEXT,
            RawIngredientsRaw TEXT,
            ErrorMessage TEXT,
            FOREIGN KEY (ProductId) REFERENCES Product(Id)
        )
        """
    )
    conn.commit()


def load_product_ids(conn: sqlite3.Connection) -> dict[str, int]:
    rows = conn.execute("SELECT Id, SKU FROM Product").fetchall()
    return {sku: product_id for product_id, sku in rows}


def save_standardized_record(conn: sqlite3.Connection, product_id: int, record: dict):
    conn.execute(
        """
        INSERT OR REPLACE INTO Product_Standardization (
            ProductId,
            SKU,
            Source,
            Retailer,
            SourceURL,
            ScrapeSuccess,
            NormalizationStatus,
            ProductName,
            ProductCategory,
            Brand,
            Form,
            TargetDemographic,
            Flavor,
            Ingredients,
            DietaryFlags,
            AllergenContains,
            AllergenFreeFrom,
            Potency,
            PackageCountOrServings,
            RawProductName,
            RawBrand,
            RawDietaryClaims,
            RawIngredientsRaw,
            ErrorMessage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            product_id,
            record.get("sku"),
            record.get("source"),
            record.get("retailer"),
            record.get("url"),
            int(bool(record.get("scrape_success"))),
            record.get("normalization_status"),
            record.get("product_name"),
            record.get("product_category"),
            record.get("brand"),
            record.get("form"),
            record.get("target_demographic"),
            record.get("flavor"),
            json.dumps(record.get("ingredients") or []),
            json.dumps(record.get("dietary_flags") or []),
            json.dumps(record.get("allergen_contains") or []),
            json.dumps(record.get("allergen_free_from") or []),
            json.dumps(record.get("potency") or []),
            record.get("package_count_or_servings"),
            record.get("raw_product_name"),
            record.get("raw_brand"),
            json.dumps(record.get("raw_dietary_claims") or []),
            record.get("raw_ingredients_raw"),
            record.get("error_message"),
        ),
    )


def main():
    parser = argparse.ArgumentParser(description="Import standardized product records into db.sqlite.")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="Path to SQLite database")
    parser.add_argument("--input", default=str(DEFAULT_INPUT), help="Path to standardized_products.json")
    args = parser.parse_args()

    db_path = Path(args.db)
    input_path = Path(args.input)

    payload = json.loads(input_path.read_text(encoding="utf-8"))
    records = payload["records"]

    conn = sqlite3.connect(db_path)
    try:
        create_standardized_table(conn)
        sku_to_product_id = load_product_ids(conn)

        inserted = 0
        skipped: list[str] = []
        for record in records:
            sku = record.get("sku")
            product_id = sku_to_product_id.get(sku)
            if product_id is None:
                skipped.append(sku)
                continue
            save_standardized_record(conn, product_id, record)
            inserted += 1

        conn.commit()
    finally:
        conn.close()

    print(f"Inserted or updated {inserted} standardized records into {db_path}")
    if skipped:
        print(f"Skipped {len(skipped)} records with no Product.SKU match")
        for sku in skipped[:20]:
            print(f"  - {sku}")


if __name__ == "__main__":
    main()
