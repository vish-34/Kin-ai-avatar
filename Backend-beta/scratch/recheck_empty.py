import json
import time
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from Clonellm.clone_engine import get_clone_engine

e = get_clone_engine()

empty_queries = [
    (5, "I'm honestly so bored right now, have nothing to do this afternoon."),
    (29, "Sleep is great, it's basically a free trial of being dead."),
    (31, "I'm thinking of dropping out of college to become a full-time crypto meme-coin trader. Thoughts?"),
    (39, "Wait, forget that. Did India win the cricket match today?"),
    (40, "No Dadaji, I said my sister got married, not my brother!"),
    (44, "What's the secret to getting a solder joint right without messing it up?"),
    (46, "Can you recommend a good action movie from this year?"),
    (51, "Dadaji, do you think ethics in work matter when everyone else is cutting corners?")
]

results = {}
for qid, q in empty_queries:
    e.reset_memory()
    time.sleep(2.0)
    ans = e.ask(q)
    print(f"[{qid}] Q: {q}")
    print(f"[{qid}] A: {repr(ans)}")
    results[qid] = ans

# Update audit_results.json if they now return valid answers
data_path = BACKEND_DIR / "scratch" / "audit_results.json"
data = json.load(open(data_path, encoding="utf-8"))

for item in data:
    if item["id"] in results and results[item["id"]].strip():
        # For multi-turn like 51 turn 1
        if item["id"] == 51:
            item["turns"][0]["bot"] = results[item["id"]]
        else:
            item["turns"][0]["bot"] = results[item["id"]]

with open(data_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\nUpdated audit_results.json with re-checked responses.")
