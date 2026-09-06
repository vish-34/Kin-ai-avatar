import json
from pathlib import Path

nb_path = Path(r"c:\Users\vishal\Desktop\Kin-ai-avatar\Backend\kin_avatar_unified_colab.ipynb")
with open(nb_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

cell2_text = "".join(nb["cells"][2]["source"])

target = """musetalk_env = os.environ.copy()
musetalk_env['PORT'] = '8001'
musetalk_env['MUSETALK_VERSION'] = 'v15' if musetalk_version == 'v1.5' else 'v1'


if num_gpus > 1:"""

replacement = """musetalk_env = os.environ.copy()
musetalk_env['PORT'] = '8001'
musetalk_env['MUSETALK_VERSION'] = 'v15' if musetalk_version == 'v1.5' else 'v1'

unified_env = os.environ.copy()
unified_env['MUSETALK_INTERNAL_URL'] = 'http://127.0.0.1:8001'

if num_gpus > 1:"""

if target in cell2_text:
    cell2_text = cell2_text.replace(target, replacement)
    nb["cells"][2]["source"] = [l + "\n" for l in cell2_text.split("\n")][:-1]
    with open(nb_path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=2, ensure_ascii=False)
    print("SUCCESS: unified_env declaration fixed!")
else:
    print("Target not found. Looking at lines...")
    idx = cell2_text.find("musetalk_env")
    print(cell2_text[idx:idx+250])
