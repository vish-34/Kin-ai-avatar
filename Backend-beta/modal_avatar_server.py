"""
modal_avatar_server.py
Native Modal.com Serverless GPU Deployment for Kin-AI-Avatar (OmniVoice + MuseTalk).

Features:
- Deploys as a direct, high-speed serverless HTTPS endpoint (Zero Cloudflare tunnel latency).
- Auto-scales to NVIDIA A100 (40GB) or L4 (24GB) GPU in seconds.
- Persistent Model Volume caches weights permanently (no re-downloading).
- Zero-cost idle: scales down to 0 when you stop talking to save your free credits.
"""

import os
import sys
from pathlib import Path

try:
    import modal
except ImportError:
    print("[Error] Modal is not installed locally. Run: pip install modal")
    sys.exit(1)

# 1. Define Modal App
app = modal.App("kin-avatar-engine")

# 2. Persistent Storage Volume for Weights & Cached Avatars
cache_volume = modal.Volume.from_name("kin-avatar-cache", create_if_missing=True)

# 3. Dedicated GPU Container Image
# Configured with Python 3.10, PyTorch 2.1.2 + CUDA 12.1, MMCV 2.1.0, OmniVoice, and MuseTalk
avatar_image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git", "ffmpeg", "curl", "build-essential", "libgl1", "libglib2.0-0")
    .pip_install(
        "torch==2.1.2",
        "torchvision==0.16.2",
        "torchaudio==2.1.2",
        index_url="https://download.pytorch.org/whl/cu121"
    )
    .pip_install(
        "mmengine",
        "mmcv==2.1.0",
        find_links="https://download.openmmlab.com/mmcv/dist/cu121/torch2.1/index.html"
    )
    .pip_install(
        "chumpy",
        "mmdet>=3.2.0",
        "mmpose==1.1.0",
        "diffusers==0.30.2",
        "accelerate==0.28.0",
        "soundfile==0.12.1",
        "librosa==0.11.0",
        "einops==0.8.1",
        "omegaconf",
        "imageio",
        "imageio-ffmpeg",
        "moviepy==1.0.3",
        "fastapi>=0.100.0",
        "uvicorn[standard]",
        "httpx",
        "python-multipart",
        "pydub",
        "tqdm",
        "pyyaml",
        "omnivoice"
    )
    .run_commands(
        # Clone MuseTalk if not present
        "git clone -b main https://github.com/TMElyralab/MuseTalk.git /root/MuseTalk || true",
        # Fix mmdet mmcv maximum version compatibility check
        "sed -i \"s/mmcv_maximum_version = .*/mmcv_maximum_version = '2.2.0'/g\" /usr/local/lib/python3.10/site-packages/mmdet/__init__.py 2>/dev/null || true"
    )
)


@app.function(
    gpu="A100",  # Switch to "L4" if you want to use the L4 GPU instead
    image=avatar_image,
    volumes={"/root/cache": cache_volume},
    timeout=300,
    scaledown_window=120  # Keep warm for 2 minutes after last question for instant response
)
@modal.asgi_app()
def fastapi_app():
    """
    Mounts and serves the unified Kin-AI server as an enterprise serverless endpoint.
    """
    import os
    import sys

    # Add MuseTalk to sys.path
    if "/root/MuseTalk" not in sys.path:
        sys.path.insert(0, "/root/MuseTalk")

    # Import the unified FastAPI server
    from unified_colab_server import app as api_app
    return api_app
