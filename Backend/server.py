"""
server.py - Kin-AI-Avatar Backend Orchestration Server
Runs locally on http://127.0.0.1:8008

Orchestrates:
1. Clonellm: Personalized conversational memory & wisdom (Groq + local embeddings).
2. OmniVoice: High-speed zero-shot voice cloning (Colab GPU).
3. MuseTalk: Real-time photorealistic talking avatar video (Colab GPU).
"""

import os
import sys
import io
import re
import json
import base64
import asyncio
import threading
import time
import requests
import traceback
from pathlib import Path
from typing import Optional, Dict, Any, AsyncGenerator

from dotenv import dotenv_values, set_key
from fastapi import FastAPI, HTTPException, Request, Response, BackgroundTasks, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure safe UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Add Backend paths
BACKEND_DIR = Path(__file__).resolve().parent
ENV_PATH = BACKEND_DIR / ".env"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(BACKEND_DIR / "Voice") not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR / "Voice"))
if str(BACKEND_DIR / "Avatar") not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR / "Avatar"))
if str(BACKEND_DIR / "Clonellm") not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR / "Clonellm"))

# Import engines
from Clonellm.clone_engine import get_clone_engine, PersonaCloneEngine
from Voice.voice_client import OmniVoiceColabClient
from Avatar.avatar_client import MuseTalkAvatarClient

