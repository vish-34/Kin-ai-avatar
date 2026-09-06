import json
import re
from pathlib import Path

nb_path = Path(r"c:\Users\vishal\Desktop\Kin-ai-avatar\Backend\kin_avatar_unified_colab.ipynb")
with open(nb_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

# In Cell 1 (index 1):
# Add at top of Cell 1:
# BASE_DIR = '/content' if os.path.exists('/content') else os.path.abspath(os.getcwd())
# os.makedirs(f"{BASE_DIR}/bin", exist_ok=True)
# Replace '/content/' with f'{BASE_DIR}/'

cell1 = nb["cells"][1]["source"]

# Check Cell 1 lines
cell1_text = "".join(cell1)

# Ensure BASE_DIR definition is added right after "import os, sys, shutil, subprocess, urllib.request\n"
base_dir_code = (
    "\n# Automatically detect environment (Google Colab vs Lightning AI / Linux Cloud)\n"
    "BASE_DIR = '/content' if os.path.exists('/content') else os.path.abspath(os.getcwd())\n"
    "os.makedirs(f'{BASE_DIR}/bin', exist_ok=True)\n"
    "print(f'Working Base Directory: {BASE_DIR}')\n"
)

cell1_text = cell1_text.replace(
    "import os, sys, shutil, subprocess, urllib.request\n",
    "import os, sys, shutil, subprocess, urllib.request\n" + base_dir_code
)

# Now replace /content in cell 1:
cell1_text = cell1_text.replace("'/content/bin/micromamba'", "f'{BASE_DIR}/bin/micromamba'")
cell1_text = cell1_text.replace("-C /content/ bin/micromamba", "-C {BASE_DIR}/ bin/micromamba")
cell1_text = cell1_text.replace("'/content/env'", "f'{BASE_DIR}/env'")
cell1_text = cell1_text.replace("/content/bin/micromamba create -y -p /content/env", "{BASE_DIR}/bin/micromamba create -y -p {BASE_DIR}/env")
cell1_text = cell1_text.replace("'/content/env/bin/python'", "f'{BASE_DIR}/env/bin/python'")
cell1_text = cell1_text.replace("'/content/env/bin/pip'", "f'{BASE_DIR}/env/bin/pip'")
cell1_text = cell1_text.replace("'/content/MuseTalk'", "f'{BASE_DIR}/MuseTalk'")
cell1_text = cell1_text.replace("'/content/env/lib/python3.10/site-packages/mmdet/__init__.py'", "f'{BASE_DIR}/env/lib/python3.10/site-packages/mmdet/__init__.py'")
cell1_text = cell1_text.replace("'/content/input_data'", "f'{BASE_DIR}/input_data'")

# Re-split cell1
nb["cells"][1]["source"] = [l + "\n" for l in cell1_text.split("\n")][:-1]

# In Cell 2 (index 2):
cell2_text = "".join(nb["cells"][2]["source"])
base_dir_code_cell2 = (
    "\n# Automatically detect environment (Google Colab vs Lightning AI / Linux Cloud)\n"
    "BASE_DIR = '/content' if os.path.exists('/content') else os.path.abspath(os.getcwd())\n"
)
cell2_text = cell2_text.replace(
    "import os, sys, time, subprocess, requests, re\n",
    "import os, sys, time, subprocess, requests, re\n" + base_dir_code_cell2
)

cell2_text = cell2_text.replace("'/content/MuseTalk'", "f'{BASE_DIR}/MuseTalk'")
cell2_text = cell2_text.replace("'/content/MuseTalk/colab_musetalk_server.py'", "f'{BASE_DIR}/MuseTalk/colab_musetalk_server.py'")
cell2_text = cell2_text.replace("'/content/unified_colab_server.py'", "f'{BASE_DIR}/unified_colab_server.py'")
cell2_text = cell2_text.replace('"/content/env/bin/python"', 'f"{BASE_DIR}/env/bin/python"')
cell2_text = cell2_text.replace('"/content/MuseTalk/colab_musetalk_server.py"', 'f"{BASE_DIR}/MuseTalk/colab_musetalk_server.py"')
cell2_text = cell2_text.replace('"/content/unified_colab_server.py"', 'f"{BASE_DIR}/unified_colab_server.py"')
cell2_text = cell2_text.replace("'/content/bin/cloudflared'", "f'{BASE_DIR}/bin/cloudflared'")
cell2_text = cell2_text.replace("'/content/bin'", "f'{BASE_DIR}/bin'")
cell2_text = cell2_text.replace("-o /content/bin/cloudflared", "-o {BASE_DIR}/bin/cloudflared")
cell2_text = cell2_text.replace("!chmod +x /content/bin/cloudflared", "!chmod +x {BASE_DIR}/bin/cloudflared")
cell2_text = cell2_text.replace('"/content/bin/cloudflared"', 'f"{BASE_DIR}/bin/cloudflared"')

nb["cells"][2]["source"] = [l + "\n" for l in cell2_text.split("\n")][:-1]

# In Cell 3 (index 3):
cell3_text = "".join(nb["cells"][3]["source"])
cell3_text = cell3_text.replace('"/content/unified_output.mp4"', 'f"{BASE_DIR}/unified_output.mp4"')
nb["cells"][3]["source"] = [l + "\n" for l in cell3_text.split("\n")][:-1]

with open(nb_path, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=2, ensure_ascii=False)

print("SUCCESS: Notebook updated with universal BASE_DIR support!")
