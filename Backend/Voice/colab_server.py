"""
colab_server.py
Run this script inside Google Colab (with T4 GPU runtime enabled).
It loads OpenVoice V2 and serves endpoints for instant voice cloning and streaming.
Exposes a public URL via pyngrok for your local Kin-ai-avatar app.
"""

import os
import io
import torch
import soundfile as sf
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# OpenVoice & MeloTTS Imports
from openvoice import se_extractor
from openvoice.api import ToneColorConverter
from openvoice.mel_processing import spectrogram_torch
from melo.api import TTS

app = FastAPI(title="Kin-AI-Avatar Voice & LipSync Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
print(f"[Init] Running on device: {DEVICE}")

# Global Model References
tone_converter = None
melo_tts = None
speaker_ids = None
source_se_dict = {}
target_se_cache = {}  # speaker_name -> embedding tensor

DEFAULT_VOICE_DIR = "voices"
os.makedirs(DEFAULT_VOICE_DIR, exist_ok=True)
CHECKPOINTS_DIR = "checkpoints_v2"


def load_models():
    global tone_converter, melo_tts, speaker_ids, source_se_dict

    # 1. Load Tone Color Converter
    converter_path = os.path.join(CHECKPOINTS_DIR, "converter")
    if not os.path.exists(f"{converter_path}/checkpoint.pth"):
        raise FileNotFoundError(
            f"Checkpoints not found in {converter_path}. Make sure to download OpenVoiceV2 checkpoints first."
        )

    print("[Init] Loading ToneColorConverter...")
    tone_converter = ToneColorConverter(
        f"{converter_path}/config.json", 
        device=DEVICE
    )
    tone_converter.load_ckpt(f"{converter_path}/checkpoint.pth")
    tone_converter.watermark_model = None  # Disabled for speed

    # 2. Load MeloTTS Base Model (English default)
    print("[Init] Loading MeloTTS...")
    melo_tts = TTS(language="EN", device=DEVICE)
    speaker_ids = melo_tts.hps.data.spk2id

    # 3. Preload Base Speaker Source Embeddings
    ses_dir = os.path.join(CHECKPOINTS_DIR, "base_speakers", "ses")
    if os.path.exists(ses_dir):
        for fname in os.listdir(ses_dir):
            if fname.endswith(".pth"):
                key = fname.replace(".pth", "")
                source_se_dict[key] = torch.load(os.path.join(ses_dir, fname), map_location=DEVICE)
    print(f"[Init] Models loaded successfully! Available base speakers: {list(source_se_dict.keys())}")


class SynthesisRequest(BaseModel):
    text: str
    speaker_name: str = "elder"
    accent: str = "en-us"  # Options: en-us, en-br, en-india, en-au, en-default
    speed: float = 1.0


@app.on_event("startup")
def startup_event():
    load_models()


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "device": DEVICE,
        "cuda_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "None",
        "loaded_targets": list(target_se_cache.keys())
    }


@app.post("/register_voice")
async def register_voice(name: str = Form("elder"), file: UploadFile = File(...)):
    """
    Upload a 5-15 second reference audio sample of the person to clone.
    Extracts and caches the target tone color embedding.
    """
    save_path = os.path.join(DEFAULT_VOICE_DIR, f"{name}.wav")
    contents = await file.read()
    with open(save_path, "wb") as f:
        f.write(contents)

    print(f"[Voice] Extracting tone color embedding for '{name}' from {save_path}...")
    target_se, _ = se_extractor.get_se(save_path, tone_converter, vad=True)
    target_se_cache[name] = target_se

    # Also persist to disk for fast reload
    torch.save(target_se.cpu(), os.path.join(DEFAULT_VOICE_DIR, f"{name}_se.pth"))
    return {"status": "success", "message": f"Voice profile '{name}' registered successfully."}


def convert_audio_in_ram(audio_np, sample_rate, src_se, tgt_se):
    """Performs tone conversion purely in VRAM without file I/O."""
    hps = tone_converter.hps
    audio_tensor = torch.from_numpy(audio_np).float().to(DEVICE).unsqueeze(0)

    with torch.no_grad():
        spec = spectrogram_torch(
            audio_tensor,
            hps.data.filter_length,
            hps.data.sampling_rate,
            hps.data.hop_length,
            hps.data.win_length,
            center=False
        ).to(DEVICE)
        spec_lengths = torch.LongTensor([spec.size(-1)]).to(DEVICE)

        converted = tone_converter.model.voice_conversion(
            spec,
            spec_lengths,
            sid_src=src_se,
            sid_tgt=tgt_se,
            tau=0.3
        )[0][0, 0].data.cpu().float().numpy()

    return converted, hps.data.sampling_rate


@app.post("/synthesize")
def synthesize_speech(req: SynthesisRequest):
    """
    Generate cloned audio for a sentence.
    Returns full WAV audio file.
    """
    if req.speaker_name not in target_se_cache:
        # Check if saved on disk
        pth_path = os.path.join(DEFAULT_VOICE_DIR, f"{req.speaker_name}_se.pth")
        if os.path.exists(pth_path):
            target_se_cache[req.speaker_name] = torch.load(pth_path, map_location=DEVICE)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Voice profile '{req.speaker_name}' not found. Register a voice first via /register_voice"
            )

    target_se = target_se_cache[req.speaker_name]
    accent_key = req.accent.lower()
    source_se = source_se_dict.get(accent_key, source_se_dict.get("en-us"))
    
    # Map accent to MeloTTS speaker key
    spk_key = "EN-US"
    for k in speaker_ids:
        if k.lower() == accent_key.replace("-", ""):
            spk_key = k
            break

    # 1. Generate base speech in RAM
    base_audio = melo_tts.tts_to_file(req.text, speaker_ids[spk_key], output_path=None, speed=req.speed)

    # 2. Tone Color Conversion in RAM
    cloned_audio, sr = convert_audio_in_ram(base_audio, 22050, source_se, target_se)

    # 3. Pack into WAV in-memory buffer
    out_buf = io.BytesIO()
    sf.write(out_buf, cloned_audio, sr, format="WAV")
    out_buf.seek(0)

    return Response(content=out_buf.getvalue(), media_type="audio/wav")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
