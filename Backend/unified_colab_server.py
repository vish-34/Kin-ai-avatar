"""
unified_colab_server.py
Kin-AI Unified GPU Server: OmniVoice + MuseTalk v1.5 / v1.0
Runs inside Google Colab on a single GPU (T4 / A100).

Architecture:
- OmniVoice Voice Synthesis Engine: Runs natively in-process on Port 8000.
- MuseTalk Avatar Engine: Runs on internal Port 8001 (micromamba /content/env).
- Unified Gateway (Port 8000): Serves all voice and avatar endpoints under a SINGLE public URL.
- Aggregated /health endpoint reporting both voice and avatar states.
- High-speed direct /synthesize_and_lipsync pipeline (0ms internet audio transit).
"""

import os
import io
import re
import base64
import json
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    httpx = None
    HTTPX_AVAILABLE = False

try:
    import soundfile as sf
    SOUNDFILE_AVAILABLE = True
except ImportError:
    sf = None
    SOUNDFILE_AVAILABLE = False

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    torch = None
    TORCH_AVAILABLE = False

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    np = None
    NUMPY_AVAILABLE = False

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Request
from fastapi.responses import Response, StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Internal URL for MuseTalk running in isolated micromamba env
MUSETALK_INTERNAL_URL = os.environ.get("MUSETALK_INTERNAL_URL", "http://127.0.0.1:8001")

# OmniVoice Import
try:
    from omnivoice import OmniVoice, VoiceClonePrompt
    OMNIVOICE_AVAILABLE = True
except ImportError:
    OMNIVOICE_AVAILABLE = False
    print("[Warning] OmniVoice package not found. Voice endpoints will run in mock/error mode.")

app = FastAPI(
    title="Kin-AI Unified Voice & Avatar GPU Server",
    description="Unified OmniVoice Zero-Shot TTS & MuseTalk Photorealistic Neural Lip-Sync Streaming Server."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = "cuda:0" if (torch and torch.cuda.is_available()) else "cpu"
VOICE_DIR = Path("voices")
VOICE_DIR.mkdir(parents=True, exist_ok=True)

# OmniVoice Global state
omni_model = None
cached_prompts: Dict[str, Any] = {}
cached_ref_audios: Dict[str, str] = {}


def load_omnivoice():
    """Initializes and caches the OmniVoice neural model in GPU memory."""
    global omni_model
    if not OMNIVOICE_AVAILABLE:
        return None
    if omni_model is not None:
        return omni_model

    print(f"[Init] Initializing OmniVoice on {DEVICE} (dtype=torch.float16)...")
    try:
        omni_model = OmniVoice.from_pretrained(
            "k2-fsa/OmniVoice",
            device_map=DEVICE,
            dtype=torch.float16,
            load_asr=True
        )
        print("✅ OmniVoice model loaded into GPU memory!")

        # Preload existing .pt prompts
        for pt_file in VOICE_DIR.glob("*.pt"):
            try:
                prompt = VoiceClonePrompt.load(str(pt_file))
                cached_prompts[pt_file.stem] = prompt
                print(f"[Cache] Loaded voice prompt: {pt_file.name}")
            except Exception as e:
                print(f"[Cache error] Failed to load {pt_file.name}: {e}")

        # Preload existing reference audio
        for audio_file in VOICE_DIR.glob("*.*"):
            if audio_file.suffix.lower() in [".wav", ".mp3", ".flac", ".m4a"]:
                cached_ref_audios[audio_file.stem] = str(audio_file)

        return omni_model
    except Exception as e:
        print(f"❌ Failed to load OmniVoice model: {e}")
        return None


@app.on_event("startup")
async def startup_event():
    load_omnivoice()


# =====================================================================
# 1. UNIFIED HEALTH CHECK (Satisfies VoiceClient AND AvatarClient)
# =====================================================================
@app.get("/health")
async def unified_health():
    """
    Unified health endpoint that reports the status of both OmniVoice and MuseTalk.
    """
    gpu_name = torch.cuda.get_device_name(0) if (torch and torch.cuda.is_available()) else "CPU"
    vram_gb = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 1) if (torch and torch.cuda.is_available()) else 0.0
    cuda_avail = torch.cuda.is_available() if torch else False

    musetalk_health: Dict[str, Any] = {}
    avatar_ready = False
    cached_avatars = []

    if HTTPX_AVAILABLE:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{MUSETALK_INTERNAL_URL}/health")
                if resp.status_code == 200:
                    musetalk_health = resp.json()
                    avatar_ready = musetalk_health.get("status") == "healthy"
                    cached_avatars = musetalk_health.get("cached_avatars", [])
        except Exception:
            pass

    voice_ready = (omni_model is not None)

    return {
        "status": "healthy" if (voice_ready or avatar_ready or not TORCH_AVAILABLE) else "degraded",
        "engine": "Kin-AI Unified GPU Server (OmniVoice + MuseTalk v1.5)",
        "device": DEVICE,
        "gpu_name": gpu_name,
        "vram_gb": vram_gb,
        "cuda_available": cuda_avail,
        "voice_ready": voice_ready,
        "avatar_ready": avatar_ready,
        # Keys for OmniVoiceColabClient
        "cached_prompts": list(cached_prompts.keys()),
        "cached_audio_files": list(cached_ref_audios.keys()),
        # Keys for MuseTalkAvatarClient
        "cached_avatars": cached_avatars,
        "musetalk_version": musetalk_health.get("version", "v15")
    }


