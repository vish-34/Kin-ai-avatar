import json
import sys
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

backend_dir = Path(__file__).resolve().parent.parent
musetalk_server_path = backend_dir / "Avatar" / "colab_musetalk_server.py"
unified_server_path = backend_dir / "unified_colab_server.py"

musetalk_code = musetalk_server_path.read_text(encoding="utf-8")
unified_code = unified_server_path.read_text(encoding="utf-8")

# Escape triple quotes and backslashes for embedding inside Python string
escaped_musetalk = musetalk_code.replace('\\', '\\\\').replace('"""', r'\"\"\"')
escaped_unified = unified_code.replace('\\', '\\\\').replace('"""', r'\"\"\"')

def build_cell2_code():
    header = '''#@title 🚀 Step 2: Launch Unified GPU Server & Single Public Tunnel
#@markdown Starts both MuseTalk (Port 8001) and OmniVoice (Port 8000) and exposes a single public link.

tunnel_provider = "Cloudflare (Recommended - Free, No Token)" #@param ["Cloudflare (Recommended - Free, No Token)", "ngrok (Requires Auth Token)"]
ngrok_auth_token = "" #@param {type:"string"}
musetalk_version = "v1.5" #@param ["v1.5", "v1.0"]
public_port = 8000 #@param {type:"integer"}

import os, sys, time, json, subprocess, urllib.request

IS_KAGGLE = os.path.exists('/kaggle')
IS_COLAB = 'google.colab' in sys.modules or os.path.exists('/content')
BASE_DIR = '/kaggle/working' if IS_KAGGLE else ('/content' if os.path.exists('/content') else os.path.abspath('.'))
MUSETALK_DIR = f'{BASE_DIR}/MuseTalk'

%cd {MUSETALK_DIR}

# 1. Terminate any previous running server processes and clean GPU memory
!fuser -k -9 8000/tcp 8001/tcp > /dev/null 2>&1 || true
!pkill -9 -f "colab_musetalk_server.py" > /dev/null 2>&1 || true
!pkill -9 -f "unified_colab_server.py" > /dev/null 2>&1 || true
!pkill -9 -f "uvicorn" > /dev/null 2>&1 || true
!pkill -9 -f "cloudflared" > /dev/null 2>&1 || true
!pkill -9 -f "ngrok" > /dev/null 2>&1 || true
time.sleep(2)

# Release any CUDA memory held by notebook kernel
try:
    import torch, gc
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        gc.collect()
        print("⚡ GPU cache cleared in notebook kernel.")
except Exception:
    pass

# 2. Write the MuseTalk Internal Server Script (Runs on Port 8001)
musetalk_server_code = """''' + escaped_musetalk + '''"""
with open(f'{MUSETALK_DIR}/colab_musetalk_server.py', 'w', encoding='utf-8') as f:
    f.write(musetalk_server_code)

# 3. Write the Unified Gateway & OmniVoice Server Script (Runs on Port 8000)
unified_server_code = """''' + escaped_unified + '''"""
with open(f'{BASE_DIR}/unified_colab_server.py', 'w', encoding='utf-8') as f:
    f.write(unified_server_code)

print("✅ Server scripts deployed successfully.")

# 4. Start MuseTalk Server in background on Port 8001
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
musetalk_env['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'

musetalk_proc = subprocess.Popen(
    [f"{BASE_DIR}/env/bin/python", "-u", f"{MUSETALK_DIR}/colab_musetalk_server.py"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
    env=musetalk_env
)

# Wait for MuseTalk readiness
print("⏳ Initializing MuseTalk neural weights in GPU memory...")
musetalk_ready = False
for _ in range(60):
    try:
        req = urllib.request.urlopen("http://127.0.0.1:8001/health", timeout=2)
        if req.status == 200:
            info = json.loads(req.read().decode())
            print(f"✅ MuseTalk Engine Ready! Device: {info.get('device')} | VRAM: {info.get('vram_gb')} GB")
            musetalk_ready = True
            break
    except Exception:
        time.sleep(1)

if not musetalk_ready:
    print("⚠️ MuseTalk startup waiting timed out, continuing to launch gateway...")

# 5. Start Unified Server on Port 8000 (Hosts OmniVoice + Proxies MuseTalk)
print("\\n🚀 [2/3] Starting Unified Gateway & OmniVoice Engine on Port 8000...")
unified_env = os.environ.copy()
unified_env['MUSETALK_INTERNAL_URL'] = 'http://127.0.0.1:8001'
unified_env['HF_HOME'] = f'{BASE_DIR}/cache/huggingface'
unified_env['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'

unified_proc = subprocess.Popen(
    [sys.executable, "-u", f"{BASE_DIR}/unified_colab_server.py"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
    env=unified_env
)

# Wait for Unified server readiness
print("⏳ Initializing OmniVoice zero-shot voice cloner...")
unified_ready = False
for _ in range(60):
    try:
        req = urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=2)
        if req.status == 200:
            info = json.loads(req.read().decode())
            print(f"✅ Unified Server Ready! Voice: {info.get('voice_ready')} | Avatar: {info.get('avatar_ready')}")
            unified_ready = True
            break
    except Exception:
        time.sleep(1)

# 6. Establish Single Public Tunnel on Port 8000
print("\\n🌐 [3/3] Establishing Single Public Tunnel on Port 8000...")
public_url = ""
if "Cloudflare" in tunnel_provider:
    cf_bin = f'{BASE_DIR}/bin/cloudflared'
    if not os.path.exists(cf_bin):
        os.makedirs(f'{BASE_DIR}/bin', exist_ok=True)
        print("📥 Downloading cloudflared binary...")
        !curl -s -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o {cf_bin}
        !chmod +x {cf_bin}
    else:
        print(f"⚡ Using cached cloudflared binary at {cf_bin}")

    cl_proc = subprocess.Popen(
        [cf_bin, "tunnel", "--url", f"http://127.0.0.1:{public_port}"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    import re
    for _ in range(50):
        line = cl_proc.stdout.readline()
        if line:
            m = re.search(r"https://[a-zA-Z0-9-]+\\.trycloudflare\\.com", line)
            if m:
                public_url = m.group(0).strip()
                break
        time.sleep(0.4)

    if not public_url:
        from pycloudflared import try_cloudflare
        cl_tunnel = try_cloudflare(port=public_port)
        public_url = getattr(cl_tunnel, "tunnel", getattr(cl_tunnel, "tunnel_url", str(cl_tunnel[0]))).strip().rstrip("/")
else:
    from pyngrok import ngrok
    token = ngrok_auth_token.strip()
    if token:
        ngrok.set_auth_token(token)
    else:
        print("⚠️ Warning: No ngrok token provided. Get one from https://dashboard.ngrok.com")
    ng_tunnel = ngrok.connect(public_port, "http")
    public_url = ng_tunnel.public_url.strip().rstrip("/")

# 7. Display Unified Connection Banner
print("\\n" + "=" * 76)
print("🎉 KIN-AI UNIFIED VOICE & AVATAR GPU SERVER IS ONLINE!")
print("=" * 76)
print(f"\\n🔗 SINGLE PUBLIC TUNNEL URL: \\033[1;32m{public_url}\\033[0m")
print("\\n👉 Paste this link into your Backend/.env:")
print(f"   COLAB_SERVER_URL = '{public_url}'")
print(f"   KAGGLE_SERVER_URL = '{public_url}'")
print("=" * 76)
print("\\nℹ️ Server is streaming live logs below (Press Stop button to terminate):\\n")

try:
    while True:
        line = unified_proc.stdout.readline()
        if not line and unified_proc.poll() is not None:
            break
        if line:
            print("[Gateway] ", line.rstrip())
except KeyboardInterrupt:
    print("\\n🛑 Server stopped by user.")
    musetalk_proc.terminate()
    unified_proc.terminate()
'''
    return header