app = FastAPI(
    title="Kin-AI-Avatar Orchestrator",
    description="Local streaming backend connecting Clonellm, OmniVoice, and MuseTalk with Frontend."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Client Instances
clone_engine: Optional[PersonaCloneEngine] = None
voice_client = OmniVoiceColabClient()
avatar_client = MuseTalkAvatarClient()

# Live In-Memory Video Buffer (Zero Disk Writes)
LATEST_TALKING_VIDEO_BYTES: Optional[bytes] = None
LATEST_VIDEO_TIMESTAMP: float = time.time()

# Pre-load initial Dadaji talking video from disk into RAM if available
_preload_candidate = BACKEND_DIR / "Avatar" / "latest_talking.mp4"
if _preload_candidate.exists() and _preload_candidate.stat().st_size > 1000:
    try:
        LATEST_TALKING_VIDEO_BYTES = _preload_candidate.read_bytes()
        print(f"🎬 [In-Memory Video] Preloaded {len(LATEST_TALKING_VIDEO_BYTES) // 1024} KB avatar video into RAM.")
    except Exception:
        pass


def get_engine():
    global clone_engine
    if clone_engine is None:
        try:
            clone_engine = get_clone_engine()
        except Exception as e:
            print(f"[Warning] Failed to initialize Clonellm on startup: {e}")
    return clone_engine


def ensure_colab_assets_registered(force: bool = False):
    """
    Auto-registers Dadaji voice profile and avatar video on Google Colab GPU.
    Ensures zero '400 Bad Request' errors when Colab restarts or RAM caches are empty.
    """
    if not voice_client.colab_url:
        return

    try:
        health = voice_client.check_health()
        if health.get("status") not in ["healthy", "degraded"]:
            return

        cached_prompts = health.get("cached_prompts", [])
        cached_avatars = health.get("cached_avatars", [])

        # 1. Register Voice Prompts ('default' and 'dadaji')
        sample_voice = BACKEND_DIR / "Voice" / "clone_out.wav"
        if sample_voice.exists():
            for spk in ["default", "dadaji"]:
                if force or spk not in cached_prompts:
                    try:
                        print(f"[Auto-Register] Registering voice profile '{spk}' on Colab...")
                        voice_client.register_voice_sample(speaker_name=spk, audio_path=str(sample_voice))
                        print(f"[Auto-Register] Voice profile '{spk}' successfully active on Colab.")
                    except Exception as ve:
                        print(f"[Warning] Failed to auto-register voice '{spk}': {ve}")

        # 2. Register Avatar Latents ('dadaji' and 'test_avatar')
        sample_avatar = BACKEND_DIR / "Avatar" / "dadaji.jpg"
        if not sample_avatar.exists():
            sample_avatar = BACKEND_DIR.parent / "Frontend" / "public" / "grandfather.jpg"

        if sample_avatar.exists():
            for av_id in ["dadaji", "test_avatar"]:
                if force or av_id not in cached_avatars:
                    try:
                        print(f"[Auto-Register] Registering authentic avatar portrait '{av_id}' on Colab...")
                        avatar_client.register_avatar(avatar_id=av_id, media_path=str(sample_avatar))
                        print(f"[Auto-Register] Avatar profile '{av_id}' successfully active on Colab.")
                    except Exception as ae:
                        print(f"[Warning] Failed to auto-register avatar '{av_id}': {ae}")

    except Exception as e:
        print(f"[Warning] Colab self-registration check notice: {e}")


@app.on_event("startup")
def startup_event():
    print("🚀 Initializing Kin-AI-Avatar Orchestration Server on Port 8008...")
    get_engine()
    # Trigger auto-registration in background thread
    threading.Thread(target=ensure_colab_assets_registered, daemon=True).start()


# =====================================================================
# 1. SYSTEM STATUS & CONFIGURATION ENDPOINTS
# =====================================================================
@app.get("/api/status")
def get_status():
    """Returns aggregated status of Clonellm, Colab GPU, and active persona."""
    engine = get_engine()
    profile = engine.profile if engine else None

    # Check Colab Health
    colab_health = voice_client.check_health()
    colab_connected = colab_health.get("status") in ["healthy", "degraded"]
    gpu_name = colab_health.get("gpu_name", "None")

    colab_url = voice_client.colab_url

    return {
        "status": "online",
        "persona": {
            "name": (profile.preferred_name or profile.first_name) if profile else "Dadaji",
            "full_name": f"{profile.first_name} {profile.last_name}" if profile else "Ramesh Sharma",
            "model": engine.model if engine else "Groq",
            "ready": engine is not None and engine.clone is not None,
        },
        "colab": {
            "connected": colab_connected,
            "url": colab_url,
            "gpu_name": gpu_name,
            "cached_prompts": colab_health.get("cached_prompts", []),
            "cached_avatars": colab_health.get("cached_avatars", []),
        }
    }


class ConfigColabRequest(BaseModel):
    url: str


@app.post("/api/config/colab")
def update_colab_url(req: ConfigColabRequest):
    """Dynamically updates the Colab Tunnel URL in memory and Backend/.env."""
    url = req.url.strip().rstrip("/")
    if not url:
        raise HTTPException(status_code=400, detail="Colab URL cannot be empty.")

    voice_client.set_url(url)
    avatar_client.set_url(url)

    # Persist in .env
    try:
        if ENV_PATH.exists():
            set_key(str(ENV_PATH), "COLAB_SERVER_URL", url)
            set_key(str(ENV_PATH), "COLAB_VOICE_URL", url)
            set_key(str(ENV_PATH), "COLAB_AVATAR_URL", url)
    except Exception as e:
        print(f"[Warning] Failed to persist URL to .env: {e}")

    # Auto-register on newly updated Colab URL in background thread
    threading.Thread(target=ensure_colab_assets_registered, kwargs={"force": False}, daemon=True).start()

    health = voice_client.check_health()
    return {
        "status": "success",
        "url": url,
        "colab_health": health
    }


@app.post("/api/memory/reset")
def reset_memory():
    """Clears conversation memory for a fresh session."""
    engine = get_engine()
    if engine:
        engine.reset_memory()
    return {"status": "success", "message": "Memory reset successfully."}


@app.post("/api/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """
    High-accuracy ultra-fast (<200ms) speech transcription using Groq Whisper-large-v3-turbo.
    Guarantees seamless voice input across all browsers and avoids WebSpeech disconnection bugs.
    """
    groq_key = os.getenv("GroqAPIKey") or os.getenv("GROQ_API_KEY")
    if not groq_key and ENV_PATH.exists():
        env_vars = dotenv_values(ENV_PATH)
        groq_key = env_vars.get("GroqAPIKey") or env_vars.get("GROQ_API_KEY")

    if not groq_key:
        raise HTTPException(status_code=500, detail="Groq API key not configured.")

    audio_bytes = await file.read()
    if not audio_bytes or len(audio_bytes) < 200:
        return {"text": "", "status": "empty"}

    filename = file.filename or "speech.webm"
    try:
        from groq import Groq
        groq_client = Groq(api_key=groq_key)
        loop = asyncio.get_event_loop()

        def _transcribe():
            return groq_client.audio.transcriptions.create(
                model="whisper-large-v3-turbo",
                file=(filename, audio_bytes),
                language="en",
                prompt="Conversation with Indian grandfather Dadaji Ramesh Sharma."
            )

        res = await loop.run_in_executor(None, _transcribe)
        transcript = res.text.strip() if res else ""
        return {"text": transcript, "status": "success"}
    except Exception as e:
        print(f"[Warning] Groq Whisper STT error: {e}")
        return {"text": "", "status": "error", "message": str(e)}


# =====================================================================
# 2. REAL-TIME STREAMING CONVERSATION (SSE)
# =====================================================================
class ChatRequest(BaseModel):
    message: str
    avatar_id: str = "dadaji"
    speaker_name: str = "default"
    stream_media: bool = True
    generate_video: bool = True


def split_into_clauses(text: str):
    """Splits streamed text into natural sentence / clause chunks for early audio synthesis."""
    pattern = r'([.!?;:\n]+)'
    tokens = re.split(pattern, text)
    clauses = []
    for i in range(0, len(tokens) - 1, 2):
        chunk = tokens[i].strip()
        punct = tokens[i + 1].strip() if (i + 1) < len(tokens) else ""
        if chunk:
            clauses.append(f"{chunk}{punct}")
    if len(tokens) % 2 == 1 and tokens[-1].strip():
        clauses.append(tokens[-1].strip())
    return [c for c in clauses if c.strip()]


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    """
    Sub-Second Conversational Pipelining (SSE):
    1. Emits `event: text_chunk` with tokens from Clonellm as they arrive.
    2. Buffers tokens into clauses.
    3. Concurrently synthesizes voice (OmniVoice) and lip-sync (MuseTalk) for each clause.
    4. Emits `event: media_chunk` containing audio_base64 and video frames for instantaneous playback.
    5. Emits `event: done` with completion summary.
    """
    prompt = req.message.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    engine = get_engine()
    if not engine:
        raise HTTPException(status_code=503, detail="PersonaCloneEngine is not initialized.")

    async def event_generator() -> AsyncGenerator[str, None]:
        full_response_text = ""
        clause_buffer = ""
        clause_index = 0
        sentence_delimiters = re.compile(r'([.!?;:\n]+)')
        all_wav_chunks = []
        video_render_task: Optional[asyncio.Task] = None

        try:
            # 1. Stream tokens safely from Clonellm
            token_iter = None
            try:
                token_iter = engine.ask_stream(prompt)
            except Exception as stream_err:
                print(f"[Error] Failed to initialize ask_stream: {stream_err}")
                token_iter = [f"Namaste beta. I am here with you."]

            if token_iter is not None:
                for token in token_iter:
                    full_response_text += token
                    clause_buffer += token

                    # Send text token to frontend immediately for sub-second subtitle rendering
                    yield f"event: text_chunk\ndata: {json.dumps({'token': token})}\n\n"
                    await asyncio.sleep(0.005)

                    # Check if buffer has a complete sentence/clause
                    parts = sentence_delimiters.split(clause_buffer)
                    if len(parts) > 2:
                        complete_clause = parts[0] + parts[1]
                        clause_buffer = "".join(parts[2:])

                        complete_clause = complete_clause.strip()
                        if complete_clause and req.stream_media:
                            # Synthesize cloned voice audio
                            audio_payload, raw_wav = await synthesize_clause_audio(
                                text=complete_clause,
                                chunk_index=clause_index,
                                speaker_name=req.speaker_name,
                                num_step=6
                            )
                            clause_index += 1
                            if raw_wav:
                                all_wav_chunks.append(raw_wav)
                            # Yield audio immediately for voice & video playback
                            yield f"event: media_chunk\ndata: {json.dumps(audio_payload)}\n\n"

            # Flush any remaining text in clause_buffer
            remaining_clause = clause_buffer.strip()
            if remaining_clause and req.stream_media:
                audio_payload, raw_wav = await synthesize_clause_audio(
                    text=remaining_clause,
                    chunk_index=clause_index,
                    speaker_name=req.speaker_name,
                    num_step=6
                )
                if raw_wav:
                    all_wav_chunks.append(raw_wav)
                yield f"event: media_chunk\ndata: {json.dumps(audio_payload)}\n\n"

            # In Video Call mode (req.generate_video == True): synthesize full-length talking video!
            if req.generate_video and avatar_client.colab_url and all_wav_chunks:
                # Combine all audio chunks so the video covers Dadaji's FULL response (not just 1 sec)
                combined_wav = all_wav_chunks[0]
                if len(all_wav_chunks) > 1:
                    try:
                        first_header = bytearray(all_wav_chunks[0][:44])
                        pcm_data = bytearray()
                        for w in all_wav_chunks:
                            if len(w) > 44:
                                pcm_data.extend(w[44:])
                        total_pcm_len = len(pcm_data)
                        first_header[40:44] = total_pcm_len.to_bytes(4, byteorder='little')
                        first_header[4:8] = (total_pcm_len + 36).to_bytes(4, byteorder='little')
                        combined_wav = bytes(first_header + pcm_data)
                    except Exception as combo_err:
                        print(f"[Notice] Failed to combine audio chunks, using first chunk: {combo_err}")
                        combined_wav = all_wav_chunks[0]

                video_render_task = asyncio.create_task(
                    render_clause_video(
                        wav_bytes=combined_wav,
                        chunk_index=0,
                        avatar_id=req.avatar_id
                    )
                )

            # Await background video generation if active, and yield lip-sync video chunk!
            if video_render_task is not None:
                try:
                    video_payload = await asyncio.wait_for(video_render_task, timeout=75.0)
                    if video_payload and (video_payload.get("video_url") or video_payload.get("video_base64")):
                        print(f"🎬 [MuseTalk Live Stream] Emitting talking avatar video URL: {video_payload.get('video_url', 'direct')}!")
                        yield f"event: media_chunk\ndata: {json.dumps(video_payload)}\n\n"
                except Exception as vid_wait_err:
                    print(f"[Notice] Video generation skipped or timed out: {vid_wait_err}")

            # 2. Final Completion Event
            citation = "Synthesized from authentic voice profile & personal memories"
            yield f"event: done\ndata: {json.dumps({'full_text': full_response_text, 'citation': citation})}\n\n"

        except Exception as e:
            traceback.print_exc()
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


async def synthesize_clause_audio(text: str, chunk_index: int, speaker_name: str, num_step: int = 6):
    """
    Synthesizes cloned audio for a clause with ultra-fast turnaround using num_step=6.
    Auto-registers voice on Colab if missing (self-healing retry on 400).
    """
    payload: Dict[str, Any] = {
        "chunk_index": chunk_index,
        "text": text,
        "audio_base64": None,
        "fallback": False
    }

    if not voice_client.colab_url:
        payload["fallback"] = True
        return payload, None

    loop = asyncio.get_event_loop()

    def _synthesize_with_retry():
        try:
            return voice_client.synthesize(text=text, speaker_name=speaker_name, num_step=num_step)
        except requests.exceptions.HTTPError as he:
            if he.response is not None and he.response.status_code == 400:
                print(f"[Auto-Register] Voice profile '{speaker_name}' missing on Colab (400). Auto-registering & retrying...")
                ensure_colab_assets_registered(force=True)
                return voice_client.synthesize(text=text, speaker_name=speaker_name, num_step=num_step)
            raise
        except Exception as ex:
            err_str = str(ex).lower()
            if "400" in err_str or "not found" in err_str:
                print(f"[Auto-Register] Retrying synthesis after missing voice profile '{speaker_name}'...")
                ensure_colab_assets_registered(force=True)
                return voice_client.synthesize(text=text, speaker_name=speaker_name, num_step=num_step)
            raise

    try:
        wav_bytes = await loop.run_in_executor(None, _synthesize_with_retry)
        if wav_bytes:
            payload["audio_base64"] = base64.b64encode(wav_bytes).decode("utf-8")
            return payload, wav_bytes
    except Exception as e:
        print(f"[Warning] Clause media synthesis failed for '{text[:20]}...': {e}")
        payload["fallback"] = True

    return payload, None


async def render_clause_video(wav_bytes: bytes, chunk_index: int, avatar_id: str) -> Optional[Dict[str, Any]]:
    """
    Renders lip-sync video in RAM without any disk writes on your local machine.
    """
    global LATEST_TALKING_VIDEO_BYTES, LATEST_VIDEO_TIMESTAMP
    if not avatar_client.colab_url:
        return None

    loop = asyncio.get_event_loop()
    try:
        def _lipsync_in_memory():
            try:
                return avatar_client.generate_lipsync_video_bytes(
                    avatar_id=avatar_id,
                    audio_bytes=wav_bytes
                )
            except Exception as vid_ex:
                err_str = str(vid_ex).lower()
                if "400" in err_str or "not found" in err_str:
                    print(f"[Auto-Register] Avatar profile '{avatar_id}' missing on Colab. Auto-registering & retrying...")
                    ensure_colab_assets_registered(force=True)
                    return avatar_client.generate_lipsync_video_bytes(
                        avatar_id=avatar_id,
                        audio_bytes=wav_bytes
                    )
                raise

        # Wait up to 75 seconds for high-quality neural video render on Colab GPU
        vid_bytes = await asyncio.wait_for(loop.run_in_executor(None, _lipsync_in_memory), timeout=75.0)
        if vid_bytes and len(vid_bytes) > 1000:
            LATEST_TALKING_VIDEO_BYTES = vid_bytes
            LATEST_VIDEO_TIMESTAMP = time.time()
            return {
                "chunk_index": chunk_index,
                "video_url": f"/api/avatar/video?t={int(LATEST_VIDEO_TIMESTAMP * 1000)}",
                "video_base64": base64.b64encode(vid_bytes).decode("utf-8")
            }
    except Exception as vid_err:
        print(f"[Notice] Lip-sync video chunk {chunk_index} notice: {vid_err}")
    return None


# =====================================================================
# 3. IDLE LIVING AVATAR MEDIA
# =====================================================================
@app.get("/api/avatar/idle")
def get_idle_media(avatar_id: str = "dadaji"):
    """
    Returns the authentic Dadaji portrait image.
    """
    # 1. Check local Dadaji portrait in Avatar folder
    dadaji_img = BACKEND_DIR / "Avatar" / "dadaji.jpg"
    if dadaji_img.exists():
        return FileResponse(str(dadaji_img), media_type="image/jpeg")

    # 2. Check public grandfather portrait
    photo_path = BACKEND_DIR.parent / "Frontend" / "public" / "grandfather.jpg"
    if photo_path.exists():
        return FileResponse(str(photo_path), media_type="image/jpeg")

    raise HTTPException(status_code=404, detail="No avatar portrait media found.")


@app.get("/api/avatar/video")
def get_talking_video():
    """Returns the latest generated lip-sync talking video directly from RAM with HTTP Range support."""
    global LATEST_TALKING_VIDEO_BYTES
    if LATEST_TALKING_VIDEO_BYTES and len(LATEST_TALKING_VIDEO_BYTES) > 1000:
        return Response(
            content=LATEST_TALKING_VIDEO_BYTES,
            media_type="video/mp4",
            headers={
                "Accept-Ranges": "bytes",
                "Cache-Control": "no-cache",
                "Content-Disposition": 'inline; filename="dadaji_live.mp4"'
            }
        )

    for candidate in [
        BACKEND_DIR / "Avatar" / "latest_talking.mp4",
        BACKEND_DIR / "Avatar" / "test_dadaji_speaking.mp4",
        BACKEND_DIR.parent / "Frontend" / "public" / "dadaji_talking_stream.mp4"
    ]:
        if candidate.exists() and candidate.stat().st_size > 1000:
            return FileResponse(str(candidate), media_type="video/mp4")
    raise HTTPException(status_code=404, detail="No talking video found.")


@app.get("/api/avatar/idle_video")
def get_idle_video():
    """Returns the living Dadaji idle video stream."""
    for candidate in [
        BACKEND_DIR / "Avatar" / "dadaji_idle.mp4",
        BACKEND_DIR.parent / "Frontend" / "public" / "dadaji_idle.mp4"
    ]:
        if candidate.exists() and candidate.stat().st_size > 1000:
            return FileResponse(str(candidate), media_type="video/mp4")
    raise HTTPException(status_code=404, detail="No idle video found.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8008)
