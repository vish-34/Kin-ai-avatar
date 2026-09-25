import json
from pathlib import Path

p = Path(r"c:\Users\vishal\Desktop\Kin-ai-avatar\Backend\kin_avatar_unified_colab.ipynb")
with open(p, "r", encoding="utf-8") as f:
    nb = json.load(f)

c1 = "".join(nb["cells"][1]["source"])

# Replace the OmniVoice from_pretrained call with snapshot_download
old_snippet = '_omni_check = OmniVoice.from_pretrained("k2-fsa/omnivoice", device="cpu", dtype=torch.float32)'
new_snippet = 'from huggingface_hub import snapshot_download\n    snapshot_download(repo_id="k2-fsa/OmniVoice")'

if old_snippet in c1:
    c1 = c1.replace(old_snippet, new_snippet)
    c1 = c1.replace('del _omni_check', '# Weights downloaded into persistent cache')

nb["cells"][1]["source"] = [l + "\n" for l in c1.split("\n")][:-1]

with open(p, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=2, ensure_ascii=False)

print("SUCCESS: kin_avatar_unified_colab.ipynb updated with snapshot_download!")
