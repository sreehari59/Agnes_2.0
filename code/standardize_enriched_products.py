import argparse
import json
import re
from pathlib import Path


DEFAULT_INPUT = Path(__file__).resolve().parent / "scraper" / "output" / "enriched_products.json"
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "scraper" / "output" / "standardized_products.json"


PRODUCT_CATEGORIES = [
    "whey_protein",
    "plant_protein",
    "electrolyte_drink_mix",
    "multivitamin",
    "vitamin_d3",
    "magnesium_glycinate",
    "magnesium_oxide",
    "magnesium_l_threonate",
    "magnesium_complex",
    "magnesium",
    "unknown",
    "blocked_page",
    "scrape_failed",
]

DOSAGE_FORMS = [
    "powder",
    "tablets",
    "capsules",
    "softgels",
    "packets",
    "liquid",
]

TARGET_DEMOGRAPHICS = [
    "adults",
    "adults_50_plus",
    "men",
    "women",
    "unisex",
]

DIETARY_FLAGS = [
    "gluten_free",
    "non_gmo",
    "vegan",
    "vegetarian",
    "organic",
    "dairy_free",
    "soy_free",
    "sugar_free",
    "caffeine_free",
    "kosher",
    "nsf_certified",
]

INGREDIENT_SIGNALS = [
    "whey_protein",
    "rice_protein",
    "electrolytes",
    "potassium",
    "magnesium",
    "magnesium_glycinate",
    "magnesium_oxide",
    "magnesium_citrate",
    "magnesium_malate",
    "magnesium_l_threonate",
    "vitamin_d3",
    "zinc",
    "iron",
    "vitamin_b",
    "vitamin_c",
    "prebiotics",
    "bcaa",
    "collagen_peptides",
]

CATEGORY_RULES = [
    ("magnesium_l_threonate", [r"\bmagtein\b", r"\bl-threonate\b", r"\bmagnesium l-threonate\b"]),
    ("magnesium_glycinate", [r"\bmagnesium glycinate\b"]),
    ("magnesium_oxide", [r"\bmagnesium oxide\b"]),
    (
        "magnesium_complex",
        [
            r"\bmagnesium complex\b",
            r"\bmagnesium supplements? with glycinate, citrate, malate",
            r"\bwith vitamin d and zinc\b",
        ],
    ),
    ("vitamin_d3", [r"\bvitamin d3\b", r"\bd3\b", r"\bvitamin d\b"]),
    (
        "electrolyte_drink_mix",
        [
            r"\belectrolytes?\b",
            r"\belectrolit\b",
            r"\bhydration multiplier\b",
            r"\brehydration\b",
            r"\bpedialyte\b",
            r"\blmnt\b",
            r"\bliquid i\.v\b",
            r"\bultima\b",
        ],
    ),
    ("multivitamin", [r"\bmultivitamin\b", r"\bmultimineral\b", r"\bmultiple vitamin\b", r"\bone a day\b"]),
    ("plant_protein", [r"\bplant-based\b", r"\brace protein\b"]),
    ("whey_protein", [r"\bwhey\b", r"\bprotein powder\b", r"\bprotein shake\b", r"\bisolate protein\b"]),
    ("magnesium", [r"\bmagnesium\b"]),
]

BRAND_RULES = [
    ("Optimum Nutrition", [r"\boptimum nutrition\b"]),
    ("Equate", [r"\bequate\b"]),
    ("Pedialyte", [r"\bpedialyte\b"]),
    ("Women's Best", [r"\bwomen'?s best\b"]),
    ("Liquid I.V.", [r"\bliquid i\.v\b"]),
    ("Spring Valley", [r"\bspring valley\b"]),
    ("Nature Made", [r"\bnature made\b"]),
    ("Premier Protein", [r"\bpremier protein\b"]),
    ("Ultima Replenisher", [r"\bultima replenisher\b", r"\bultima\b"]),
    ("Nordic Naturals", [r"\bnordic naturals\b"]),
    ("Centrum", [r"\bcentrum\b"]),
    ("Lifetime allOne", [r"\ballone\b"]),
    ("Electrolit", [r"\belectrolit\b"]),
    ("GreeNatr", [r"\bgreenatr\b"]),
    ("Greens First", [r"\bgreens first\b"]),
    ("AlkemyPower", [r"\balkemypower\b"]),
    ("TREVI", [r"\btrevi\b"]),
    ("Vitacost", [r"\bvitacost\b"]),
    ("PRIME Hydration", [r"\bprime hydration\b", r"\bprime hydration\+\b"]),
    ("Simply Tera's", [r"\bsimply tera'?s\b"]),
    ("PowderVitamin", [r"\bpowdervitamin\b"]),
    ("GMU Sport", [r"\bgmu sport\b"]),
    ("One A Day", [r"\bone a day\b"]),
    ("up&up", [r"\bup&up\b"]),
    ("LMNT", [r"\blmnt\b"]),
    ("21st Century", [r"\b21st century\b"]),
    ("GNC", [r"\bgnc\b"]),
]

