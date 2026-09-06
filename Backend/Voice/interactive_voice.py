"""
interactive_voice.py
Terminal Interactive Voice Studio for Kin-AI-Avatar using OmniVoice on Google Colab.
Features:
- Scans Backend/Voice/ for audio files and uploads/registers them.
- Leverages VoiceClonePrompt caching so reference audio is never re-processed.
- Interactive terminal chat: input any text, hear cloned voice stream in real-time.
- Saves combined speech to clone_out.wav.
"""

import os
import sys
import time
import io
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

import threading
import queue

AUDIO_EXTS = [".wav", ".mp3", ".flac", ".m4a", ".ogg"]


def play_wav_bytes(wav_bytes: bytes):
    """Plays WAV audio bytes on Windows or platform player."""
    try:
        import winsound
        winsound.PlaySound(wav_bytes, winsound.SND_MEMORY)
    except Exception:
        temp_file = VOICE_DIR / "temp_chunk.wav"
        with open(temp_file, "wb") as f:
            f.write(wav_bytes)
        try:
            os.startfile(str(temp_file))
        except Exception:
            pass


class AudioPlaybackQueue:
    """Non-blocking audio playback worker that plays chunks sequentially in background."""
    def __init__(self):
        self.q = queue.Queue()
        self.worker = threading.Thread(target=self._run, daemon=True)
        self.worker.start()

    def _run(self):
        while True:
            chunk = self.q.get()
            if chunk is None:
                break
            try:
                play_wav_bytes(chunk)
            except Exception:
                pass
            self.q.task_done()

    def play(self, wav_bytes: bytes):
        self.q.put(wav_bytes)

    def wait_done(self):
        self.q.join()


def combine_wav_chunks(chunks_bytes_list, output_file_path):
    """Combines multiple WAV chunks into a single unified WAV file."""
    if not chunks_bytes_list:
        return
    if len(chunks_bytes_list) == 1:
        with open(output_file_path, "wb") as f:
            f.write(chunks_bytes_list[0])
        return

    import wave
    frames = []
    params = None
    for b in chunks_bytes_list:
        try:
            with wave.open(io.BytesIO(b), 'rb') as w:
                if params is None:
                    params = w.getparams()
                frames.append(w.readframes(w.getnframes()))
        except Exception:
            pass

    if params and frames:
        with wave.open(str(output_file_path), 'wb') as w_out:
            w_out.setparams(params)
            for f in frames:
                w_out.writeframes(f)
    else:
        with open(output_file_path, "wb") as f:
            f.write(chunks_bytes_list[-1])


def get_colab_url():
    url = ""
    if ENV_PATH.exists():
        env_vars = dotenv_values(ENV_PATH)
        url = (env_vars.get("COLAB_SERVER_URL") or env_vars.get("COLAB_VOICE_URL") or "").strip()

    if not url:
        print("\n[Configuration] COLAB_SERVER_URL / COLAB_VOICE_URL not found in Backend/.env.")
        url = input("Enter your public Google Colab URL (e.g., https://xxxx.trycloudflare.com): ").strip()
        if url:
            # Persist to .env
            try:
                lines = []
                if ENV_PATH.exists():
                    lines = ENV_PATH.read_text(encoding="utf-8").splitlines()
                lines = [l for l in lines if not l.startswith("COLAB_VOICE_URL") and not l.startswith("COLAB_SERVER_URL")]
                lines.append(f"COLAB_SERVER_URL = {url}")
                lines.append(f"COLAB_VOICE_URL = {url}")
                ENV_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
                print(f"Saved COLAB_SERVER_URL and COLAB_VOICE_URL to {ENV_PATH}")
            except Exception:
                pass
    return url


def scan_local_audio_files():
    files = []
    for ext in AUDIO_EXTS:
        files.extend(list(VOICE_DIR.glob(f"*{ext}")))
    # Exclude output files
    files = [f for f in files if not f.name.startswith("temp_") and f.name != "clone_out.wav" and f.name != "test_output.wav"]
    return sorted(files)