cell2_source_lines = [l + "\n" for l in build_cell2_code().split("\n")]
# Remove trailing extra newline if present
if cell2_source_lines and cell2_source_lines[-1] == "\n":
    cell2_source_lines = cell2_source_lines[:-1]

target_nbs = [
    backend_dir / "kin_avatar_unified_colab.ipynb",
    backend_dir / "Avatar" / "MuseTalk_Colab_Fixed.ipynb",
    backend_dir / "Avatar" / "musetalk_avatar_colab.ipynb",
]

for nb_path in target_nbs:
    if not nb_path.exists():
        continue
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    # Find cell 2 or cell with Step 2
    step2_found = False
    for cell in nb["cells"]:
        if cell.get("cell_type") == "code":
            src = "".join(cell.get("source", []))
            if "Step 2: Launch Unified GPU Server" in src:
                cell["source"] = cell2_source_lines
                step2_found = True
                print(f"✅ Replaced Step 2 in {nb_path.name}")
                break

    if not step2_found:
        print(f"❌ Could not find Step 2 in {nb_path.name}")
        continue

    with open(nb_path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=2, ensure_ascii=False)
    print(f"🎉 Saved {nb_path.name}")

print("\nValidating patched notebooks...")
for nb_path in target_nbs:
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)
    step2_src = ""
    for cell in nb["cells"]:
        if cell.get("cell_type") == "code":
            src = "".join(cell.get("source", []))
            if "Step 2: Launch Unified GPU Server" in src:
                step2_src = src
                break
    assert "musetalk_ready = False" in step2_src, f"musetalk_ready = False missing in {nb_path.name}"
    assert "musetalk_ready = True" in step2_src, f"musetalk_ready = True missing in {nb_path.name}"
    assert "if not musetalk_ready:" in step2_src, f"if not musetalk_ready: missing in {nb_path.name}"
    idx_false = step2_src.find("musetalk_ready = False")
    idx_true = step2_src.find("musetalk_ready = True")
    idx_check = step2_src.find("if not musetalk_ready:")
    assert idx_false < idx_true < idx_check, f"Incorrect order in {nb_path.name}"
    print(f"✅ {nb_path.name} validated successfully! (Step 2 length: {len(step2_src)})")