# =====================================================================
# 2. VOICE ENDPOINTS (OmniVoice)
# =====================================================================
@app.post("/register_voice")
async def register_voice(
    name: str = Form("default"),
    ref_text: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """
    Upload a 3-20 second audio sample of target voice.
    Encodes into a lightweight VoiceClonePrompt (.pt) and caches it.
    """
    clean_name = re.sub(r'[^a-zA-Z0-9_-]', '_', name.strip()) or "default"
    ext = Path(file.filename or "sample.wav").suffix or ".wav"
    audio_path = VOICE_DIR / f"{clean_name}{ext}"

    contents = await file.read()
    with open(audio_path, "wb") as f:
        f.write(contents)

    cached_ref_audios[clean_name] = str(audio_path)
    prompt_path = VOICE_DIR / f"{clean_name}.pt"

    if omni_model is None:
        load_omnivoice()

    if omni_model and hasattr(omni_model, "create_voice_clone_prompt"):
        try:
            prompt = omni_model.create_voice_clone_prompt(
                ref_audio=str(audio_path),
                ref_text=ref_text.strip() if ref_text else None
            )
            prompt.save(str(prompt_path))
            cached_prompts[clean_name] = prompt
            return {
                "status": "success",
                "speaker_name": clean_name,
                "cached": True,
                "message": f"Voice prompt '{clean_name}' created and cached."
            }
        except Exception as e:
            cached_prompts[clean_name] = str(audio_path)
            return {
                "status": "partial_success",
                "speaker_name": clean_name,
                "message": f"Saved reference audio fallback: {e}"
            }
    else:
        cached_prompts[clean_name] = str(audio_path)
        return {
            "status": "success",
            "speaker_name": clean_name,
            "message": f"Saved reference audio for '{clean_name}'."
        }


def get_target_voice(speaker_name: str):
    """Retrieves cached VoiceClonePrompt or fallback reference audio path."""
    if speaker_name in cached_prompts:
        return cached_prompts[speaker_name]

    pt_path = VOICE_DIR / f"{speaker_name}.pt"
    if pt_path.exists() and OMNIVOICE_AVAILABLE:
        try:
            prompt = VoiceClonePrompt.load(str(pt_path))
            cached_prompts[speaker_name] = prompt
            return prompt
        except Exception:
            pass

    for ext in [".wav", ".mp3", ".flac", ".m4a"]:
        p = VOICE_DIR / f"{speaker_name}{ext}"
        if p.exists():
            return str(p)

    if cached_prompts:
        return next(iter(cached_prompts.values()))
    if cached_ref_audios:
        return next(iter(cached_ref_audios.values()))

    raise HTTPException(
        status_code=400,
        detail=f"Voice profile '{speaker_name}' not found. Please call /register_voice first."
    )


def synth_audio_tensor(text: str, target, num_step: int = 16) -> Any:
    """Synthesizes raw audio tensor using OmniVoice."""
    if omni_model is None:
        load_omnivoice()
    if omni_model is None:
        raise HTTPException(status_code=503, detail="OmniVoice model is not loaded.")

    kw: Dict[str, Any] = {"text": text, "normalize_text": False, "num_step": num_step}
    if OMNIVOICE_AVAILABLE and isinstance(target, VoiceClonePrompt):
        kw["voice_clone_prompt"] = target
    else:
        kw["ref_audio"] = str(target)

    with torch.inference_mode():
        try:
            out = omni_model.generate(**kw)
        except TypeError:
            kw.pop("num_step", None)
            kw.pop("normalize_text", None)
            out = omni_model.generate(**kw)

    arr = out[0] if isinstance(out, (list, tuple)) else out
    return arr.cpu().numpy() if hasattr(arr, "cpu") else arr


def tensor_to_wav_bytes(arr: Any, rate: int = 24000) -> bytes:
    if sf is None:
        return b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    b = io.BytesIO()
    sf.write(b, arr, rate, format="WAV")
    return b.getvalue()


class SynthesisRequest(BaseModel):
    text: str
    speaker_name: str = "default"
    num_step: int = 16


@app.post("/synthesize")
def synthesize(req: SynthesisRequest):
    """Zero-shot full text speech synthesis."""
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    target = get_target_voice(req.speaker_name)
    arr = synth_audio_tensor(text, target, num_step=req.num_step)
    return Response(
        content=tensor_to_wav_bytes(arr, 24000),
        media_type="audio/wav",
        headers={"Content-Disposition": f'inline; filename="{req.speaker_name}_out.wav"'}
    )


def split_text_clauses(text: str):
    tokens = re.split(r'([.!?;:\n]+)', text.strip())
    sentences = []
    for i in range(0, len(tokens) - 1, 2):
        p = tokens[i].strip() + (tokens[i+1].strip() if i+1 < len(tokens) else "")
        if p:
            sentences.append(p)
    if len(tokens) % 2 == 1 and tokens[-1].strip():
        sentences.append(tokens[-1].strip())
    if not sentences:
        sentences = [text.strip()]

    clauses = []
    for idx, s in enumerate(sentences):
        words = s.split()
        if idx == 0 and len(words) > 7 and (',' in s or '—' in s):
            parts = re.split(r'([,;—]+)', s)
            fc = parts[0].strip() + (parts[1].strip() if len(parts) > 1 else "")
            rst = "".join(parts[2:]).strip()
            if fc and rst:
                clauses.append(fc)
                clauses.append(rst)
                continue
        clauses.append(s)
    return [c.strip() for c in clauses if c.strip()]


@app.post("/synthesize_stream")
def synthesize_stream(req: SynthesisRequest):
    """Sub-second streaming speech synthesis via NDJSON."""
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    target = get_target_voice(req.speaker_name)
    clauses = split_text_clauses(text)
    if not clauses:
        clauses = [text]

    def gen():
        total = len(clauses)
        for idx, cl in enumerate(clauses):
            try:
                arr = synth_audio_tensor(cl, target, num_step=req.num_step)
                wav_b = tensor_to_wav_bytes(arr, 24000)
                b64 = base64.b64encode(wav_b).decode("utf-8")
                yield json.dumps({
                    "chunk_index": idx,
                    "total_chunks": total,
                    "text": cl,
                    "audio_base64": b64,
                    "sample_rate": 24000,
                    "is_last": (idx == total - 1)
                }) + "\n"
            except Exception as ex:
                yield json.dumps({
                    "chunk_index": idx,
                    "error": str(ex),
                    "is_last": (idx == total - 1)
                }) + "\n"

    return StreamingResponse(gen(), media_type="application/x-ndjson")


# =====================================================================
# 3. AVATAR ENDPOINTS (Forwarded directly to MuseTalk on Port 8001)
# =====================================================================
@app.post("/register_avatar")
async def register_avatar(
    avatar_id: str = Form("dadaji"),
    bbox_shift: int = Form(0),
    file: UploadFile = File(...)
):
    """Proxies avatar registration to MuseTalk on port 8001."""
    content = await file.read()
    filename = file.filename or "media.mp4"

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            files = {"file": (filename, content, file.content_type or "application/octet-stream")}
            data = {"avatar_id": avatar_id, "bbox_shift": str(bbox_shift)}
            resp = await client.post(f"{MUSETALK_INTERNAL_URL}/register_avatar", data=data, files=files)
            return JSONResponse(status_code=resp.status_code, content=resp.json())
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="MuseTalk backend server (port 8001) is not running.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proxy error to MuseTalk: {e}")


