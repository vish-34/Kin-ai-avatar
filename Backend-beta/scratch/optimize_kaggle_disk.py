import json
from pathlib import Path

nb_path = Path(r"c:\Users\vishal\Desktop\Kin-ai-avatar\Backend\kin_avatar_unified_colab.ipynb")
with open(nb_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

cell1 = nb["cells"][1]["source"]
cell1_text = "".join(cell1)

# 1. Update PIP_CACHE_DIR to use /tmp/pip on Kaggle
cell1_text = cell1_text.replace(
    "os.environ['PIP_CACHE_DIR'] = f'{CACHE_DIR}/pip'",
    "os.environ['PIP_CACHE_DIR'] = '/tmp/pip' if IS_KAGGLE else f'{CACHE_DIR}/pip'"
)

# 2. Add cleanup of pip wheels and conda tarballs before step 5
cleanup_code = """
# Auto-clean temporary package caches to protect Kaggle 19.5GB disk limit
if IS_KAGGLE:
    !rm -rf /kaggle/working/cache/pip ~/.cache/pip
    !/kaggle/working/bin/micromamba clean --all -y > /dev/null 2>&1 || true
"""

if "# 7. Check OmniVoice Weights in Persistent Cache" in cell1_text:
    cell1_text = cell1_text.replace(
        "# 7. Check OmniVoice Weights in Persistent Cache",
        cleanup_code + "\n# 7. Check OmniVoice Weights in Persistent Cache"
    )

nb["cells"][1]["source"] = [l + "\n" for l in cell1_text.split("\n")][:-1]

with open(nb_path, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=2, ensure_ascii=False)

print("SUCCESS: kin_avatar_unified_colab.ipynb updated with Kaggle disk optimization!")