FORM_RULES = [
    ("softgels", [r"\bsoftgels?\b"]),
    ("tablets", [r"\btablets?\b"]),
    ("capsules", [r"\bcapsules?\b"]),
    ("packets", [r"\bpackets?\b", r"\bstick pack\b"]),
    ("powder", [r"\bpowder(?:ed)?\b", r"\btub\b"]),
    ("liquid", [r"\bliquid\b"]),
]

DEMOGRAPHIC_RULES = [
    ("adults_50_plus", [r"\b50\+\b", r"\badults 50\+\b", r"\bage 50 and older\b"]),
    ("men", [r"\bmen'?s\b"]),
    ("women", [r"\bwomen'?s\b"]),
    ("adults", [r"\badults\b"]),
]

DIETARY_FLAG_RULES = [
    ("gluten_free", [r"\bgluten[- ]free\b"]),
    ("non_gmo", [r"\bnon[- ]gmo\b", r"\bgmo[- ]free\b"]),
    ("vegan", [r"\bvegan\b"]),
    ("vegetarian", [r"\bvegetarian\b"]),
    ("organic", [r"\borganic\b"]),
    ("dairy_free", [r"\bdairy[- ]free\b"]),
    ("soy_free", [r"\bsoy[- ]free\b"]),
    ("sugar_free", [r"\bsugar[- ]free\b", r"\bzero sugar\b", r"\b0 sugar\b"]),
    ("caffeine_free", [r"\bcaffeine[- ]free\b", r"\bnon-caffeinated\b"]),
    ("kosher", [r"\bkosher\b"]),
    ("nsf_certified", [r"\bnsf certified\b"]),
]

INGREDIENT_RULES = [
    ("whey_protein", [r"\bwhey\b"]),
    ("rice_protein", [r"\brace protein\b"]),
    ("electrolytes", [r"\belectrolytes?\b", r"\bhydration\b", r"\brehydration\b"]),
    ("potassium", [r"\bpotassium\b"]),
    ("magnesium_glycinate", [r"\bmagnesium glycinate\b"]),
    ("magnesium_oxide", [r"\bmagnesium oxide\b"]),
    ("magnesium_citrate", [r"\bmagnesium citrate\b"]),
    ("magnesium_malate", [r"\bmagnesium malate\b"]),
    ("magnesium_l_threonate", [r"\bmagtein\b", r"\bl-threonate\b"]),
    ("magnesium", [r"\bmagnesium\b"]),
    ("vitamin_d3", [r"\bvitamin d3\b", r"\bd3\b"]),
    ("zinc", [r"\bzinc\b"]),
    ("iron", [r"\biron\b"]),
    ("vitamin_b", [r"\bvitamin b\b", r"\bb vitamins?\b", r"\bb3\b", r"\bb5\b", r"\bb6\b", r"\bb12\b"]),
    ("vitamin_c", [r"\bvitamin c\b"]),
    ("prebiotics", [r"\bprebiotics?\b"]),
    ("bcaa", [r"\bbcaa'?s?\b"]),
    ("collagen_peptides", [r"\bcollagen peptides?\b"]),
]

