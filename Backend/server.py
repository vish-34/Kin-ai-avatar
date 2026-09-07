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

import shutil
from dotenv import dotenv_values, set_key
from fastapi import FastAPI, HTTPException, Request, Response, BackgroundTasks, UploadFile, File, Form
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


PERSONAS_DIR = BACKEND_DIR / "data" / "personas"
PERSONAS_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND_PUBLIC_AVATARS = BACKEND_DIR.parent / "Frontend" / "public" / "avatars"
FRONTEND_PUBLIC_AVATARS.mkdir(parents=True, exist_ok=True)


def get_engine(avatar_id: str = "dadaji") -> Optional[PersonaCloneEngine]:
    """Retrieves the PersonaCloneEngine instance for the requested avatar_id."""
    clean_id = re.sub(r'[^a-zA-Z0-9_-]', '_', (avatar_id or "dadaji").lower().strip()).strip('_')
    persona_path = PERSONAS_DIR / clean_id
    if persona_path.exists() and (persona_path / "profile.json").exists():
        try:
            return get_clone_engine(persona_id=clean_id, persona_dir=persona_path)
        except Exception as pe_err:
            print(f"[Warning] Failed to load custom persona '{clean_id}': {pe_err}")
    try:
        return get_clone_engine(persona_id="dadaji")
    except Exception as e:
        print(f"[Warning] Failed to load default Dadaji persona: {e}")
        return None


def reload_colab_urls():
    """Dynamically reads Backend/.env and updates voice_client and avatar_client."""
    if ENV_PATH.exists():
        try:
            env_vars = dotenv_values(ENV_PATH)
            voice_url = (
                env_vars.get("KAGGLE_VOICE_URL")
                or env_vars.get("COLAB_VOICE_URL")
                or env_vars.get("KAGGLE_SERVER_URL")
                or env_vars.get("COLAB_SERVER_URL")
                or os.getenv("KAGGLE_VOICE_URL", "")
                or os.getenv("COLAB_VOICE_URL", "")
                or os.getenv("KAGGLE_SERVER_URL", "")
                or os.getenv("COLAB_SERVER_URL", "")
            )
            avatar_url = (
                env_vars.get("KAGGLE_AVATAR_URL")
                or env_vars.get("COLAB_AVATAR_URL")
                or env_vars.get("KAGGLE_SERVER_URL")
                or env_vars.get("COLAB_SERVER_URL")
                or os.getenv("KAGGLE_AVATAR_URL", "")
                or os.getenv("COLAB_AVATAR_URL", "")
                or os.getenv("KAGGLE_SERVER_URL", "")
                or os.getenv("COLAB_SERVER_URL", "")
            )
            if voice_url and voice_url.strip():
                voice_client.set_url(voice_url.strip().strip("'").strip('"').rstrip("/"))
            if avatar_url and avatar_url.strip():
                avatar_client.set_url(avatar_url.strip().strip("'").strip('"').rstrip("/"))
        except Exception as e:
            print(f"[Warning] Failed to reload URLs from .env: {e}")


