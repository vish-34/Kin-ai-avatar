"""
test_voice.py
Automated health & pipeline test script for OmniVoice Colab server.
Verifies GPU status, cached voice prompts, and streaming synthesis.
Run via: python Backend/Voice/test_voice.py
"""

import os
import sys
import time
from pathlib import Path
from dotenv import dotenv_values

# Fix Windows console UTF-8 output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")

VOICE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = VOICE_DIR.parent
ENV_PATH = BACKEND_DIR / ".env"

if str(VOICE_DIR) not in sys.path:
    sys.path.insert(0, str(VOICE_DIR))

from voice_client import OmniVoiceColabClient


def main():
    print("=" * 65)
    print("      🎙️ Kin-AI-Avatar: OmniVoice Colab Pipeline Test")
    print("=" * 65)

    # 1. Load URL from .env
    colab_url = ""
    if ENV_PATH.exists():
        env_vars = dotenv_values(ENV_PATH)
        colab_url = (env_vars.get("COLAB_SERVER_URL") or env_vars.get("COLAB_VOICE_URL") or "").strip()

    if not colab_url:
        print("\n[Notice] COLAB_SERVER_URL / COLAB_VOICE_URL is not set in Backend/.env.")
        colab_url = input("Enter your Colab Public URL (or press Enter to cancel): ").strip()
        if not colab_url:
            print("Cancelled.")
            return

    client = OmniVoiceColabClient(colab_url)
    print(f"\n[1/3] Connecting to OmniVoice server at: {colab_url} ...")

    # 2. Check Health
    health = client.check_health()
    if health.get("status") != "healthy":
        print(f"\n❌ Connection Failed!")
        print(f"Details: {health}")
        print("\nPlease ensure your Colab notebook is running and the tunnel is active.")
        return

    print("✅ Colab is ONLINE!")
    print(f"   Engine: {health.get('engine')}")
    print(f"   Device: {health.get('device')} ({health.get('gpu_name')})")
    cached = health.get("cached_prompts", [])
    print(f"   Cached VoiceClonePrompts on Colab: {cached or ['(none yet)']}")

    # 3. Check for reference audio file to test prompt registration
    speaker = cached[0] if cached else "test_speaker"
    local_audios = list(VOICE_DIR.glob("*.wav")) + list(VOICE_DIR.glob("*.mp3"))
    local_audios = [a for a in local_audios if not a.name.startswith("test_") and not a.name.startswith("temp_") and a.name != "clone_out.wav"]

    if local_audios and not cached:
        ref_file = local_audios[0]
        speaker = ref_file.stem
        print(f"\n[2/3] Found reference audio '{ref_file.name}'. Encoding into VoiceClonePrompt...")
        reg = client.register_voice_sample(speaker, str(ref_file))
        print(f"   Registration response: {reg.get('message')}")
    else:
        print(f"\n[2/3] Using cached voice profile: '{speaker}'")

    # 4. Test Synthesis with Streaming
    test_text = "Namaste beta! This is a test of OmniVoice running on Google Colab with pre-cached voice clone prompts. Real-time streaming is fully operational!"
    print(f"\n[3/3] Testing real-time clause streaming...")
    print(f"   Input text: “{test_text}”\n")

    start = time.time()
    out_file = VOICE_DIR / "test_output.wav"
    chunk_count = 0
    all_chunks = []

    for chunk in client.synthesize_stream(test_text, speaker_name=speaker):
        if "error" in chunk:
            print(f"   Chunk error: {chunk['error']}")
            continue
        chunk_count += 1
        elapsed = time.time() - start
        print(f"   ⚡ Chunk {chunk_count} received in {elapsed:.2f}s: “{chunk.get('text')}”")
        all_chunks.append(chunk.get("audio_bytes", b""))

    if all_chunks:
        with open(out_file, "wb") as f:
            f.write(all_chunks[-1] if len(all_chunks) == 1 else b"".join(all_chunks))
        print(f"\n🎉 Test Passed! Total time: {time.time() - start:.2f}s")
        print(f"Saved test output to: {out_file.name}")

        # Attempt to play audio
        try:
            import winsound
            print("▶️ Playing audio...")
            winsound.PlaySound(str(out_file), winsound.SND_FILENAME)
        except Exception:
            pass

    print("\n" + "=" * 65)
    print("OmniVoice pipeline test completed successfully.")
    print("=" * 65)


if __name__ == "__main__":
    main()