def select_or_register_voice(client: OmniVoiceColabClient):
    print("\n" + "─" * 60)
    print(" 🎤 Select or Register Voice Profile")
    print("─" * 60)

    # 1. Check existing cached prompts on Colab
    health = client.check_health()
    cached_prompts = health.get("cached_prompts", [])

    if cached_prompts:
        print(f"Cached Voice Profiles on Colab (Ready with 0ms re-encoding):")
        for i, name in enumerate(cached_prompts, 1):
            print(f"  [{i}] {name} (cached in Colab VRAM & disk)")

    # 2. Check local audio files in Backend/Voice/
    local_files = scan_local_audio_files()
    offset = len(cached_prompts)

    if local_files:
        print(f"\nLocal Audio Files found in Backend/Voice/:")
        for j, fpath in enumerate(local_files, offset + 1):
            size_kb = fpath.stat().st_size // 1024
            print(f"  [{j}] {fpath.name} ({size_kb} KB) - Upload & create new VoiceClonePrompt")
    else:
        print(f"\n(No local audio files found in {VOICE_DIR}. Place any .wav or .mp3 here to clone it!)")

    print(f"\n  [U] Enter custom file path to upload")
    if cached_prompts:
        print(f"  [Enter] Default to '{cached_prompts[0]}'")

    choice = input("\nChoose an option: ").strip()

    # User pressed Enter with cached prompt available
    if not choice and cached_prompts:
        return cached_prompts[0]

    # Selected cached prompt
    if choice.isdigit():
        idx = int(choice) - 1
        if 0 <= idx < len(cached_prompts):
            return cached_prompts[idx]
        elif len(cached_prompts) <= idx < len(cached_prompts) + len(local_files):
            file_to_upload = local_files[idx - len(cached_prompts)]
            speaker_name = file_to_upload.stem
            print(f"\n[Upload] Encoding '{file_to_upload.name}' into persistent VoiceClonePrompt on Colab...")
            res = client.register_voice_sample(speaker_name, str(file_to_upload))
            print(f"✅ Success! Voice '{speaker_name}' is now registered and cached for all future generations.")
            return speaker_name

    # Custom path
    if choice.lower() == 'u' or choice.startswith(('"', "'", "C:", "c:", "/", "\\")):
        custom_path = choice if choice.lower() != 'u' else input("Enter path to audio file: ").strip().strip('"').strip("'")
        p = Path(custom_path)
        if not p.exists():
            print(f"❌ File does not exist: {p}")
            return cached_prompts[0] if cached_prompts else "default"
        speaker_name = p.stem
        print(f"\n[Upload] Encoding '{p.name}' into VoiceClonePrompt...")
        client.register_voice_sample(speaker_name, str(p))
        print(f"✅ Voice '{speaker_name}' cached successfully.")
        return speaker_name

    return cached_prompts[0] if cached_prompts else "default"


