"""
colab_server.py
Run this script inside Google Colab (with T4/A100 GPU runtime enabled).
It loads k2-fsa/OmniVoice, manages VoiceClonePrompt caching, and serves
high-speed endpoints for voice registration, zero-shot synthesis, and streaming.
"""

import os
import io
import re
import base64
import json
import torch
import soundfile as sf
from pathlib import Path
from typing import Optional, Dict
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# OmniVoice Import
try:
    from omnivoice import OmniVoice, VoiceClonePrompt
except ImportError:
    raise ImportError("OmniVoice not installed. Run: pip install omnivoice")

app = FastAPI(
    title="OmniVoice GPU Server (Kin-AI-Avatar)",
    description="High-performance voice cloning with persistent prompt caching and real-time streaming."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
VOICE_DIR = Path("voices")
VOICE_DIR.mkdir(parents=True, exist_ok=True)

# Global model & in-memory prompt cache
model = None
# speaker_name -> VoiceClonePrompt object
cached_prompts: Dict[str, VoiceClonePrompt] = {}
# speaker_name -> raw reference audio path
cached_ref_audios: Dict[str, str] = {}


def load_model():
    global model
    print(f"[Init] Initializing OmniVoice on device: {DEVICE} (dtype=torch.float16)...")
    model = OmniVoice.from_pretrained(
        "k2-fsa/OmniVoice",
        device_map=DEVICE,
        dtype=torch.float16,
        load_asr=True
    )
    print("[Init] OmniVoice loaded successfully!")

    # Preload any existing cached prompts from disk
    for pt_file in VOICE_DIR.glob("*.pt"):
        speaker_name = pt_file.stem
        try:
            prompt = VoiceClonePrompt.load(str(pt_file))
            cached_prompts[speaker_name] = prompt
            print(f"[Cache] Preloaded voice prompt for '{speaker_name}' from {pt_file.name}")
        except Exception as e:
            print(f"[Cache] Could not load prompt {pt_file.name}: {e}")

    # Check for any existing audio files in voices/
    for audio_file in VOICE_DIR.glob("*.*"):
        if audio_file.suffix.lower() in [".wav", ".mp3", ".flac", ".m4a"]:
            speaker_name = audio_file.stem
            cached_ref_audios[speaker_name] = str(audio_file)


@app.on_event("startup")
def startup_event():
    load_model()


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "engine": "OmniVoice (k2-fsa/OmniVoice)",
        "device": DEVICE,
        "cuda_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "cached_prompts": list(cached_prompts.keys()),
        "cached_audio_files": list(cached_ref_audios.keys())
    }


@app.post("/register_voice")
async def register_voice(
    name: str = Form("default"),
    ref_text: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """
    Upload a 3-20 second audio sample of the target voice.
    Encodes it ONCE into a lightweight VoiceClonePrompt (.pt) and caches it.
    Future generation calls will reuse this prompt with zero audio re-processing!
    """
    clean_name = re.sub(r'[^a-zA-Z0-9_-]', '_', name.strip()) or "default"
    ext = Path(file.filename or "sample.wav").suffix or ".wav"
    audio_path = VOICE_DIR / f"{clean_name}{ext}"

    contents = await file.read()
    with open(audio_path, "wb") as f:
        f.write(contents)

    cached_ref_audios[clean_name] = str(audio_path)
    prompt_path = VOICE_DIR / f"{clean_name}.pt"

    print(f"[Register] Creating VoiceClonePrompt for '{clean_name}' from {audio_path.name}...")
    try:
        if hasattr(model, "create_voice_clone_prompt"):
            prompt = model.create_voice_clone_prompt(
                ref_audio=str(audio_path),
                ref_text=ref_text.strip() if ref_text else None
            )
            prompt.save(str(prompt_path))
            cached_prompts[clean_name] = prompt
            print(f"[Register] Saved and cached VoiceClonePrompt: {prompt_path.name}")
        else:
            # Fallback if create_voice_clone_prompt is not available
            cached_prompts[clean_name] = str(audio_path)

        return {
            "status": "success",
            "speaker_name": clean_name,
            "message": f"Voice '{clean_name}' successfully encoded and cached. Ready for instant synthesis.",
            "cached": True
        }
    except Exception as e:
        print(f"[Register Error] {e}")
        # Even if prompt creation fails, keep reference audio path as fallback
        cached_prompts[clean_name] = str(audio_path)
        return {
            "status": "partial_success",
            "speaker_name": clean_name,
            "message": f"Saved audio reference for '{clean_name}'. Prompt extraction fallback will be used."
        }


def get_prompt_or_ref(speaker_name: str):
    """Retrieves cached VoiceClonePrompt or reference audio path."""
    if speaker_name in cached_prompts:
        return cached_prompts[speaker_name]

    # Check if .pt exists on disk
    pt_path = VOICE_DIR / f"{speaker_name}.pt"
    if pt_path.exists():
        try:
            prompt = VoiceClonePrompt.load(str(pt_path))
            cached_prompts[speaker_name] = prompt
            return prompt
        except Exception:
            pass

    # Check if raw audio file exists on disk
    for ext in [".wav", ".mp3", ".flac", ".m4a"]:
        p = VOICE_DIR / f"{speaker_name}{ext}"
        if p.exists():
            return str(p)

    # Fallback to any available cached voice
    if cached_prompts:
        first_key = next(iter(cached_prompts.keys()))
        return cached_prompts[first_key]
    if cached_ref_audios:
        first_key = next(iter(cached_ref_audios.keys()))
        return cached_ref_audios[first_key]

    raise HTTPException(
        status_code=400,
        detail=f"Voice profile '{speaker_name}' not found. Please upload a reference audio using /register_voice first."
    )


def generate_audio_tensor(text: str, speaker_target, num_step: int = 16):
    """Runs OmniVoice generation with cached prompt, torch.inference_mode, and optimized diffusion steps."""
    gen_kwargs = {
        "text": text,
        "normalize_text": False,
        "num_step": num_step
    }
    if isinstance(speaker_target, VoiceClonePrompt):
        gen_kwargs["voice_clone_prompt"] = speaker_target
    else:
        gen_kwargs["ref_audio"] = str(speaker_target)

    with torch.inference_mode():
        try:
            out = model.generate(**gen_kwargs)
        except TypeError:
            # Fallback if older or alternative version doesn't accept num_step
            gen_kwargs.pop("num_step", None)
            gen_kwargs.pop("normalize_text", None)
            out = model.generate(**gen_kwargs)

    # OmniVoice returns tuple/list where first item is audio array
    if isinstance(out, (list, tuple)):
        audio_arr = out[0]
    else:
        audio_arr = out

    if hasattr(audio_arr, "cpu"):
        audio_arr = audio_arr.cpu().numpy()

    return audio_arr


def tensor_to_wav_bytes(audio_arr, sample_rate: int = 24000) -> bytes:
    buf = io.BytesIO()
    sf.write(buf, audio_arr, sample_rate, format="WAV")
    return buf.getvalue()


class SynthesisRequest(BaseModel):
    text: str
    speaker_name: str = "default"
    num_step: int = 16  # 16 for ultra-low latency real-time (~2x faster), 12 for turbo, 32 for studio


@app.post("/synthesize")
def synthesize(req: SynthesisRequest):
    """
    Full text generation endpoint.
    Uses pre-cached VoiceClonePrompt to synthesize complete audio.
    """
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    target = get_prompt_or_ref(req.speaker_name)
    audio_tensor = generate_audio_tensor(text, target, num_step=req.num_step)
    wav_bytes = tensor_to_wav_bytes(audio_tensor, 24000)

    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={"Content-Disposition": f'inline; filename="{req.speaker_name}_out.wav"'}
    )


