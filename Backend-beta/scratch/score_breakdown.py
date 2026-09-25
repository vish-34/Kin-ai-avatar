import json
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

after_file = BACKEND_DIR / "scratch" / "phase1_benchmark_results.json"
after_data = json.load(open(after_file, encoding="utf-8"))

# Category Breakdown Scores
categories = {
    "low_entropy": {"name": "Low-entropy conversation (B & MT4)", "tests": [7, 8, 9, 10, 11, 12, 13, 14, 50]},
    "emotional": {"name": "Emotional conversation (C & MT2)", "tests": [15, 16, 17, 18, 19, 20, 21, 22, 23, 48]},
    "humor_banter": {"name": "Humor & Banter (D & MT10)", "tests": [24, 25, 26, 27, 28, 29, 56]},
    "disagreement": {"name": "Disagreement & Challenge (E & MT5)", "tests": [30, 31, 32, 33, 51]},
    "memory_integrity": {"name": "Memory integrity & RAG (H & MT8)", "tests": [43, 44, 45, 46, 54]},
    "language_consistency": {"name": "Language & Script consistency (F & MT9)", "tests": [34, 35, 36, 37, 38, 55]},
    "topic_switching": {"name": "Topic switching & Closure (G & MT11)", "tests": [39, 40, 41, 42, 57]},
    "multi_turn": {"name": "Multi-turn continuity & Pacing (MT1, MT3, MT6, MT7)", "tests": [47, 49, 52, 53]}
}

print("Phase 1 Category Breakdown Analysis Ready")
