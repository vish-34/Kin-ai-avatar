"""
avatar_client.py
Local Python client for Kin-ai-avatar to communicate with the Google Colab MuseTalk server.

Features:
- One-time Avatar Face Registration and Persistent Inpainting Latent Caching.
- Zero-shot 30+ FPS Audio-Driven Talking Head Video Generation (/lipsync_file).
- Real-Time Sub-Second Frame Streaming (/lipsync_stream).
- Seamless Cloudflare & ngrok Tunnel Support (Bypasses ngrok browser interstitial warnings).
- Idle frame retrieval for living avatar animations.
"""

import os
import io
import re
import sys
import json
import base64
import requests
from pathlib import Path
from typing import Generator, Optional, Dict, Any, List

# Ensure safe UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    from dotenv import load_dotenv, dotenv_values
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
except ImportError:
    pass


class MuseTalkAvatarClient:
    def __init__(self, colab_url: Optional[str] = None):
        """
        :param colab_url: Public URL from your Google Colab or Kaggle notebook (Cloudflare or ngrok tunnel).
        """
        self.headers = {
            "ngrok-skip-browser-warning": "true",
            "User-Agent": "KinAvatarClient/1.0"
        }
        self.colab_url = ""
        if colab_url:
            self.colab_url = colab_url.strip().rstrip("/")
        else:
            self._resolve_url()

    def _resolve_url(self) -> str:
        """Dynamically re-reads URL from Backend/.env if not explicitly pinned."""
        env_p = Path(__file__).resolve().parent.parent / ".env"
        if env_p.exists():
            try:
                env_vals = dotenv_values(env_p)
                url = (
                    env_vals.get("KAGGLE_AVATAR_URL")
                    or env_vals.get("COLAB_AVATAR_URL")
                    or env_vals.get("KAGGLE_SERVER_URL")
                    or env_vals.get("COLAB_SERVER_URL")
                    or os.getenv("KAGGLE_AVATAR_URL", "")
                    or os.getenv("COLAB_AVATAR_URL", "")
                    or os.getenv("KAGGLE_SERVER_URL", "")
                    or os.getenv("COLAB_SERVER_URL", "")
                )
                if url and url.strip():
                    self.colab_url = url.strip().rstrip("/")
            except Exception:
                pass
        return self.colab_url

    def set_url(self, url: str):
        """Update the active Colab tunnel URL."""
        self.colab_url = url.strip().rstrip("/")

    def check_health(self) -> Dict[str, Any]:
        """
        Verifies connection to the Colab GPU server and lists cached avatar IDs.
        """
        self._resolve_url()
        if not self.colab_url:
            return {"status": "error", "message": "Colab/Kaggle Avatar URL is not configured in .env."}
        try:
            r = requests.get(f"{self.colab_url}/health", headers=self.headers, timeout=8)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_cached_avatars(self) -> List[str]:
        """Returns the list of avatar IDs already cached in RAM/disk on Colab."""
        info = self.check_health()
        if info.get("status") == "healthy":
            return info.get("cached_avatars", [])
        return []

    def register_avatar(
        self,
        avatar_id: str,
        media_path: str,
        bbox_shift: int = 0
    ) -> Dict[str, Any]:
        """
        Uploads a portrait photo or video of a family member to Google Colab.
        The server extracts face coordinates, 256x256 bounding boxes, inpainting masks,
        and computes VAE latents, caching them permanently.

        Subsequent speech / lip-sync requests reuse this cached avatar with ZERO pre-processing delay!
        """
        path = Path(media_path)
        if not path.exists():
            raise FileNotFoundError(f"Avatar media file not found: {media_path}")

        self._resolve_url()
        if not self.colab_url:
            raise ConnectionError("Colab/Kaggle Avatar URL is not configured in .env.")

        raw_id = re.sub(r'[^a-zA-Z0-9_-]', '_', avatar_id.strip())[:32].strip('_')
        clean_id = raw_id or "avatar_default"
        url = f"{self.colab_url}/register_avatar"

        print(f"📤 Uploading avatar '{clean_id}' ({path.name}) to Colab...")
        with open(path, "rb") as f:
            files = {"file": (path.name, f, "application/octet-stream")}
            data = {"avatar_id": clean_id, "bbox_shift": bbox_shift}
            response = requests.post(url, data=data, files=files, headers=self.headers, timeout=300)

        if response.status_code >= 400:
            err_msg = response.text
            try:
                err_msg = response.json().get("detail", err_msg)
            except Exception:
                pass
            print(f"\n❌ Colab Server Error ({response.status_code}): {err_msg}")
        response.raise_for_status()
        result = response.json()
        print(f"✅ Avatar '{clean_id}' successfully cached on Colab GPU.")
        return result

    def generate_lipsync_video(
        self,
        avatar_id: str,
        audio_path: str,
        output_path: str = "talking_avatar.mp4"
    ) -> str:
        """
        Sends driving audio to Colab and downloads the finished lip-synced MP4 video.
        Uses cached avatar latents for instant inference.

        :param avatar_id: ID of the pre-cached avatar.
        :param audio_path: Path to the driving WAV or MP3 audio file.
        :param output_path: Path to save the final lip-synced MP4 video.
        :return: Absolute path to the saved MP4 file.
        """
        audio_file = Path(audio_path)
        if not audio_file.exists():
            raise FileNotFoundError(f"Driving audio file not found: {audio_path}")

        self._resolve_url()
        if not self.colab_url:
            raise ConnectionError("Colab/Kaggle Avatar URL is not configured. Set COLAB_AVATAR_URL or KAGGLE_AVATAR_URL in .env.")

        url = f"{self.colab_url}/lipsync_file"
        print(f"🎬 Requesting lip-sync video for avatar '{avatar_id}' driven by {audio_file.name}...")

        with open(audio_file, "rb") as f:
            files = {"audio": (audio_file.name, f, "audio/wav")}
            data = {"avatar_id": avatar_id}
            response = requests.post(url, data=data, files=files, headers=self.headers, stream=True, timeout=180)

        if response.status_code >= 400:
            err_msg = response.text
            try:
                err_msg = response.json().get("detail", err_msg)
            except Exception:
                pass
            print(f"\n❌ Colab Server Error ({response.status_code}): {err_msg}")
        response.raise_for_status()

        out_path = Path(output_path).resolve()
        with open(out_path, "wb") as f_out:
            for chunk in response.iter_content(chunk_size=65536):
                if chunk:
                    f_out.write(chunk)

        print(f"💾 Video saved successfully: {out_path} ({out_path.stat().st_size // 1024} KB)")
        return str(out_path)

    def generate_lipsync_video_bytes(
        self,
        avatar_id: str,
        audio_bytes: bytes,
    ) -> bytes:
        """
        Direct in-memory video generation (Zero local disk writes):
        Uploads audio bytes directly from RAM and receives MP4 video bytes directly in RAM.
        """
        self._resolve_url()
        if not self.colab_url:
            raise ConnectionError("Colab/Kaggle Avatar URL is not configured. Set COLAB_AVATAR_URL or KAGGLE_AVATAR_URL in .env.")

        url = f"{self.colab_url}/lipsync_file"
        print(f"🎬 [Live Cloud Stream] Requesting lip-sync video for avatar '{avatar_id}' ({len(audio_bytes)} audio bytes in RAM)...")

        files = {"audio": ("speech.wav", io.BytesIO(audio_bytes), "audio/wav")}
        data = {"avatar_id": avatar_id}
        response = requests.post(url, data=data, files=files, headers=self.headers, timeout=120)

        if response.status_code >= 400:
            err_msg = response.text
            try:
                err_msg = response.json().get("detail", err_msg)
            except Exception:
                pass
            print(f"\n❌ Colab Server Error ({response.status_code}): {err_msg}")
        response.raise_for_status()

        vid_bytes = response.content
        print(f"⚡ [Live Cloud Stream] Neural talking video ready in RAM ({len(vid_bytes) // 1024} KB, 0 disk writes)!")
        return vid_bytes

    def generate_lipsync_stream(
        self,
        avatar_id: str,
        audio_path: str
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Real-Time Streaming Lip-Sync:
        Streams synchronized video frames as they are rendered frame-by-frame on Colab GPU.
        Yields dictionaries with:
          - frame_index: int
          - fps: int (25-30)
          - image_bytes: bytes (raw JPEG)
          - b64: str (base64 JPEG)
        """
        audio_file = Path(audio_path)
        if not audio_file.exists():
            raise FileNotFoundError(f"Driving audio file not found: {audio_path}")

        if not self.colab_url:
            raise ConnectionError("Colab Avatar URL is not configured. Set COLAB_AVATAR_URL in .env.")

        url = f"{self.colab_url}/lipsync_stream"
        with open(audio_file, "rb") as f:
            files = {"audio": (audio_file.name, f, "audio/wav")}
            data = {"avatar_id": avatar_id}
            response = requests.post(url, data=data, files=files, headers=self.headers, stream=True, timeout=120)

        if response.status_code >= 400:
            err_msg = response.text
            try:
                err_msg = response.json().get("detail", err_msg)
            except Exception:
                pass
            print(f"\n❌ Colab Server Error ({response.status_code}): {err_msg}")
        response.raise_for_status()

        for line in response.iter_lines():
            if line:
                try:
                    payload = json.loads(line.decode("utf-8"))
                    b64 = payload.get("image_base64", "")
                    raw_bytes = base64.b64decode(b64) if b64 else b""
                    yield {
                        "frame_index": payload.get("frame_index", 0),
                        "fps": payload.get("fps", 25),
                        "image_bytes": raw_bytes,
                        "b64": b64
                    }
                except Exception as e:
                    print(f"[Stream Decode Warning] {e}")
                    continue

    def get_idle_frame(self, avatar_id: str, frame_index: int = 0) -> Optional[bytes]:
        """Fetches a single JPEG frame from the avatar's idle ping-pong loop."""
        if not self.colab_url:
            return None
        try:
            url = f"{self.colab_url}/idle_frame"
            params = {"avatar_id": avatar_id, "frame_index": frame_index}
            r = requests.get(url, params=params, headers=self.headers, timeout=5)
            if r.status_code == 200:
                return r.content
        except Exception:
            pass
        return None