@app.post("/lipsync_stream")
async def lipsync_stream(
    avatar_id: str = Form("dadaji"),
    audio: UploadFile = File(...)
):
    """Proxies real-time streaming lip-sync to MuseTalk on port 8001."""
    audio_bytes = await audio.read()
    filename = audio.filename or "audio.wav"

    async def forward_stream():
        client = httpx.AsyncClient(timeout=180.0)
        try:
            files = {"audio": (filename, audio_bytes, "audio/wav")}
            data = {"avatar_id": avatar_id}
            async with client.stream("POST", f"{MUSETALK_INTERNAL_URL}/lipsync_stream", data=data, files=files) as response:
                if response.status_code != 200:
                    yield json.dumps({"error": f"MuseTalk status {response.status_code}"}) + "\n"
                    return
                async for line in response.aiter_lines():
                    if line:
                        yield line + "\n"
        finally:
            await client.aclose()

    return StreamingResponse(forward_stream(), media_type="application/x-ndjson")


@app.post("/lipsync_file")
async def lipsync_file(
    avatar_id: str = Form("dadaji"),
    audio: UploadFile = File(...)
):
    """Proxies full MP4 video generation to MuseTalk on port 8001."""
    audio_bytes = await audio.read()
    filename = audio.filename or "audio.wav"

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            files = {"audio": (filename, audio_bytes, "audio/wav")}
            data = {"avatar_id": avatar_id}
            resp = await client.post(f"{MUSETALK_INTERNAL_URL}/lipsync_file", data=data, files=files)
            if resp.status_code != 200:
                return JSONResponse(status_code=resp.status_code, content={"detail": resp.text})
            return Response(
                content=resp.content,
                media_type="video/mp4",
                headers={"Content-Disposition": f'inline; filename="{avatar_id}_talking.mp4"'}
            )
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="MuseTalk backend server (port 8001) is not running.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proxy error to MuseTalk: {e}")


