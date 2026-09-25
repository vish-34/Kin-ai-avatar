import json
from pathlib import Path

data_path = Path(__file__).resolve().parent / "audit_results.json"
data = json.load(open(data_path, encoding="utf-8"))

# We will systematically score each test case based on empirical audit results.
# Criteria:
# 1. Naturalness /10
# 2. Conversational flow /10
# 3. Emotional appropriateness /10
# 4. Context/memory usage /10
# 5. Personality consistency /10
# 6. Appropriate response length /10
# 7. Human-like turn-taking /10
# 8. AI-like behavior /10 (10 = blatantly robotic AI, 0 = completely human)

# Let's inspect each test and build the structured evaluation
evaluated_tests = []

for t in data:
    tid = t["id"]
    name = t["name"]
    cat = t["category"]
    turns = t["turns"]
    
    # Analyze turns
    all_bots = [turn["bot"].strip() for turn in turns]
    has_empty = any(not b for b in all_bots)
    has_trunc = any(b.endswith("kab") or b.endswith("and") or b.endswith("others") for b in all_bots)
    
    # Specific evaluations per test
    # We will compute realistic, brutal scores based on the actual responses recorded
    evaluated_tests.append({
        "id": tid,
        "name": name,
        "category": cat,
        "turns": turns,
        "has_empty": has_empty,
        "has_trunc": has_trunc
    })

print(f"Loaded {len(evaluated_tests)} test cases for scoring analysis.")