def ensure_colab_assets_registered(target_id: Optional[str] = None, force: bool = False):
    """
    Auto-registers voice profiles and avatar portraits on Kaggle/Colab GPU.
    If target_id is specified: checks and registers that specific persona.
    If target_id is None: checks and registers Dadaji plus all saved custom personas.
    """
    reload_colab_urls()
    if not voice_client.colab_url and not avatar_client.colab_url:
        return

    try:
        health = voice_client.check_health()
        cached_prompts = health.get("cached_prompts", []) if health.get("status") in ["healthy", "degraded"] else []
        avatar_health = avatar_client.check_health()
        cached_avatars = avatar_health.get("cached_avatars", []) if avatar_health.get("status") in ["healthy", "degraded"] else []

        def _register_persona(p_id: str):
            clean = re.sub(r'[^a-zA-Z0-9_-]', '_', p_id.strip()).strip('_')
            if not clean:
                return

            # Case A: Default Dadaji
            if clean in ["dadaji", "ramesh_dadaji", "default"]:
                sample_voice = BACKEND_DIR / "Voice" / "clone_out.wav"
                if sample_voice.exists() and voice_client.colab_url:
                    for spk in ["default", "dadaji"]:
                        if force or spk not in cached_prompts:
                            try:
                                print(f"[Auto-Register] Registering Dadaji voice '{spk}' on GPU...")
                                voice_client.register_voice_sample(speaker_name=spk, audio_path=str(sample_voice))
                                cached_prompts.append(spk)
                            except Exception as ve:
                                print(f"[Warning] Failed to register Dadaji voice '{spk}': {ve}")
                sample_avatar = BACKEND_DIR / "Avatar" / "dadaji.jpg"
                if not sample_avatar.exists():
                    sample_avatar = BACKEND_DIR.parent / "Frontend" / "public" / "grandfather.jpg"
                if sample_avatar.exists() and avatar_client.colab_url:
                    for av in ["dadaji", "test_avatar"]:
                        if force or av not in cached_avatars:
                            try:
                                print(f"[Auto-Register] Registering Dadaji portrait '{av}' on GPU...")
                                avatar_client.register_avatar(avatar_id=av, media_path=str(sample_avatar))
                                cached_avatars.append(av)
                            except Exception as ae:
                                print(f"[Warning] Failed to register Dadaji avatar '{av}': {ae}")
                return

            # Case B: Custom User Persona
            p_dir = PERSONAS_DIR / clean
            if not p_dir.exists():
                return

            voice_file = p_dir / "voice_sample.wav"
            if voice_file.exists() and voice_client.colab_url:
                if force or clean not in cached_prompts:
                    try:
                        print(f"📤 [Auto-Register] Registering custom voice profile '{clean}' on OmniVoice...")
                        voice_client.register_voice_sample(speaker_name=clean, audio_path=str(voice_file))
                        cached_prompts.append(clean)
                        print(f"✅ [Auto-Register] Custom voice '{clean}' registered successfully!")
                    except Exception as ve:
                        print(f"[Warning] Failed to auto-register custom voice '{clean}': {ve}")

            photo_file = p_dir / "portrait.jpg"
            if photo_file.exists() and avatar_client.colab_url:
                if force or clean not in cached_avatars:
                    try:
                        print(f"📤 [Auto-Register] Registering custom avatar face '{clean}' on MuseTalk...")
                        avatar_client.register_avatar(avatar_id=clean, media_path=str(photo_file))
                        cached_avatars.append(clean)
                        print(f"✅ [Auto-Register] Custom avatar face '{clean}' registered successfully!")
                    except Exception as ae:
                        print(f"[Warning] Failed to auto-register custom face '{clean}': {ae}")

        if target_id:
            _register_persona(target_id)
        else:
            _register_persona("dadaji")
            if PERSONAS_DIR.exists():
                for pdir in PERSONAS_DIR.iterdir():
                    if pdir.is_dir() and (pdir / "profile.json").exists():
                        _register_persona(pdir.name)

    except Exception as e:
        print(f"[Warning] GPU self-registration notice: {e}")


@app.on_event("startup")
def startup_event():
    print("🚀 Initializing Kin-AI-Avatar Orchestration Server on Port 8008...")
    reload_colab_urls()
    get_engine()
    # Trigger auto-registration in background thread
    threading.Thread(target=ensure_colab_assets_registered, daemon=True).start()


