"""
test_voice.py
Standalone test script to check if OpenVoice is working WITHOUT touching Clonellm.
Can be run directly from terminal: python Backend/Voice/test_voice.py
"""

import os
import sys
from pathlib import Path
from dotenv import dotenv_values

# Fix Windows console encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")

# Add current dir to path
VOICE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = VOICE_DIR.parent
ENV_PATH = BACKEND_DIR / ".env"

from voice_client import ColabVoiceClient

def main():
    print("=" * 60)
    print("      🎙️ Kin-AI-Avatar: Voice Cloning Standalone Test")
    print("=" * 60)

    # 1. Load URL from .env
    colab_url = ""
    if ENV_PATH.exists():
        env_vars = dotenv_values(ENV_PATH)
        colab_url = env_vars.get("COLAB_VOICE_URL", "").strip()

    if not colab_url:
        print("\n[Notice] COLAB_VOICE_URL is not set in Backend/.env.")
        colab_url = input("Enter your Colab Public Ngrok URL (or press Enter to exit): ").strip()
        if not colab_url:
            print("Exiting test.")
            return

    client = ColabVoiceClient(colab_url)
    print(f"\n[1/3] Connecting to Colab server at: {colab_url} ...")

    # 2. Check Health
    health = client.check_health()
    if health.get("status") != "healthy":
        print(f"\n❌ Connection Failed!")
        print(f"Error details: {health}")
        print("\nPlease ensure:")
        print("1. Your Google Colab notebook is running.")
        print("2. The Ngrok tunnel cell is active.")
        print("3. You copied the correct 'https://...ngrok-free.app' URL.")
        return

    print(f"✅ Colab is ONLINE!")
    print(f"   Device: {health.get('device')} ({health.get('gpu_name')})")
    speakers = health.get("loaded_speakers", [])
    print(f"   Registered voice profiles on Colab: {speakers or ['(none yet, using elder default)']}")

    speaker_name = speakers[0] if speakers else "elder"

    # 3. Choose test sentence
    default_text = "Hello! This is a test of OpenVoice running on Google Colab. If you can hear this, your voice cloning pipeline is working perfectly!"
    print("\n[2/3] Choose test text:")
    user_text = input(f"Enter text to speak (Press Enter for default): ").strip()
    test_text = user_text if user_text else default_text

    print(f"\n[3/3] Generating speech with voice profile '{speaker_name}'...")
    output_wav = str(VOICE_DIR / "test_output.wav")

    try:
        client.synthesize_to_file(
            text=test_text,
            output_path=output_wav,
            speaker_name=speaker_name,
            accent="en-us",
            speed=1.0
        )
        print(f"🎉 Success! Audio saved to: {output_wav}")

        # Automatically play the audio file on Windows
        try:
            print("▶️ Playing audio...")
            import winsound
            winsound.PlaySound(output_wav, winsound.SND_FILENAME)
        except Exception:
            # Fallback: open with default media player
            os.startfile(output_wav)

    except Exception as e:
        print(f"\n❌ Synthesis failed: {e}")

    print("\n" + "=" * 60)
    print("Test completed.")
    print("=" * 60)

if __name__ == "__main__":
    main()
