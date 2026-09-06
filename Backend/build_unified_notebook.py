# -*- coding: utf-8 -*-
"""
build_unified_notebook.py
Generates the unified Google Colab notebook:
Backend/kin_avatar_unified_colab.ipynb
Combining OmniVoice and MuseTalk into a single notebook and single public tunnel.
"""

import json
import sys
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def generate_unified_notebook():
    backend_dir = Path(__file__).resolve().parent
    musetalk_server_code = (backend_dir / "Avatar" / "colab_musetalk_server.py").read_text(encoding="utf-8")
    unified_server_code = (backend_dir / "unified_colab_server.py").read_text(encoding="utf-8")

    cells = []

    # =============================================================
    # CELL 0: Markdown Introduction
    # =============================================================
    cell0_md = """# 🎙️🎭 Kin-AI: Unified Voice & Avatar GPU Server
### Real-Time OmniVoice Zero-Shot TTS & MuseTalk Neural Talking Avatar on a Single Colab T4 GPU

This unified notebook powers **Kin-ai-avatar**, simultaneously running both AI engines on a single Google Colab GPU:
1. **🎙️ OmniVoice Zero-Shot Voice Cloning & TTS**: Ultra-fast voice cloning with persistent `VoiceClonePrompt` caching and streaming NDJSON synthesis.
2. **🎭 MuseTalk Neural Talking Avatar (v1.5 / v1.0)**: Photorealistic real-time audio-to-face synthesis at **30+ FPS** with living ping-pong motion looping and 0ms latent caching.
3. **🌐 Single Public Tunnel URL**: One Cloudflare or ngrok URL serves **all** voice and avatar endpoints seamlessly to your local application.

---

### ⚡ Quickstart:
1. **Runtime > Change runtime type > T4 GPU** (or A100 / L4).
2. Run **Step 1** (Setup Environment & Weights, ~4-5 mins).
3. Run **Step 2** (Launch Unified Server & Single Tunnel).
4. Copy the **Single Public Tunnel URL** into `Backend/.env` as `COLAB_SERVER_URL` (or set both `COLAB_VOICE_URL` and `COLAB_AVATAR_URL` to the same link).
"""
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [line + "\n" for line in cell0_md.strip().split("\n")]
    })

    # =============================================================
    # CELL 1: Setup Environment & Model Weights
    # =============================================================
    cell1_code = """#@title 🚀 Step 1: Automated Setup (OmniVoice + MuseTalk Dependencies & Weights)
#@markdown Prepares both AI environments: isolated Python 3.10 for MuseTalk (Torch 2.1.2 + MMCV 2.1.0) and installs OmniVoice in base Colab (~4-5 mins).

import os, sys, shutil, subprocess, urllib.request

print("=" * 70)
print("[1/6] Verifying GPU...")
print("=" * 70)
!nvidia-smi --query-gpu=name,memory.total --format=csv,noheader

print("\\n" + "=" * 70)
print("[2/6] Installing OmniVoice & Gateway Dependencies in Base Colab...")
print("=" * 70)
!pip install -q omnivoice soundfile "fastapi>=0.100.0" "uvicorn[standard]" httpx python-multipart pycloudflared pyngrok WeTextProcessing librosa pydub

print("\\n" + "=" * 70)
print("[3/6] Creating Isolated Python 3.10 Environment for MuseTalk (micromamba)...")
print("=" * 70)
if not os.path.exists('/content/bin/micromamba'):
    !curl -Ls https://micro.mamba.pm/api/micromamba/linux-64/latest | tar -xvj -C /content/ bin/micromamba > /dev/null 2>&1

if not os.path.exists('/content/env'):
    !/content/bin/micromamba create -y -p /content/env python=3.10 pip git ffmpeg -c conda-forge > /dev/null 2>&1

ENV_PYTHON = '/content/env/bin/python'
ENV_PIP = '/content/env/bin/pip'
!{ENV_PYTHON} --version

print("\\n" + "=" * 70)
print("[4/6] Cloning MuseTalk Repository...")
print("=" * 70)
MUSETALK_DIR = '/content/MuseTalk'
if not os.path.exists(MUSETALK_DIR):
    !git clone -b main https://github.com/TMElyralab/MuseTalk.git {MUSETALK_DIR}
else:
    print("Repository already exists.")

%cd {MUSETALK_DIR}

print("\\n" + "=" * 70)
print("[5/6] Installing MuseTalk OpenMMLab & PyTorch 2.1.2 Stack...")
print("=" * 70)
!{ENV_PIP} install -q torch==2.1.2 torchvision==0.16.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cu121
!{ENV_PIP} install -q mmengine
!{ENV_PIP} install -q mmcv==2.1.0 -f https://download.openmmlab.com/mmcv/dist/cu121/torch2.1/index.html
!{ENV_PIP} install -q --no-build-isolation chumpy
!{ENV_PIP} install -q 'mmdet>=3.2.0' mmpose==1.1.0

import glob
mmdet_inits = glob.glob('/content/env/lib/python3.10/site-packages/mmdet/__init__.py')
if mmdet_inits:
    !sed -i "s/mmcv_maximum_version = .*/mmcv_maximum_version = '2.2.0'/" {mmdet_inits[0]}

!{ENV_PIP} install -q \\
    diffusers==0.30.2 \\
    accelerate==0.28.0 \\
    soundfile==0.12.1 \\
    librosa==0.11.0 \\
    einops==0.8.1 \\
    omegaconf \\
    imageio \\
    imageio-ffmpeg \\
    ffmpeg-python \\
    moviepy==1.0.3 \\
    gdown \\
    tqdm \\
    pyyaml \\
    matplotlib-inline \\
    'gradio==4.44.1' \\
    'transformers>=4.39.2,<4.45.0' \\
    'huggingface_hub>=0.23.2,<1.0' \\
    'fastapi' \\
    'uvicorn[standard]' \\
    'python-multipart' \\
    'requests' \\
    'numpy==1.26.4' \\
    'opencv-python==4.9.0.80' \\
    'setuptools<81'

print("\\n" + "=" * 70)
print("[6/6] Downloading Official Model Weights...")
print("=" * 70)
os.makedirs('models/dwpose', exist_ok=True)
os.makedirs('models/sd-vae', exist_ok=True)
os.makedirs('models/sd-vae-ft-mse', exist_ok=True)
os.makedirs('models/whisper', exist_ok=True)
os.makedirs('models/face-parse-bisent', exist_ok=True)
os.makedirs('models/musetalk', exist_ok=True)
os.makedirs('models/musetalkV15', exist_ok=True)
os.makedirs('/content/input_data', exist_ok=True)

# DWPose
if not os.path.exists('models/dwpose/dw-ll_ucoco_384.pth') or os.path.getsize('models/dwpose/dw-ll_ucoco_384.pth') < 1000:
    !wget -q --show-progress -O models/dwpose/dw-ll_ucoco_384.pth \\
        'https://huggingface.co/yzd-v/DWPose/resolve/main/dw-ll_ucoco_384.pth'

# SD-VAE
if not os.path.exists('models/sd-vae/config.json'):
    !wget -q -O models/sd-vae/config.json \\
        'https://huggingface.co/stabilityai/sd-vae-ft-mse/resolve/main/config.json'
if not os.path.exists('models/sd-vae/diffusion_pytorch_model.bin') or os.path.getsize('models/sd-vae/diffusion_pytorch_model.bin') < 1000:
    !wget -q --show-progress -O models/sd-vae/diffusion_pytorch_model.bin \\
        'https://huggingface.co/stabilityai/sd-vae-ft-mse/resolve/main/diffusion_pytorch_model.bin'
shutil.copy2('models/sd-vae/config.json', 'models/sd-vae-ft-mse/config.json')
shutil.copy2('models/sd-vae/diffusion_pytorch_model.bin', 'models/sd-vae-ft-mse/diffusion_pytorch_model.bin')

# Face Parse BiSeNet
if not os.path.exists('models/face-parse-bisent/79999_iter.pth') or os.path.getsize('models/face-parse-bisent/79999_iter.pth') < 1000:
    !wget -q --show-progress -O models/face-parse-bisent/79999_iter.pth \\
        'https://huggingface.co/ManyOtherFunctions/face-parse-bisent/resolve/main/79999_iter.pth'
if not os.path.exists('models/face-parse-bisent/resnet18-5c106cde.pth') or os.path.getsize('models/face-parse-bisent/resnet18-5c106cde.pth') < 1000:
    !wget -q --show-progress -O models/face-parse-bisent/resnet18-5c106cde.pth \\
        'https://download.pytorch.org/models/resnet18-5c106cde.pth'

# MuseTalk V1.0
if not os.path.exists('models/musetalk/musetalk.json'):
    !wget -q -O models/musetalk/musetalk.json \\
        'https://huggingface.co/TMElyralab/MuseTalk/resolve/main/musetalk/musetalk.json'
if not os.path.exists('models/musetalk/pytorch_model.bin') or os.path.getsize('models/musetalk/pytorch_model.bin') < 1000:
    !wget -q --show-progress -O models/musetalk/pytorch_model.bin \\
        'https://huggingface.co/TMElyralab/MuseTalk/resolve/main/musetalk/pytorch_model.bin'
shutil.copy2('models/musetalk/musetalk.json', 'models/musetalk/config.json')

# MuseTalk V1.5
if not os.path.exists('models/musetalkV15/musetalk.json'):
    !wget -q -O models/musetalkV15/musetalk.json \\
        'https://huggingface.co/TMElyralab/MuseTalk/resolve/main/musetalkV15/musetalk.json'
if not os.path.exists('models/musetalkV15/unet.pth') or os.path.getsize('models/musetalkV15/unet.pth') < 1000:
    !wget -q --show-progress -O models/musetalkV15/unet.pth \\
        'https://huggingface.co/TMElyralab/MuseTalk/resolve/main/musetalkV15/unet.pth'
shutil.copy2('models/musetalkV15/musetalk.json', 'models/musetalkV15/config.json')

# Whisper Tiny
whisper_files = ['config.json', 'preprocessor_config.json', 'tokenizer.json',
                 'vocab.json', 'merges.txt', 'special_tokens_map.json',
                 'tokenizer_config.json', 'generation_config.json', 'model.safetensors']
for wf in whisper_files:
    dst = f'models/whisper/{wf}'
    if not os.path.exists(dst) or os.path.getsize(dst) < 10:
        !wget -q -O {dst} 'https://huggingface.co/openai/whisper-tiny/resolve/main/{wf}'

whisper_pt = 'models/whisper/tiny.pt'
if not os.path.exists(whisper_pt) or os.path.getsize(whisper_pt) < 1000:
    !curl -sL -A 'Mozilla/5.0' -o {whisper_pt} 'https://openaipublic.blob.core.windows.net/whisper/models/65147644a518d1260e3c49e477f2925e2c8f61831a6d6415a4c7f9b180e66772/tiny.pt'

print("\\n🎉 SETUP COMPLETE! Both OmniVoice & MuseTalk environments are ready.")
print("👉 Proceed to Step 2 to launch the Unified Server & Public Tunnel.")
"""
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [line + "\n" for line in cell1_code.strip().split("\n")]
    })

    # =============================================================
    # CELL 2: Launch Real-Time Unified Server & Single Public Tunnel
    # =============================================================
    escaped_musetalk_server = musetalk_server_code.replace('\\', '\\\\').replace('"""', '\\"\\"\\"')
    escaped_unified_server = unified_server_code.replace('\\', '\\\\').replace('"""', '\\"\\"\\"')

    cell2_code = f"""#@title 🚀 Step 2: Launch Unified GPU Server & Single Public Tunnel
#@markdown Starts both MuseTalk (Port 8001) and OmniVoice (Port 8000) and exposes a single public link.

tunnel_provider = "Cloudflare (Recommended - Free, No Token)" #@param ["Cloudflare (Recommended - Free, No Token)", "ngrok (Requires Auth Token)"]
ngrok_auth_token = "" #@param {{type:"string"}}
musetalk_version = "v1.5" #@param ["v1.5", "v1.0"]
public_port = 8000 #@param {{type:"integer"}}

import os, sys, time, json, subprocess, urllib.request

MUSETALK_DIR = '/content/MuseTalk'
%cd {{MUSETALK_DIR}}

# 1. Terminate any previous running server processes
!pkill -f "colab_musetalk_server.py" > /dev/null 2>&1
!pkill -f "unified_colab_server.py" > /dev/null 2>&1
!pkill -f "uvicorn" > /dev/null 2>&1
!pkill -f "cloudflared" > /dev/null 2>&1
!pkill -f "ngrok" > /dev/null 2>&1
time.sleep(1)

# 2. Write the MuseTalk Internal Server Script (Runs on Port 8001)
musetalk_server_code = \"\"\"{escaped_musetalk_server}\"\"\"
with open('/content/MuseTalk/colab_musetalk_server.py', 'w', encoding='utf-8') as f:
    f.write(musetalk_server_code)

# 3. Write the Unified Gateway & OmniVoice Server Script (Runs on Port 8000)
unified_server_code = \"\"\"{escaped_unified_server}\"\"\"
with open('/content/unified_colab_server.py', 'w', encoding='utf-8') as f:
    f.write(unified_server_code)

print("✅ Server scripts deployed successfully.")

# 4. Start MuseTalk Server in background on Port 8001
print("🚀 [1/3] Starting MuseTalk Neural Lip-Sync Engine on Port 8001...")
musetalk_env = os.environ.copy()
musetalk_env['PORT'] = '8001'
musetalk_env['MUSETALK_VERSION'] = 'v15' if musetalk_version == 'v1.5' else 'v1'

musetalk_proc = subprocess.Popen(
    ["/content/env/bin/python", "-u", "/content/MuseTalk/colab_musetalk_server.py"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
    env=musetalk_env
)

# Wait for MuseTalk readiness
print("⏳ Initializing MuseTalk neural weights...")
musetalk_ready = False
for _ in range(60):
    try:
        req = urllib.request.urlopen("http://127.0.0.1:8001/health", timeout=2)
        if req.status == 200:
            info = json.loads(req.read().decode())
            print(f"✅ MuseTalk Engine Ready! Device: {{info.get('device')}} | VRAM: {{info.get('vram_gb')}} GB")
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

unified_proc = subprocess.Popen(
    [sys.executable, "-u", "/content/unified_colab_server.py"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
    env=unified_env
)

# Wait for Unified server readiness
print("⏳ Initializing OmniVoice and Gateway...")
unified_ready = False
for _ in range(60):
    try:
        req = urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=2)
        if req.status == 200:
            info = json.loads(req.read().decode())
            print(f"✅ Unified Server Ready! Voice: {{info.get('voice_ready')}} | Avatar: {{info.get('avatar_ready')}}")
            unified_ready = True
            break
    except Exception:
        time.sleep(1)

# 6. Establish Single Public Tunnel on Port 8000
print("\\n🌐 [3/3] Establishing Single Public Tunnel on Port 8000...")
public_url = ""
if "Cloudflare" in tunnel_provider:
    if not os.path.exists('/content/bin/cloudflared'):
        os.makedirs('/content/bin', exist_ok=True)
        print("📥 Downloading cloudflared binary...")
        !curl -s -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /content/bin/cloudflared
        !chmod +x /content/bin/cloudflared

    cl_proc = subprocess.Popen(
        ["/content/bin/cloudflared", "tunnel", "--url", f"http://127.0.0.1:{{public_port}}"],
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
print(f"\\n🔗 SINGLE PUBLIC TUNNEL URL: \\033[1;32m{{public_url}}\\033[0m")
print("\\n👉 Paste this SINGLE link into your Backend/.env:")
print(f"   COLAB_SERVER_URL = {{public_url}}")
print(f"   COLAB_VOICE_URL  = {{public_url}}")
print(f"   COLAB_AVATAR_URL = {{public_url}}")
print("\\n👉 Run both modules locally using this one URL:")
print("   - Voice Studio:  python Backend/Voice/interactive_voice.py")
print("   - Avatar Studio: python Backend/Avatar/interactive_avatar.py")
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
"""
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [line + "\n" for line in cell2_code.strip().split("\n")]
    })

    # =============================================================
    # CELL 3: Direct In-Colab Quick Test
    # =============================================================
    cell3_code = """#@title 🎬 (Optional) Step 3: All-In-One Test Inside Colab (Text ➔ Voice ➔ Video)
#@markdown Test the full pipeline directly inside Google Colab:

test_text = "Hello! I am your AI avatar, running on a single Google Colab GPU server." #@param {type:"string"}
speaker_name = "default" #@param {type:"string"}
avatar_id = "test_avatar" #@param {type:"string"}

import os, requests
from google.colab import files
from IPython.display import display, HTML
from base64 import b64encode

SERVER_URL = "http://127.0.0.1:8000"

print("🔍 Checking Unified Server Health...")
r = requests.get(f"{SERVER_URL}/health", timeout=5)
print("Server status:", r.json())

# Check if avatar exists, if not prompt upload
cached_avatars = r.json().get("cached_avatars", [])
if not cached_avatars:
    print("\\n📸 Upload an avatar photo (.jpg, .png) or video (.mp4):")
    up = files.upload()
    if up:
        f_name = list(up.keys())[0]
        with open(f_name, "rb") as f:
            resp = requests.post(f"{SERVER_URL}/register_avatar", data={"avatar_id": avatar_id}, files={"file": f})
        print("✅ Avatar registered:", resp.json())
else:
    avatar_id = cached_avatars[0]
    print(f"⚡ Using existing cached avatar: '{avatar_id}'")

print(f"\\n🎙️ Synthesizing voice and rendering avatar video for: '{test_text}'...")
res = requests.post(
    f"{SERVER_URL}/synthesize_and_lipsync",
    json={"text": test_text, "speaker_name": speaker_name, "avatar_id": avatar_id, "num_step": 16, "stream": False},
    timeout=180
)
res.raise_for_status()

out_path = "/content/unified_output.mp4"
with open(out_path, "wb") as f:
    f.write(res.content)

print(f"\\n🎉 Generated Video saved ({len(res.content) // 1024} KB)!")
mp4 = open(out_path, 'rb').read()
data_url = "data:video/mp4;base64," + b64encode(mp4).decode()
display(HTML(f'''
<video width="480" height="480" controls autoplay style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
    <source src="{data_url}" type="video/mp4">
</video>
'''))
"""
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [line + "\n" for line in cell3_code.strip().split("\n")]
    })

    notebook = {
        "cells": cells,
        "metadata": {
            "accelerator": "GPU",
            "colab": {
                "gpuType": "T4",
                "provenance": []
            },
            "language_info": {
                "name": "python"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 0
    }

    # Write Backend/kin_avatar_unified_colab.ipynb
    target_path = backend_dir / "kin_avatar_unified_colab.ipynb"
    target_path.write_text(json.dumps(notebook, indent=2), encoding="utf-8")
    print(f"✅ Generated {target_path}")

    # Also update Backend/Avatar/musetalk_avatar_colab.ipynb and MuseTalk_Colab_Fixed.ipynb
    (backend_dir / "Avatar" / "musetalk_avatar_colab.ipynb").write_text(json.dumps(notebook, indent=2), encoding="utf-8")
    print("✅ Updated Backend/Avatar/musetalk_avatar_colab.ipynb")

    (backend_dir / "Avatar" / "MuseTalk_Colab_Fixed.ipynb").write_text(json.dumps(notebook, indent=2), encoding="utf-8")
    print("✅ Updated Backend/Avatar/MuseTalk_Colab_Fixed.ipynb")

if __name__ == "__main__":
    generate_unified_notebook()