def run_interactive_studio():
    print("=" * 65)
    print("   🎙️  Kin-AI-Avatar: OmniVoice Terminal Interactive Studio")
    print("   Persistent VoiceClonePrompt Caching & Real-Time Streaming")
    print("=" * 65)

    colab_url = get_colab_url()
    if not colab_url:
        print("❌ No Colab URL provided. Exiting.")
        return

    client = OmniVoiceColabClient(colab_url)
    print(f"\n[1/2] Connecting to OmniVoice GPU Server at: {colab_url} ...")

    health = client.check_health()
    if health.get("status") != "healthy":
        print(f"❌ Connection Failed: {health}")
        print("Please verify that your Google Colab notebook is running and your tunnel URL is active.")
        return

    print(f"✅ Connected to Colab GPU Server!")
    print(f"   Engine: {health.get('engine')}")
    print(f"   GPU:    {health.get('gpu_name')} ({health.get('device')})")

    active_speaker = select_or_register_voice(client)

    print("\n" + "=" * 65)
    print(f" ✨ Active Voice Profile: [{active_speaker}]")
    print(" Commands: 'switch' to change voice | 'file' to toggle full file mode | 'exit' to quit")
    print(" Type any sentence or long paragraph below to hear it synthesized.")
    print("=" * 65 + "\n")

    output_file = VOICE_DIR / "clone_out.wav"
    streaming_mode = True
    num_step = 16  # 16 = fast real-time (2x faster than default 32), 12 = ultra turbo
    playback_queue = AudioPlaybackQueue()

    while True:
        try:
            user_text = input(f"\n[{active_speaker} | {num_step} steps] Text to speak: ").strip()
            if not user_text:
                continue

            if user_text.lower() in ["exit", "quit", "q"]:
                print("\nGoodbye! Voice studio closed.")
                break

            if user_text.lower() in ["switch", "change", "voice"]:
                active_speaker = select_or_register_voice(client)
                print(f"Switched active voice to: [{active_speaker}]")
                continue

            if user_text.lower() in ["turbo", "fast", "speed"]:
                num_step = 12 if num_step == 16 else (16 if num_step == 32 else 32)
                mode_label = "Ultra Turbo (12 steps)" if num_step == 12 else ("Fast Real-Time (16 steps)" if num_step == 16 else "Studio Fidelity (32 steps)")
                print(f"Inference Mode: {mode_label}")
                continue

            if user_text.lower() == "stream":
                streaming_mode = not streaming_mode
                print(f"Streaming mode: {'ON (Sentence chunks stream in real-time)' if streaming_mode else 'OFF (Full file generated at once)'}")
                continue

            # Start Synthesis
            start_time = time.time()
            all_wav_chunks = []

            if streaming_mode:
                print(f"⚡ Streaming speech with cached voice '{active_speaker}' ({num_step} steps)...")
                first_chunk_received = False

                for chunk in client.synthesize_stream(user_text, speaker_name=active_speaker, num_step=num_step):
                    if "error" in chunk:
                        print(f"\n❌ Chunk Error: {chunk['error']}")
                        continue

                    chunk_idx = chunk.get("chunk_index", 0)
                    total_chunks = chunk.get("total_chunks", 1)
                    clause_text = chunk.get("text", "")
                    audio_bytes = chunk.get("audio_bytes", b"")

                    if not first_chunk_received:
                        ttfb = time.time() - start_time
                        print(f"⚡ First audio chunk ready in {ttfb:.2f}s! Playing live...")
                        first_chunk_received = True

                    print(f"  ▶️ [{chunk_idx + 1}/{total_chunks}] “{clause_text}”")
                    all_wav_chunks.append(audio_bytes)

                    # Queue chunk immediately for continuous non-blocking audio playback
                    playback_queue.play(audio_bytes)

                total_time = time.time() - start_time
                print(f"✅ Stream chunks received in {total_time:.2f}s total.")

                # Save the complete combined audio to clone_out.wav
                if all_wav_chunks:
                    combine_wav_chunks(all_wav_chunks, output_file)
                    print(f"💾 Audio saved to: {output_file.name}")

                # Wait for playback to finish before prompting for next input
                playback_queue.wait_done()

            else:
                # Non-streaming single generation
                print(f"Synthesizing complete text with cached voice '{active_speaker}' ({num_step} steps)...")
                client.synthesize_to_file(user_text, str(output_file), speaker_name=active_speaker, num_step=num_step)
                total_time = time.time() - start_time
                print(f"✅ Generated in {total_time:.2f}s! Saved to: {output_file.name}")
                play_wav_bytes(output_file.read_bytes())

        except KeyboardInterrupt:
            print("\nSession interrupted.")
            break
        except Exception as e:
            print(f"\n❌ Synthesis error: {e}")


if __name__ == "__main__":
    run_interactive_studio()
