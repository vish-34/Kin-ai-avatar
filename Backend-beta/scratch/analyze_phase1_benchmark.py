import json
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

before_file = BACKEND_DIR / "scratch" / "audit_results.json"
after_file = BACKEND_DIR / "scratch" / "phase1_benchmark_results.json"

before_data = json.load(open(before_file, encoding="utf-8"))
after_data = json.load(open(after_file, encoding="utf-8"))

print(f"Loaded Before ({len(before_data)} tests) and After ({len(after_data)} tests)")

# Detailed comparative metrics
before_blanks = 0
after_blanks = 0
before_trunc = 0
after_trunc = 0
before_devanagari_in_hinglish = 0
after_devanagari_in_hinglish = 0

devanagari_range = range(0x0900, 0x097F)

for item in before_data:
    for turn in item["turns"]:
        b = turn["bot"].strip()
        if not b:
            before_blanks += 1
        if b.endswith("kab") or b.endswith("and") or b.endswith("others") or b.endswith("light and"):
            before_trunc += 1
        if item["id"] in [38, 55]:  # Hinglish tests
            if any(ord(c) in devanagari_range for c in b):
                before_devanagari_in_hinglish += 1

for item in after_data:
    for turn in item["turns"]:
        b = turn["bot"].strip()
        if not b:
            after_blanks += 1
        if b.endswith("kab") or b.endswith("and") or b.endswith("others") or b.endswith("light and"):
            after_trunc += 1
        if item["id"] in [38, 55]:  # Hinglish tests
            if any(ord(c) in devanagari_range for c in b):
                after_devanagari_in_hinglish += 1

print("\n--- QUANTITATIVE DEFECT COMPARISON ---")
print(f"Blank Responses:      Before: {before_blanks}  -->  After: {after_blanks}")
print(f"Truncated Responses:  Before: {before_trunc}   -->  After: {after_trunc}")
print(f"Devanagari Intrusion: Before: {before_devanagari_in_hinglish}   -->  After: {after_devanagari_in_hinglish}")

# Export full side-by-side comparison to a text file for inspection
out_txt = BACKEND_DIR / "scratch" / "phase1_comparison.txt"
lines = []
lines.append("PHASE 1 SIDE-BY-SIDE BENCHMARK COMPARISON\n" + "="*70)

for b_item, a_item in zip(before_data, after_data):
    lines.append(f"\nTEST {b_item['id']}: {b_item['name']} [{b_item['category']}]")
    lines.append("-" * 60)
    for b_turn, a_turn in zip(b_item["turns"], a_item["turns"]):
        lines.append(f"  User: {b_turn['user']}")
        lines.append(f"  BEFORE: {repr(b_turn['bot'])}")
        lines.append(f"  AFTER:  {repr(a_turn['bot'])}")
        lines.append("")

with open(out_txt, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"Wrote full side-by-side comparison to {out_txt}")
