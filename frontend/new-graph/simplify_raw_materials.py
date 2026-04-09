#!/usr/bin/env python3
"""
Simplify the supply chain JSON by consolidating duplicate raw materials.

Raw materials like RM-C22-magnesium-glycinate-946fc249 and
RM-C30-magnesium-glycinate-ba21d239 are the same ingredient used by
different companies. This script merges them into a single node per
unique material name, rewiring all relationships accordingly.

Usage:
    python3 simplify_raw_materials.py

Reads:  comprehensive_supply_chain.json
Writes: comprehensive_supply_chain_simplified.json
"""

import json
import re
from collections import defaultdict
from pathlib import Path

INPUT  = Path(__file__).parent / "comprehensive_supply_chain.json"
OUTPUT = Path(__file__).parent / "comprehensive_supply_chain_simplified.json"


def extract_material_name(sku: str) -> str:
    """Extract the base material name from a SKU like RM-C22-magnesium-glycinate-946fc249."""
    m = re.match(r"RM-C\d+-(.*)-[a-f0-9]{8}$", sku)
    return m.group(1) if m else sku


def main():
    with open(INPUT) as f:
        data = json.load(f)

    old_rms = data["raw_materials"]  # list of {id, sku, company_id, type}

    # ── Step 1: Group raw materials by base name ──────────────────────────
    groups = defaultdict(list)  # material_name -> [rm entries]
    for rm in old_rms:
        name = extract_material_name(rm["sku"])
        groups[name].append(rm)

    print(f"Raw materials: {len(old_rms)} -> {len(groups)} unique materials")

    # ── Step 2: Build mapping from old ID -> canonical ID ─────────────────
    # Pick the lowest ID in each group as the canonical representative.
    old_to_canonical = {}   # old_rm_id -> canonical_rm_id
    canonical_rms = []      # new raw_materials list
    rm_to_companies = {}    # canonical_rm_id -> [company_ids]

    for name, members in sorted(groups.items()):
        members.sort(key=lambda r: r["id"])
        canonical = members[0]
        canonical_id = canonical["id"]

        # Build a clean label SKU (no company prefix, no hash)
        clean_sku = f"RM-{name}"

        canonical_rms.append({
            "id": canonical_id,
            "sku": clean_sku,
            "name": name.replace("-", " ").title(),
            "type": "raw-material",
            "original_count": len(members),
        })

        company_ids = sorted(set(m["company_id"] for m in members))
        rm_to_companies[str(canonical_id)] = company_ids

        for m in members:
            old_to_canonical[m["id"]] = canonical_id

    # ── Step 3: Rewrite fg_to_rms ─────────────────────────────────────────
    new_fg_to_rms = {}
    for fg_id, rm_ids in data["fg_to_rms"].items():
        mapped = sorted(set(old_to_canonical[rid] for rid in rm_ids if rid in old_to_canonical))
        if mapped:
            new_fg_to_rms[fg_id] = mapped

    # ── Step 4: Rewrite rm_to_suppliers (merge supplier lists) ────────────
    merged_rm_suppliers = defaultdict(set)
    for rm_id_str, supplier_ids in data["rm_to_suppliers"].items():
        rm_id = int(rm_id_str)
        if rm_id in old_to_canonical:
            canonical = old_to_canonical[rm_id]
            merged_rm_suppliers[str(canonical)].update(supplier_ids)

    new_rm_to_suppliers = {k: sorted(v) for k, v in merged_rm_suppliers.items()}

    # ── Step 5: Rewrite supplier_to_rms (merge and deduplicate) ───────────
    new_supplier_to_rms = {}
    for sid, rm_ids in data["supplier_to_rms"].items():
        mapped = sorted(set(
            old_to_canonical[rid] for rid in rm_ids if rid in old_to_canonical
        ))
        if mapped:
            new_supplier_to_rms[sid] = mapped

    # ── Step 6: Rewrite critical_raw_materials ────────────────────────────
    # Original format: [[rm_id, usage_count], ...] — aggregate by canonical
    crit_agg = defaultdict(int)
    for item in data.get("critical_raw_materials", []):
        rm_id, count = item[0], item[1]
        if rm_id in old_to_canonical:
            crit_agg[old_to_canonical[rm_id]] += count
    new_critical = sorted(crit_agg.items(), key=lambda x: -x[1])
    new_critical = [[rid, cnt] for rid, cnt in new_critical]

    # ── Step 7: Rewrite single_source_rms ─────────────────────────────────
    # A canonical RM is single-source only if ALL its merged suppliers total to 1
    new_single_source = []
    for item in data.get("single_source_rms", []):
        rm_id = item[0] if isinstance(item, list) else item
        if rm_id in old_to_canonical:
            canonical = old_to_canonical[rm_id]
            suppliers = new_rm_to_suppliers.get(str(canonical), [])
            if len(suppliers) == 1:
                new_single_source.append(item)
    # Deduplicate by canonical ID
    seen = set()
    deduped_single = []
    for item in new_single_source:
        rid = item[0] if isinstance(item, list) else item
        cid = old_to_canonical.get(rid, rid)
        if cid not in seen:
            seen.add(cid)
            deduped_single.append([cid])
    new_single_source = deduped_single

    # ── Step 8: Rewrite high_risk_finished_goods ──────────────────────────
    # Recalculate based on the new consolidated single-source counts
    single_source_set = set(item[0] for item in new_single_source)
    new_high_risk = []
    for fg in data["finished_goods"]:
        fg_rms = new_fg_to_rms.get(str(fg["id"]), [])
        if not fg_rms:
            continue
        ss_count = sum(1 for rid in fg_rms if rid in single_source_set)
        if ss_count > 0:
            ratio = ss_count / len(fg_rms)
            new_high_risk.append({
                "fg_id": fg["id"],
                "sku": fg["sku"],
                "single_source_rms": ss_count,
                "total_rms": len(fg_rms),
                "risk_ratio": round(ratio, 4),
            })
    new_high_risk.sort(key=lambda x: -x["risk_ratio"])

    # ── Step 9: Assemble the simplified output ────────────────────────────
    output = {
        "generated_at": data["generated_at"],
        "data_source": data["data_source"] + " (simplified: raw materials consolidated by ingredient name)",
        "statistics": {
            "total_companies": data["statistics"]["total_companies"],
            "total_suppliers": data["statistics"]["total_suppliers"],
            "total_finished_goods": data["statistics"]["total_finished_goods"],
            "total_raw_materials_original": data["statistics"]["total_raw_materials"],
            "total_raw_materials": len(canonical_rms),
            "unique_materials_reduced_from": len(old_rms),
            "avg_rms_per_fg": round(
                sum(len(v) for v in new_fg_to_rms.values()) / max(len(new_fg_to_rms), 1), 2
            ),
            "single_source_rms_count": len(new_single_source),
            "multi_source_rms_count": len(canonical_rms) - len(new_single_source),
            "enriched_products_count": data["statistics"].get("enriched_products_count", 0),
            "priced_products_count": data["statistics"].get("priced_products_count", 0),
        },
        "companies": data["companies"],
        "suppliers": data["suppliers"],
        "finished_goods": data["finished_goods"],
        "raw_materials": canonical_rms,
        "fg_to_rms": new_fg_to_rms,
        "rm_to_suppliers": new_rm_to_suppliers,
        "supplier_to_rms": new_supplier_to_rms,
        "rm_to_companies": rm_to_companies,
        "critical_raw_materials": new_critical,
        "single_source_rms": new_single_source,
        "high_risk_finished_goods": new_high_risk,
        "product_similarity": data.get("product_similarity", []),
        "supplier_reach": data.get("supplier_reach", {}),
        "company_supply_chains": data.get("company_supply_chains", {}),
        "product_metadata": data.get("product_metadata", {}),
        "category_distribution": data.get("category_distribution", {}),
        "certification_distribution": data.get("certification_distribution", {}),
        "pricing_analysis": data.get("pricing_analysis", {}),
    }

    with open(OUTPUT, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Written to {OUTPUT}")
    print(f"\nSummary:")
    print(f"  Raw material nodes: {len(old_rms)} -> {len(canonical_rms)} ({len(old_rms) - len(canonical_rms)} fewer)")
    print(f"  Single-source RMs:  {data['statistics'].get('single_source_rms_count', '?')} -> {len(new_single_source)}")
    print(f"  New field added:    rm_to_companies (maps each material to the companies that use it)")
    print(f"  New RM fields:      'name' (human-readable), 'original_count' (how many were merged)")


if __name__ == "__main__":
    main()