FLAVOR_RULES = [
    "vanilla ice cream",
    "double rich chocolate",
    "chocolate peanut butter",
    "vanilla milkshake",
    "strawberry cream",
    "peanut butter cup",
    "sour cherry",
    "strawberry",
    "watermelon",
    "pineapple",
    "grape",
    "fruit punch",
    "apple",
    "lemon lime",
    "lemonade",
    "vanilla",
    "chocolate",
]

STORE_BRAND_BY_SOURCE = {
    "walmart": ["Equate", "Spring Valley"],
    "target": ["up&up"],
    "gnc": ["GNC"],
    "costco": ["Kirkland Signature"],
    "sams_club": ["Member's Mark"],
    "cvs": ["CVS Health"],
    "walgreens": ["Walgreens"],
    "vitacost": ["Vitacost"],
    "amazon": [],
}


def normalize_text(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def lower_blob(*values: str | list[str] | None) -> str:
    parts: list[str] = []
    for value in values:
        if value is None:
            continue
        if isinstance(value, list):
            parts.extend(str(item) for item in value if item)
        else:
            parts.append(str(value))
    return " | ".join(parts).lower()


def first_match(text: str, rules: list[tuple[str, list[str]]], default: str | None = None) -> str | None:
    for label, patterns in rules:
        if any(re.search(pattern, text) for pattern in patterns):
            return label
    return default


def collect_matches(text: str, rules: list[tuple[str, list[str]]]) -> list[str]:
    matches: list[str] = []
    for label, patterns in rules:
        if any(re.search(pattern, text) for pattern in patterns) and label not in matches:
            matches.append(label)
    return matches


def infer_brand(record: dict, clean_name: str) -> str | None:
    scraped_brand = normalize_text(record.get("brand"))
    lower_name = clean_name.lower()

    for canonical_brand, patterns in BRAND_RULES:
        if any(re.search(pattern, lower_name) for pattern in patterns):
            return canonical_brand

    if scraped_brand:
        for canonical_brand, patterns in BRAND_RULES:
            if any(re.search(pattern, scraped_brand.lower()) for pattern in patterns):
                return canonical_brand
        if len(scraped_brand) >= 3:
            return scraped_brand

    source = record.get("source")
    fallback_store_brands = STORE_BRAND_BY_SOURCE.get(source, [])
    for store_brand in fallback_store_brands:
        if store_brand.lower() in lower_name:
            return store_brand

    return None


def infer_category(clean_name: str, ingredient_blob: str, scrape_success: bool) -> str:
    if clean_name == "Access Denied" or "access denied" in clean_name.lower():
        return "blocked_page"
    if not scrape_success or not clean_name:
        return "scrape_failed"

    text = f"{clean_name.lower()} | {ingredient_blob}"
    category = first_match(text, CATEGORY_RULES)
    return category or "unknown"


def infer_form(clean_name: str, blob: str) -> str | None:
    return first_match(f"{clean_name.lower()} | {blob}", FORM_RULES)


def infer_target_demographic(clean_name: str) -> str:
    demographic = first_match(clean_name.lower(), DEMOGRAPHIC_RULES)
    return demographic or "unisex"


def infer_flavor(clean_name: str) -> str | None:
    lower_name = clean_name.lower()
    for flavor in FLAVOR_RULES:
        if flavor in lower_name:
            return flavor
    return None


def extract_potency(clean_name: str, ingredient_blob: str) -> list[str]:
    text = f"{clean_name} | {ingredient_blob}"
    matches = re.findall(r"\b\d+(?:\.\d+)?\s?(?:mg|mcg|iu|g)\b", text, flags=re.IGNORECASE)
    seen: list[str] = []
    for match in matches:
        value = match.upper().replace("MCG", "mcg").replace("MG", "mg")
        if value not in seen:
            seen.append(value)
    return seen


def extract_count(clean_name: str) -> str | None:
    match = re.search(r"\b(\d+)\s?(?:count|ct|servings?)\b", clean_name, flags=re.IGNORECASE)
    if match:
        return match.group(0)
    return None


def clean_allergen_contains(values: list[str]) -> list[str]:
    cleaned: list[str] = []
    for value in values:
        normalized = normalize_text(value)
        if not normalized:
            continue
        if len(normalized) > 80:
            continue
        if normalized.lower() in {"access denied"}:
            continue
        cleaned.append(normalized)
    return cleaned


def standardize_record(record: dict) -> dict:
    clean_name = normalize_text(record.get("product_name"))
    ingredients_raw = normalize_text(record.get("ingredients_raw"))
    dietary_claims = [normalize_text(value) for value in record.get("dietary_claims") or [] if normalize_text(value)]
    allergen_contains = clean_allergen_contains(record.get("allergen_contains") or [])
    allergen_free_from = [normalize_text(value) for value in record.get("allergen_free_from") or [] if normalize_text(value)]

    blob = lower_blob(clean_name, ingredients_raw, dietary_claims, allergen_contains, allergen_free_from)
    category = infer_category(clean_name, blob, bool(record.get("scrape_success")))
    brand = infer_brand(record, clean_name)
    form = infer_form(clean_name, blob)
    target_demographic = infer_target_demographic(clean_name)
    flavor = infer_flavor(clean_name)
    dietary_flags = collect_matches(blob, DIETARY_FLAG_RULES)
    ingredient_signals = collect_matches(blob, INGREDIENT_RULES)
    potency = extract_potency(clean_name, ingredients_raw)
    package_count = extract_count(clean_name)

    normalization_status = "standardized"
    if category == "blocked_page":
        normalization_status = "blocked_page"
    elif category == "scrape_failed":
        normalization_status = "scrape_failed"
    elif category == "unknown":
        normalization_status = "needs_review"

    standardized_name = clean_name if clean_name else None

    return {
        "sku": record.get("sku"),
        "source": record.get("source"),
        "retailer": record.get("source"),
        "url": record.get("url"),
        "scrape_success": record.get("scrape_success", False),
        "normalization_status": normalization_status,
        "product_name": standardized_name,
        "product_category": category,
        "brand": brand,
        "form": form,
        "target_demographic": target_demographic,
        "flavor": flavor,
        "ingredients": ingredient_signals,
        "dietary_flags": dietary_flags,
        "allergen_contains": allergen_contains,
        "allergen_free_from": allergen_free_from,
        "potency": potency,
        "package_count_or_servings": package_count,
        "raw_product_name": record.get("product_name"),
        "raw_brand": record.get("brand"),
        "raw_dietary_claims": record.get("dietary_claims") or [],
        "raw_ingredients_raw": record.get("ingredients_raw"),
        "error_message": record.get("error_message"),
    }


def summarize(records: list[dict]) -> dict:
    summary: dict[str, dict[str, int] | list[str] | int] = {
        "record_count": len(records),
        "product_categories": {},
        "brands": {},
        "forms": {},
        "statuses": {},
        "unknown_examples": [],
    }

    for field in ("product_category", "brand", "form", "normalization_status"):
        counts: dict[str, int] = {}
        for record in records:
            value = record.get(field) or "null"
            counts[value] = counts.get(value, 0) + 1
        if field == "normalization_status":
            key = "statuses"
        elif field == "product_category":
            key = "product_categories"
        else:
            key = f"{field}s"
        summary[key] = dict(sorted(counts.items(), key=lambda item: (-item[1], item[0])))

    unknown_examples: list[str] = []
    for record in records:
        if record["product_category"] == "unknown" and record.get("product_name"):
            unknown_examples.append(record["product_name"])
        if len(unknown_examples) >= 10:
            break
    summary["unknown_examples"] = unknown_examples
    return summary


def main():
    parser = argparse.ArgumentParser(description="Rule-based standardization for enriched product records.")
    parser.add_argument("--input", default=str(DEFAULT_INPUT), help="Input enriched_products.json path")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Output standardized_products.json path")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    records = json.loads(input_path.read_text(encoding="utf-8"))
    standardized_records = [standardize_record(record) for record in records]
    payload = {
        "schema": {
            "product_categories": PRODUCT_CATEGORIES,
            "dosage_forms": DOSAGE_FORMS,
            "target_demographics": TARGET_DEMOGRAPHICS,
            "dietary_flags": DIETARY_FLAGS,
            "ingredient_signals": INGREDIENT_SIGNALS,
        },
        "summary": summarize(standardized_records),
        "records": standardized_records,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {len(standardized_records)} standardized records to {output_path}")


if __name__ == "__main__":
    main()
