import json
from pathlib import Path

target_files = [
    Path(r"c:\Users\vishal\Desktop\Kin-ai-avatar\Backend\kin_avatar_unified_colab.ipynb"),
    Path(r"c:\Users\vishal\Desktop\Kin-ai-avatar\Backend\Avatar\MuseTalk_Colab_Fixed.ipynb"),
    Path(r"c:\Users\vishal\Desktop\Kin-ai-avatar\Backend\Avatar\musetalk_avatar_colab.ipynb"),
]

old_setup_target = """if not os.path.exists(f'{BASE_DIR}/bin/micromamba'):
    print("📥 Downloading micromamba package manager...")
    !curl -Ls https://micro.mamba.pm/api/micromamba/linux-64/latest | tar -xvj -C {BASE_DIR}/ bin/micromamba > /dev/null 2>&1

env_operational = False
if os.path.exists(ENV_PYTHON):
    test_run = subprocess.run([ENV_PYTHON, "-c", "import torch, mmcv, diffusers; print('READY')"], capture_output=True, text=True)
    if "READY" in test_run.stdout:
        env_operational = True
        print(f"⚡ MuseTalk environment at {ENV_DIR} is ALREADY installed and verified! Skipping installation.")

if not env_operational:
    if not os.path.exists(ENV_DIR):
        print("📦 Creating isolated conda environment (python=3.10)...")
        !{BASE_DIR}/bin/micromamba create -y -p {ENV_DIR} python=3.10 pip git ffmpeg -c conda-forge > /dev/null 2>&1"""

new_setup_replacement = """MAMBA_ROOT = f'{BASE_DIR}/mamba_root'
os.makedirs(MAMBA_ROOT, exist_ok=True)

if not os.path.exists(f'{BASE_DIR}/bin/micromamba'):
    print("📥 Downloading micromamba package manager...")
    !curl -Ls https://micro.mamba.pm/api/micromamba/linux-64/latest | tar -xvj -C {BASE_DIR}/ bin/micromamba
    !chmod +x {BASE_DIR}/bin/micromamba 2>/dev/null || true

env_operational = False
if os.path.exists(ENV_PYTHON):
    test_run = subprocess.run([ENV_PYTHON, "-c", "import torch, mmcv, diffusers; print('READY')"], capture_output=True, text=True)
    if "READY" in test_run.stdout:
        env_operational = True
        print(f"⚡ MuseTalk environment at {ENV_DIR} is ALREADY installed and verified! Skipping installation.")

if not env_operational:
    if not os.path.exists(ENV_PYTHON):
        print("📦 Creating isolated conda environment (python=3.10)...")
        # Ensure micromamba is executable
        !chmod +x {BASE_DIR}/bin/micromamba 2>/dev/null || true
        
        # 1. Try micromamba with explicit root prefix
        if os.path.exists(f'{BASE_DIR}/bin/micromamba'):
            !{BASE_DIR}/bin/micromamba create -y -r {MAMBA_ROOT} -p {ENV_DIR} python=3.10 pip git ffmpeg -c conda-forge
        
        # 2. Fallback to system conda (preinstalled on Kaggle at /opt/conda) if micromamba failed
        if not os.path.exists(ENV_PYTHON):
            conda_bin = "/opt/conda/bin/conda" if os.path.exists("/opt/conda/bin/conda") else (shutil.which("conda") or "conda")
            print(f"🔄 Using conda ({conda_bin}) as fallback to create Python 3.10 environment...")
            !{conda_bin} create -y -p {ENV_DIR} python=3.10 pip git ffmpeg -c conda-forge
            
        if not os.path.exists(ENV_PYTHON):
            raise RuntimeError(
                f"❌ Failed to create isolated Python 3.10 environment at '{ENV_PYTHON}'!\\n"
                f"Please verify disk space and network connection in your Kaggle/Colab session."
            )
        print(f"✅ Isolated Python environment verified at: {ENV_PYTHON}")"""

old_step2_target = """# 4. Start MuseTalk Server in background on Port 8001
print("🚀 [1/3] Starting MuseTalk Neural Lip-Sync Engine on Port 8001...")
musetalk_env = os.environ.copy()
musetalk_env['PORT'] = '8001'
musetalk_env['MUSETALK_VERSION'] = 'v15' if musetalk_version == 'v1.5' else 'v1'
musetalk_env['HF_HOME'] = f'{BASE_DIR}/cache/huggingface'

musetalk_proc = subprocess.Popen(
    [f"{BASE_DIR}/env/bin/python", "-u", f"{MUSETALK_DIR}/colab_musetalk_server.py"],"""

new_step2_replacement = """# 4. Start MuseTalk Server in background on Port 8001
print("🚀 [1/3] Starting MuseTalk Neural Lip-Sync Engine on Port 8001...")

# Verify environment exists before launching
if not os.path.exists(f"{BASE_DIR}/env/bin/python"):
    raise FileNotFoundError(
        f"❌ Isolated Python environment not found at '{BASE_DIR}/env/bin/python'!\\n"
        f"👉 You MUST run 'Step 1: Automated Setup' first before running Step 2.\\n"
        f"Step 1 downloads model weights and installs the required Python 3.10 + PyTorch 2.1.2 stack."
    )

musetalk_env = os.environ.copy()
musetalk_env['PORT'] = '8001'
musetalk_env['MUSETALK_VERSION'] = 'v15' if musetalk_version == 'v1.5' else 'v1'
musetalk_env['HF_HOME'] = f'{BASE_DIR}/cache/huggingface'

musetalk_proc = subprocess.Popen(
    [f"{BASE_DIR}/env/bin/python", "-u", f"{MUSETALK_DIR}/colab_musetalk_server.py"],"""

for fpath in target_files:
    if not fpath.exists():
        continue
    with open(fpath, "r", encoding="utf-8") as f:
        nb = json.load(f)
    
    # Process Cell 1
    cell1_text = "".join(nb["cells"][1]["source"])
    if old_setup_target in cell1_text:
        cell1_text = cell1_text.replace(old_setup_target, new_setup_replacement)
        nb["cells"][1]["source"] = [l + "\n" for l in cell1_text.split("\n")][:-1]
        print(f"Patched Step 1 in {fpath.name}")
    else:
        print(f"Could not find exact old_setup_target in {fpath.name}")
        
    # Process Cell 2
    cell2_text = "".join(nb["cells"][2]["source"])
    if old_step2_target in cell2_text:
        cell2_text = cell2_text.replace(old_step2_target, new_step2_replacement)
        nb["cells"][2]["source"] = [l + "\n" for l in cell2_text.split("\n")][:-1]
        print(f"Patched Step 2 in {fpath.name}")
    else:
        print(f"Could not find exact old_step2_target in {fpath.name}")

    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=2, ensure_ascii=False)

print("Finished patching notebooks!")
