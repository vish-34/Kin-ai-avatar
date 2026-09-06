import json
from pathlib import Path

nb_path = Path(r"c:\Users\vishal\Desktop\Kin-ai-avatar\Backend\kin_avatar_unified_colab.ipynb")
with open(nb_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

# In Cell 2 (index 2):
cell2_text = "".join(nb["cells"][2]["source"])

# Find lines around musetalk_env
old_snippet = """musetalk_env = os.environ.copy()
musetalk_env['PORT'] = '8001'
musetalk_env['MUSETALK_VERSION'] = 'v15' if musetalk_version == 'v1.5' else 'v1'"""

new_snippet = """import torch
num_gpus = torch.cuda.device_count() if torch.cuda.is_available() else 0
print(f"🎮 Detected {num_gpus} available GPU(s).")

musetalk_env = os.environ.copy()
musetalk_env['PORT'] = '8001'
musetalk_env['MUSETALK_VERSION'] = 'v15' if musetalk_version == 'v1.5' else 'v1'

unified_env = os.environ.copy()
unified_env['MUSETALK_INTERNAL_URL'] = 'http://127.0.0.1:8001'

if num_gpus > 1:
    print(f"🚀 Dual GPU Detected! Allocating GPU 0 -> OmniVoice and GPU 1 -> MuseTalk!")
    musetalk_env['CUDA_VISIBLE_DEVICES'] = '1'
    unified_env['CUDA_VISIBLE_DEVICES'] = '0'
else:
    print("⚡ Single GPU active. Sharing GPU 0 between voice and video engines.")"""

if old_snippet in cell2_text:
    cell2_text = cell2_text.replace(old_snippet, new_snippet)
    # Also remove duplicate unified_env declaration below
    duplicate_decl = """unified_env = os.environ.copy()\nunified_env['MUSETALK_INTERNAL_URL'] = 'http://127.0.0.1:8001'\n"""
    cell2_text = cell2_text.replace(duplicate_decl, "")
    
    nb["cells"][2]["source"] = [l + "\n" for l in cell2_text.split("\n")][:-1]
    with open(nb_path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=2, ensure_ascii=False)
    print("SUCCESS: Dual-GPU intelligent allocation added to notebook!")
else:
    print("Snippet not found, check lines.")