@app.get("/idle_frame")
async def get_idle_frame(avatar_id: str = Query("dadaji"), frame_index: int = Query(0)):
    """Proxies idle frame retrieval to MuseTalk on port 8001."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{MUSETALK_INTERNAL_URL}/idle_frame",
                params={"avatar_id": avatar_id, "frame_index": frame_index}
            )
            if resp.status_code == 200:
                return Response(content=resp.content, media_type="image/jpeg")
            return JSONResponse(status_code=resp.status_code, content={"detail": resp.text})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proxy error to MuseTalk: {e}")


# =====================================================================
# 4. UNIFIED ALL-IN-ONE PIPELINE: Direct Speech-To-Avatar (0ms Network Audio)
# =====================================================================
class SpeechAvatarRequest(BaseModel):
    text: str
    speaker_name: str = "default"
    avatar_id: str = "dadaji"
    num_step: int = 16
    stream: bool = False


@app.post("/synthesize_and_lipsync")
async def synthesize_and_lipsync(req: SpeechAvatarRequest):
    """
    All-In-One Pipeline:
    1. Synthesizes voice in-memory with OmniVoice directly on GPU.
    2. Sends the in-memory audio directly to MuseTalk on localhost.
    3. Streams back video frames or returns talking MP4 with ZERO internet audio latency!
    """
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    target = get_target_voice(req.speaker_name)
    arr = synth_audio_tensor(text, target, num_step=req.num_step)
    wav_bytes = tensor_to_wav_bytes(arr, 24000)

    if req.stream:
        # Stream NDJSON frames
        async def forward_stream():
            client = httpx.AsyncClient(timeout=180.0)
            try:
                files = {"audio": ("speech.wav", wav_bytes, "audio/wav")}
                data = {"avatar_id": req.avatar_id}
                async with client.stream("POST", f"{MUSETALK_INTERNAL_URL}/lipsync_stream", data=data, files=files) as response:
                    async for line in response.aiter_lines():
                        if line:
                            yield line + "\n"
            finally:
                await client.aclose()
        return StreamingResponse(forward_stream(), media_type="application/x-ndjson")
    else:
        # Return MP4 file
        async with httpx.AsyncClient(timeout=300.0) as client:
            files = {"audio": ("speech.wav", wav_bytes, "audio/wav")}
            data = {"avatar_id": req.avatar_id}
            resp = await client.post(f"{MUSETALK_INTERNAL_URL}/lipsync_file", data=data, files=files)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            return Response(
                content=resp.content,
                media_type="video/mp4",
                headers={"Content-Disposition": f'inline; filename="{req.avatar_id}_talking.mp4"'}
            )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
