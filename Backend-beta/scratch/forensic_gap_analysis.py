import json
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
phase1_file = BACKEND_DIR / "scratch" / "phase1_benchmark_results.json"
out_file = BACKEND_DIR / "scratch" / "forensic_all.txt"
data = json.load(open(phase1_file, encoding="utf-8"))

lines = []
lines.append(f"Loaded {len(data)} Phase 1 benchmark tests.\n")

for item in data:
    tid = item["id"]
    name = item["name"]
    cat = item["category"]
    turns = item["turns"]
    
    lines.append(f"\n[{tid}] {cat} - {name}")
    for t in turns:
        u = t["user"]
        b = t["bot"]
        lat = t["latency_s"]
        if len(turns) > 1:
            lines.append(f"  T{t['turn']} User: {u}")
            lines.append(f"  T{t['turn']} Bot:  {b}")
        else:
            lines.append(f"  User: {u}")
            lines.append(f"  Bot:  {b}")

with open(out_file, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"Wrote forensic dump to {out_file}")