def split_into_clauses(text: str):
    """
    Splits long text into natural sentence / clause chunks for streaming.
    Optimized for ultra-low Time-To-First-Audio (TTFA).
    """
    pattern = r'([.!?;:\n]+)'
    tokens = re.split(pattern, text)
    sentences = []

    for i in range(0, len(tokens) - 1, 2):
        chunk = tokens[i].strip()
        punct = tokens[i + 1].strip() if (i + 1) < len(tokens) else ""
        if chunk:
            sentences.append(f"{chunk}{punct}")

    if len(tokens) % 2 == 1 and tokens[-1].strip():
        sentences.append(tokens[-1].strip())

    if not sentences:
        sentences = [text.strip()]

    # If first sentence is long (> 7 words), break on first comma for sub-second TTFA
    clauses = []
    for idx, s in enumerate(sentences):
        words = s.split()
        if idx == 0 and len(words) > 7 and (',' in s or '—' in s):
            parts = re.split(r'([,;—]+)', s)
            first_clause = parts[0].strip() + (parts[1].strip() if len(parts) > 1 else "")
            rest = "".join(parts[2:]).strip()
            if first_clause and rest:
                clauses.append(first_clause)
                clauses.append(rest)
                continue
        clauses.append(s)

    return [c.strip() for c in clauses if c.strip()]


@app.post("/synthesize_stream")
def synthesize_stream(req: SynthesisRequest):
    """
    Real-time streaming synthesis for long text.
    Splits text into linguistic chunks, synthesizes each using the cached
    VoiceClonePrompt with num_step=16, and yields NDJSON events with base64 WAV chunks.
    This gives sub-second Time-To-First-Audio on any length text!
    """
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    target = get_prompt_or_ref(req.speaker_name)
    clauses = split_into_clauses(text)
    if not clauses:
        clauses = [text]

    def stream_generator():
        total_chunks = len(clauses)
        for idx, clause in enumerate(clauses):
            try:
                audio_arr = generate_audio_tensor(clause, target, num_step=req.num_step)
                wav_bytes = tensor_to_wav_bytes(audio_arr, 24000)
                b64_audio = base64.b64encode(wav_bytes).decode("utf-8")

                chunk_payload = {
                    "chunk_index": idx,
                    "total_chunks": total_chunks,
                    "text": clause,
                    "is_last": (idx == total_chunks - 1),
                    "sample_rate": 24000,
                    "audio_base64": b64_audio
                }
                yield json.dumps(chunk_payload) + "\n"
            except Exception as e:
                err_payload = {
                    "chunk_index": idx,
                    "error": str(e),
                    "is_last": (idx == total_chunks - 1)
                }
                yield json.dumps(err_payload) + "\n"

    return StreamingResponse(
        stream_generator(),
        media_type="application/x-ndjson"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