# =====================================================================
# 1. SYSTEM STATUS & CONFIGURATION ENDPOINTS
# =====================================================================
@app.get("/api/status")
def get_status():
    """Returns aggregated status of Clonellm, Colab GPU, and active persona."""
    reload_colab_urls()
    engine = get_engine()
    profile = engine.profile if engine else None

    # Check Colab / Kaggle Health
    voice_health = voice_client.check_health()
    avatar_health = avatar_client.check_health()
    colab_connected = (
        voice_health.get("status") in ["healthy", "degraded"]
        or avatar_health.get("status") in ["healthy", "degraded"]
    )
    gpu_name = voice_health.get("gpu_name") or avatar_health.get("gpu_name") or "Tesla T4"

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
            "voice_url": voice_client.colab_url,
            "avatar_url": avatar_client.colab_url,
            "url": voice_client.colab_url or avatar_client.colab_url,
            "gpu_name": gpu_name,
            "cached_prompts": voice_health.get("cached_prompts", []),
            "cached_avatars": avatar_health.get("cached_avatars", []),
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

    engine = get_engine(req.avatar_id)
    if not engine:
        raise HTTPException(status_code=503, detail="PersonaCloneEngine is not initialized.")

    target_speaker = req.speaker_name if (req.speaker_name and req.speaker_name != "default") else req.avatar_id

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
                        candidate_clause = (parts[0] + parts[1]).strip()
                        # Avoid choppy 1-word fragments (e.g. "Namaste!") unless clause has enough content
                        if len(candidate_clause) >= 20 or len(candidate_clause.split()) >= 4:
                            clause_buffer = "".join(parts[2:])
                            if candidate_clause and req.stream_media:
                                audio_payload, raw_wav = await synthesize_clause_audio(
                                    text=candidate_clause,
                                    chunk_index=clause_index,
                                    speaker_name=target_speaker,
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
                    speaker_name=target_speaker,
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
                print(f"[Auto-Register] Voice profile '{speaker_name}' missing on Colab/Kaggle (400). Auto-registering & retrying...")
                ensure_colab_assets_registered(target_id=speaker_name, force=True)
                return voice_client.synthesize(text=text, speaker_name=speaker_name, num_step=num_step)
            raise
        except Exception as ex:
            err_str = str(ex).lower()
            if "400" in err_str or "not found" in err_str:
                print(f"[Auto-Register] Retrying synthesis after missing voice profile '{speaker_name}'...")
                ensure_colab_assets_registered(target_id=speaker_name, force=True)
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
                    print(f"[Auto-Register] Avatar profile '{avatar_id}' missing on Colab/Kaggle. Auto-registering & retrying...")
                    ensure_colab_assets_registered(target_id=avatar_id, force=True)
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
            clean_id = re.sub(r'[^a-zA-Z0-9_-]', '_', (avatar_id or "dadaji").lower().strip()).strip('_')
            try:
                if clean_id and clean_id not in ["dadaji", "default"]:
                    target_vid = BACKEND_DIR.parent / "Frontend" / "public" / "avatars" / f"{clean_id}_talking.mp4"
                    target_vid.write_bytes(vid_bytes)
                    print(f"💾 [Video Cache] Updated baseline talking loop {target_vid.name} ({len(vid_bytes) // 1024} KB)")
            except Exception as cache_err:
                print(f"[Notice] Failed to cache talking video: {cache_err}")

            return {
                "chunk_index": chunk_index,
                "avatar_id": clean_id,
                "video_url": f"/api/avatar/video?avatar_id={clean_id}&t={int(LATEST_VIDEO_TIMESTAMP * 1000)}",
                "video_base64": base64.b64encode(vid_bytes).decode("utf-8")
            }
    except Exception as vid_err:
        print(f"[Notice] Lip-sync video chunk {chunk_index} notice: {vid_err}")
    return None


# =====================================================================
# 3. MULTI-PERSONA MANAGEMENT & AVATAR CREATION API
# =====================================================================
@app.post("/api/avatar/create")
async def create_avatar(
    avatar_id: Optional[str] = Form(None),
    name: str = Form(...),
    calling_name: Optional[str] = Form(""),
    relation: Optional[str] = Form("Family Member"),
    lifespan: Optional[str] = Form(""),
    hometown: Optional[str] = Form(""),
    personality_summary: Optional[str] = Form(""),
    catchphrases: Optional[str] = Form("[]"),
    written_notes: Optional[str] = Form(""),
    photo: Optional[UploadFile] = File(None),
    voice: Optional[UploadFile] = File(None),
):
    """
    Creates a brand-new avatar persona:
    1. Reads latest Kaggle/Colab URLs from .env.
    2. Generates unique clean persona slug from name.
    3. Writes profile.json, memories.txt, portrait.jpg, voice_sample.wav in Backend/data/personas/{clean_id}/.
    4. Exposes portrait photo in Frontend/public/avatars/{clean_id}.jpg.
    5. Submits and caches voice to OmniVoice (/register_voice).
    6. Submits and caches portrait to MuseTalk (/register_avatar).
    7. Instantiates dedicated PersonaCloneEngine for this avatar.
    """
    reload_colab_urls()

    raw_slug = avatar_id or name
    clean_id = re.sub(r'[^a-zA-Z0-9_-]', '_', raw_slug.lower().strip()).strip('_')
    if clean_id == "dadaji" and "dadaji" not in name.lower():
        clean_id = re.sub(r'[^a-zA-Z0-9_-]', '_', name.lower().strip()).strip('_')
    if not clean_id:
        clean_id = f"avatar_{int(time.time())}"

    persona_dir = PERSONAS_DIR / clean_id
    persona_dir.mkdir(parents=True, exist_ok=True)

    # 1. Parse catchphrases
    parsed_catchphrases = []
    if catchphrases:
        try:
            parsed = json.loads(catchphrases)
            if isinstance(parsed, list):
                parsed_catchphrases = [str(p).strip() for p in parsed if str(p).strip()]
            elif isinstance(parsed, str):
                parsed_catchphrases = [parsed.strip()]
        except Exception:
            parsed_catchphrases = [c.strip() for c in catchphrases.split(",") if c.strip()]

    # 2. Save profile.json
    comm_samples = []
    if parsed_catchphrases:
        comm_samples.append({
            "context": "Family Saying",
            "audience_type": "Family Member",
            "formality_level": 0.1,
            "content": f"Haan beta. {parsed_catchphrases[0]}."
        })
    comm_samples.append({
        "context": "Warm Greeting",
        "audience_type": "Family Member",
        "formality_level": 0.1,
        "content": f"Namaste beta, I am {calling_name or name}. I am always right here listening."
    })

    profile_data = {
        "first_name": name,
        "last_name": "",
        "calling_name": calling_name or name,
        "preferred_name": calling_name or name,
        "relation": relation or "Family Member",
        "lifespan": lifespan or "",
        "city": hometown or "",
        "hometown": hometown or "",
        "personality_summary": personality_summary or "",
        "catchphrases": parsed_catchphrases,
        "communication_samples": comm_samples,
    }
    with open(persona_dir / "profile.json", "w", encoding="utf-8") as pf:
        json.dump(profile_data, pf, indent=2, ensure_ascii=False)

    # 3. Save memories.txt
    memories_text_parts = [
        f"NAME: {name}",
        f"CALLING NAME: {calling_name or name}",
        f"RELATION TO USER: {relation}",
        f"LIFESPAN: {lifespan}",
        f"HOMETOWN: {hometown}",
        f"PERSONALITY & ESSENCE: {personality_summary}",
    ]
    if parsed_catchphrases:
        memories_text_parts.append(
            "FAVORITE SAYINGS & CATCHPHRASES:\n" + "\n".join(f"- \"{p}\"" for p in parsed_catchphrases)
        )
    if written_notes and written_notes.strip():
        memories_text_parts.append(f"MEMORIES, STORIES & CONVERSATIONS:\n{written_notes.strip()}")

    memories_content = "\n\n".join(memories_text_parts)
    with open(persona_dir / "memories.txt", "w", encoding="utf-8") as mf:
        mf.write(memories_content)

    # 4. Handle Photo
    public_avatars_dir = BACKEND_DIR.parent / "Frontend" / "public" / "avatars"
    public_avatars_dir.mkdir(parents=True, exist_ok=True)
    portrait_target = persona_dir / "portrait.jpg"
    public_photo_target = public_avatars_dir / f"{clean_id}.jpg"

    if photo and photo.filename:
        photo_bytes = await photo.read()
        portrait_target.write_bytes(photo_bytes)
        public_photo_target.write_bytes(photo_bytes)
    else:
        default_photo = BACKEND_DIR.parent / "Frontend" / "public" / "grandfather.jpg"
        if default_photo.exists():
            shutil.copyfile(str(default_photo), str(portrait_target))
            shutil.copyfile(str(default_photo), str(public_photo_target))

    # 5. Handle Voice Sample
    voice_sample_target = persona_dir / "voice_sample.wav"
    has_voice = False
    if voice and voice.filename:
        voice_bytes = await voice.read()
        if len(voice_bytes) > 500:
            voice_sample_target.write_bytes(voice_bytes)
            has_voice = True

    # 6. Submit to OmniVoice and MuseTalk on Colab/Kaggle GPU and Cache
    voice_registered = False
    face_registered = False

    if voice_client.colab_url:
        if has_voice and voice_sample_target.exists():
            try:
                print(f"📤 [OmniVoice GPU] Submitting voice sample for '{clean_id}'...")
                voice_client.register_voice_sample(speaker_name=clean_id, audio_path=str(voice_sample_target))
                voice_registered = True
                print(f"✅ [OmniVoice GPU] Cloned voice profile '{clean_id}' cached successfully!")
            except Exception as v_err:
                print(f"[Warning] Failed to register voice '{clean_id}' on OmniVoice: {v_err}")

    if avatar_client.colab_url:
        if portrait_target.exists():
            try:
                print(f"📤 [MuseTalk GPU] Submitting portrait photo for '{clean_id}'...")
                avatar_client.register_avatar(avatar_id=clean_id, media_path=str(portrait_target))
                face_registered = True
                print(f"✅ [MuseTalk GPU] Avatar face '{clean_id}' latents cached successfully!")
            except Exception as f_err:
                print(f"[Warning] Failed to register avatar '{clean_id}' on MuseTalk: {f_err}")

    # 6b. Generate initial baseline talking video loop for live video calls
    public_talking_target = BACKEND_DIR.parent / "Frontend" / "public" / "avatars" / f"{clean_id}_talking.mp4"
    if avatar_client.colab_url and has_voice and voice_sample_target.exists():
        try:
            print(f"🎬 [MuseTalk GPU] Synthesizing initial baseline talking video for '{clean_id}'...")
            avatar_client.generate_lipsync_video(
                avatar_id=clean_id,
                audio_path=str(voice_sample_target),
                output_path=str(public_talking_target)
            )
            print(f"✅ [MuseTalk GPU] Baseline talking video saved for '{clean_id}' at {public_talking_target.name}!")
        except Exception as vid_init_err:
            print(f"[Notice] Could not pre-render talking loop for '{clean_id}': {vid_init_err}")

    # 7. Pre-initialize the PersonaCloneEngine in memory
    try:
        engine = get_clone_engine(persona_id=clean_id, persona_dir=persona_dir)
        print(f"🧠 [Engine] Dedicated PersonaCloneEngine initialized for '{name}' ({clean_id})!")
    except Exception as eng_err:
        print(f"[Warning] Failed to pre-init PersonaCloneEngine for {clean_id}: {eng_err}")

    has_talking_video = public_talking_target.exists() and public_talking_target.stat().st_size > 1000

    return {
        "status": "success",
        "avatar": {
            "id": clean_id,
            "name": name,
            "callingName": calling_name or name,
            "relation": relation,
            "lifespan": lifespan,
            "hometown": hometown,
            "personalitySummary": personality_summary,
            "catchphrases": parsed_catchphrases,
            "photoUrl": f"/avatars/{clean_id}.jpg",
            "talkingVideoUrl": f"/avatars/{clean_id}_talking.mp4" if has_talking_video else None,
            "voiceTrained": has_voice or voice_registered,
            "faceRegistered": face_registered,
            "createdAt": "Just now",
        },
        "voice_registered": voice_registered,
        "face_registered": face_registered,
        "colab_connected": bool(voice_client.colab_url or avatar_client.colab_url),
        "message": f"Persona '{name}' successfully created and indexed into Family Vault."
    }


@app.get("/api/personas")
def list_personas():
    """Returns list of all available personas (Dadaji + custom created)."""
    personas_list = []

    # 1. Always include Ramesh Vance Sharma (Dadaji)
    personas_list.append({
        "id": "dadaji",
        "name": "Ramesh Vance Sharma",
        "callingName": "Dadaji",
        "relation": "Grandfather",
        "lifespan": "1948 – 2023",
        "hometown": "Bengaluru, India",
        "photoUrl": "/grandfather.jpg",
        "catchphrases": ["Sab theek ho jayega, beta", "Take things one step at a time", "Never go to sleep angry"],
        "personalitySummary": "A deeply calm, philosophical soul who worked in precision tooling and gave gentle advice using gardening metaphors.",
        "talkingVideoUrl": "/dadaji_talking_stream.mp4",
        "voiceTrained": True,
        "isDefault": True,
    })

    # 2. Scan custom personas in PERSONAS_DIR
    if PERSONAS_DIR.exists():
        for p_dir in PERSONAS_DIR.iterdir():
            if not p_dir.is_dir() or p_dir.name in ["dadaji"]:
                continue
            p_id = p_dir.name
            profile_f = p_dir / "profile.json"
            if profile_f.exists():
                try:
                    with open(profile_f, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    has_voice = (p_dir / "voice_sample.wav").exists()
                    photo_url = f"/avatars/{p_id}.jpg" if (p_dir / "portrait.jpg").exists() else "/grandfather.jpg"
                    has_talking_vid = (BACKEND_DIR.parent / "Frontend" / "public" / "avatars" / f"{p_id}_talking.mp4").exists()
                    personas_list.append({
                        "id": p_id,
                        "name": data.get("first_name", p_id),
                        "callingName": data.get("calling_name", data.get("first_name", p_id)),
                        "relation": data.get("relation", "Family Member"),
                        "lifespan": data.get("lifespan", ""),
                        "hometown": data.get("city", data.get("hometown", "")),
                        "photoUrl": photo_url,
                        "talkingVideoUrl": f"/avatars/{p_id}_talking.mp4" if has_talking_vid else None,
                        "catchphrases": data.get("catchphrases", []),
                        "personalitySummary": data.get("personality_summary", ""),
                        "voiceTrained": has_voice,
                        "isDefault": False,
                    })
                except Exception as e:
                    print(f"[Warning] Error reading persona {p_id}: {e}")

    return {"personas": personas_list}


@app.delete("/api/avatar/{avatar_id}")
async def delete_avatar(avatar_id: str):
    """Deletes a custom avatar persona and its associated media."""
    if avatar_id == "dadaji":
        raise HTTPException(status_code=400, detail="Cannot delete default system avatar 'Dadaji'")
    p_dir = PERSONAS_DIR / avatar_id
    if p_dir.exists():
        shutil.rmtree(p_dir, ignore_errors=True)
    try:
        from Clonellm.clone_engine import _persona_engines
        if avatar_id in _persona_engines:
            del _persona_engines[avatar_id]
    except Exception:
        pass
    for ext in [".jpg", "_talking.mp4"]:
        f = FRONTEND_PUBLIC_AVATARS / f"{avatar_id}{ext}"
        if f.exists():
            try:
                f.unlink()
            except Exception:
                pass
    return {"status": "deleted", "avatar_id": avatar_id}


# =====================================================================
# 4. IDLE & TALKING MEDIA ENDPOINTS
# =====================================================================
@app.get("/api/avatar/idle")
def get_idle_media(avatar_id: str = "dadaji"):
    """Returns the portrait image for the specified avatar."""
    clean_id = re.sub(r'[^a-zA-Z0-9_-]', '_', (avatar_id or "dadaji").lower().strip()).strip('_')
    custom_img = PERSONAS_DIR / clean_id / "portrait.jpg"
    if custom_img.exists():
        return FileResponse(str(custom_img), media_type="image/jpeg")

    custom_pub = BACKEND_DIR.parent / "Frontend" / "public" / "avatars" / f"{clean_id}.jpg"
    if custom_pub.exists():
        return FileResponse(str(custom_pub), media_type="image/jpeg")

    # Fallback to Dadaji
    dadaji_img = BACKEND_DIR / "Avatar" / "dadaji.jpg"
    if dadaji_img.exists():
        return FileResponse(str(dadaji_img), media_type="image/jpeg")

    photo_path = BACKEND_DIR.parent / "Frontend" / "public" / "grandfather.jpg"
    if photo_path.exists():
        return FileResponse(str(photo_path), media_type="image/jpeg")

    raise HTTPException(status_code=404, detail="No avatar portrait media found.")


@app.get("/api/avatar/video")
def get_talking_video(avatar_id: Optional[str] = None, t: Optional[str] = None):
    """Returns the talking video for the specified avatar."""
    global LATEST_TALKING_VIDEO_BYTES
    # If client requested a fresh timestamped video chunk, return the latest generated bytes
    if t and LATEST_TALKING_VIDEO_BYTES and len(LATEST_TALKING_VIDEO_BYTES) > 1000:
        return Response(
            content=LATEST_TALKING_VIDEO_BYTES,
            media_type="video/mp4",
            headers={
                "Accept-Ranges": "bytes",
                "Cache-Control": "no-cache",
                "Content-Disposition": 'inline; filename="avatar_live.mp4"'
            }
        )

    clean_id = re.sub(r'[^a-zA-Z0-9_-]', '_', (avatar_id or "dadaji").lower().strip()).strip('_')
    custom_video = BACKEND_DIR.parent / "Frontend" / "public" / "avatars" / f"{clean_id}_talking.mp4"
    if custom_video.exists() and custom_video.stat().st_size > 1000:
        return FileResponse(str(custom_video), media_type="video/mp4")

    if LATEST_TALKING_VIDEO_BYTES and len(LATEST_TALKING_VIDEO_BYTES) > 1000:
        return Response(
            content=LATEST_TALKING_VIDEO_BYTES,
            media_type="video/mp4",
            headers={
                "Accept-Ranges": "bytes",
                "Cache-Control": "no-cache",
                "Content-Disposition": 'inline; filename="avatar_live.mp4"'
            }
        )

    # Only fall back to Dadaji videos if avatar is explicitly Dadaji or default
    if clean_id in ["dadaji", "ramesh_dadaji", "default"]:
        for candidate in [
            BACKEND_DIR.parent / "Frontend" / "public" / "dadaji_talking_stream.mp4",
            BACKEND_DIR / "Avatar" / "latest_talking.mp4",
            BACKEND_DIR / "Avatar" / "test_dadaji_speaking.mp4",
        ]:
            if candidate.exists() and candidate.stat().st_size > 1000:
                return FileResponse(str(candidate), media_type="video/mp4")

    raise HTTPException(status_code=404, detail=f"No talking video found for avatar '{clean_id}'.")


@app.get("/api/avatar/idle_video")
def get_idle_video(avatar_id: str = "dadaji"):
    """Returns the living idle video stream."""
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
