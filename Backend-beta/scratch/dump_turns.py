import json
import sys
from pathlib import Path

data_path = Path(__file__).resolve().parent / "audit_results.json"
out_path = Path(__file__).resolve().parent / "all_turns.txt"
data = json.load(open(data_path, encoding="utf-8"))

lines = []
lines.append(f"Total Tests Evaluated: {len(data)}\n")

for t in data:
    lines.append(f"============================================================")
    lines.append(f"TEST {t['id']}: {t['name']} [{t['category']}]")
    lines.append(f"============================================================")
    for turn in t['turns']:
        if len(t['turns']) > 1:
            lines.append(f"  [Turn {turn['turn']}] User: {turn['user']}")
            lines.append(f"  [Turn {turn['turn']}] Bot:  {turn['bot']}")
            lines.append(f"  (latency: {turn['latency_s']}s)")
        else:
            lines.append(f"  User: {turn['user']}")
            lines.append(f"  Bot:  {turn['bot']}")
            lines.append(f"  (latency: {turn['latency_s']}s)")
    lines.append("\n")

with open(out_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"Wrote all test turns to {out_path}")
