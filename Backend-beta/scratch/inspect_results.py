import json
from pathlib import Path

data_path = Path(__file__).resolve().parent / "audit_results.json"
data = json.load(open(data_path, encoding="utf-8"))

print(f"Total Tests Loaded: {len(data)}\n")

for t in data:
    print(f"[{t['id']}] {t['category']} | {t['name']}")
    for turn in t['turns']:
        if len(t['turns']) > 1:
            print(f"   [T{turn['turn']}] User: {turn['user']}")
            print(f"   [T{turn['turn']}] Bot:  {turn['bot']}")
        else:
            print(f"   User: {turn['user']}")
            print(f"   Bot:  {turn['bot']}")
    print("-" * 60)
