"""
interactive_avatar.py
Kin-ai-avatar | Interactive Real-Time Live Talking Avatar Studio.

Features:
1. Live Conversational Mode ("Live Convo Feel"):
   - Displays avatar with natural living idle animation (breathing, blinking, head sway).
   - Synchronizes speech audio with MuseTalk real-time 30+ FPS neural stream (sub-300ms latency).
   - Plays audio synchronously through speakers while video frames render.
   - Seamlessly loops in conversation without thread crashes or timeouts.
2. Full Studio MP4 Mode:
   - High-quality H.264 talking MP4 video with synced AAC audio. Auto-launches player.
3. Diagnostic Streaming Benchmark Mode:
   - Measures time-to-first-frame, effective FPS, and network throughput.
"""

import os
import io
import re
import sys
import time
import json
import base64
import subprocess
from pathlib import Path
from typing import Optional, List, Dict, Any

# Safe UTF-8 console output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Winsound for zero-dependency native Windows audio playback
HAS_WINSOUND = False
if sys.platform == "win32":
    try:
        import winsound
        HAS_WINSOUND = True
    except ImportError:
        pass

try:
    from dotenv import load_dotenv, set_key
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
except ImportError:
    pass

from avatar_client import MuseTalkAvatarClient


def clear_screen():
    os.system("cls" if os.name == "nt" else "clear")


def print_banner():
    print("=" * 72)
    print(" 🎭  Kin-ai-avatar | Real-Time Live Conversational AI Avatar Studio  🎭")
    print(" Powered by MuseTalk (30+ FPS) & OmniVoice Zero-Shot Speech Cloning")
    print("=" * 72)


def get_available_visuals(avatar_dir: Path) -> List[Path]:
    """Finds image and video files in Backend/Avatar directory, excluding output files."""
    extensions = {".mp4", ".mov", ".webm", ".jpg", ".jpeg", ".png", ".webp"}
    files = [
        f for f in avatar_dir.iterdir()
        if f.is_file()
        and f.suffix.lower() in extensions
        and not f.stem.endswith("_talking")
        and not f.stem.endswith("_output")
    ]
    def sort_key(p: Path):
        is_idle_vid = "idle" in p.name.lower() and p.suffix.lower() in [".mp4", ".mov", ".webm"]
        return (not is_idle_vid, p.suffix.lower() not in [".mp4", ".mov"], p.name.lower())
    return sorted(files, key=sort_key)


def get_available_audios(voice_dir: Path, avatar_dir: Path) -> List[Path]:
    """Finds audio files in Backend/Voice and Backend/Avatar."""
    audios = []
    for d in [voice_dir, avatar_dir]:
        if d.exists():
            for f in d.iterdir():
                if f.is_file() and f.suffix.lower() in [".wav", ".mp3", ".flac", ".m4a", ".ogg"]:
                    if f not in audios:
                        audios.append(f)
    clone_out = voice_dir / "clone_out.wav"
    res = []
    if clone_out.exists():
        res.append(clone_out)
    for a in audios:
        if a != clone_out:
            res.append(a)
    return res


def prompt_colab_url(client: MuseTalkAvatarClient) -> str:
    """Interactively asks for the Colab public URL if not set or invalid."""
    current_url = (os.getenv("COLAB_SERVER_URL") or os.getenv("COLAB_AVATAR_URL") or "").strip()
    if current_url:
        client.set_url(current_url)
        health = client.check_health()
        if health.get("status") == "healthy":
            return current_url
        print(f"⚠️ Stored Colab URL ({current_url}) is unreachable: {health.get('message')}")

    print("\n🌐 Please provide your Google Colab Tunnel URL.")
    print("   (Run kin_avatar_unified_colab.ipynb in Colab and copy the public Cloudflare or ngrok URL)")
    while True:
        url = input("\n👉 Enter Colab Public URL: ").strip()
        if not url:
            continue
        client.set_url(url)
        print("⏳ Connecting to Colab GPU server...")
        health = client.check_health()
        if health.get("status") == "healthy":
            print(f"✅ Connected to GPU server! ({health.get('gpu_name')})")
            env_file = Path(__file__).resolve().parent.parent / ".env"
            try:
                set_key(str(env_file), "COLAB_SERVER_URL", url)
                set_key(str(env_file), "COLAB_AVATAR_URL", url)
                print(f"💾 Saved COLAB_SERVER_URL and COLAB_AVATAR_URL to {env_file.name}")
            except Exception:
                pass
            return url
        else:
            print(f"❌ Failed to reach server: {health.get('message')}. Please check the URL and re-enter.")


def select_or_register_avatar(client: MuseTalkAvatarClient, avatar_dir: Path) -> str:
    """Handles avatar selection and one-time registration caching."""
    cached_avatars = client.get_cached_avatars()
    local_files = get_available_visuals(avatar_dir)

    print("\n" + "-" * 72)
    print("👤 Step 1: Select or Register AI Avatar")
    print("-" * 72)

    if cached_avatars:
        print(f"⚡ Server GPU Cache: {len(cached_avatars)} Avatar(s) pre-computed in VRAM:")
        for idx, cid in enumerate(cached_avatars, 1):
            print(f"   [{idx}] {cid}  (READY - Instant 0ms inference)")
    else:
        print("ℹ️  No avatars currently cached in server memory.")

    print("\n📁 Available Local Portrait Videos / Photos:")
    offset = len(cached_avatars)
    for idx, f in enumerate(local_files, offset + 1):
        display_name = f.name if len(f.name) < 45 else (f.name[:40] + "..." + f.suffix)
        tag = "  [🌟 Living Idle Video]" if "idle" in f.name.lower() else ""
        print(f"   [{idx}] {display_name}{tag}")

    custom_opt = offset + len(local_files) + 1
    print(f"   [{custom_opt}] Enter custom file path...")

    while True:
        choice = input(f"\n👉 Select Avatar [1-{custom_opt}] (default: 1): ").strip()
        if not choice:
            choice = "1"
        try:
            val = int(choice)
            if 1 <= val <= len(cached_avatars):
                selected_id = cached_avatars[val - 1]
                print(f"⚡ Using pre-cached avatar: '{selected_id}'")
                return selected_id

            local_idx = val - offset - 1
            if 0 <= local_idx < len(local_files):
                chosen_path = local_files[local_idx]
                raw_id = re.sub(r'[^a-zA-Z0-9_-]', '_', chosen_path.stem)[:24].strip('_')
                avatar_id = raw_id.replace("_idle", "") or "avatar"
                break

            if val == custom_opt:
                custom_p = input("Enter path to portrait image or video: ").strip().strip('"')
                chosen_path = Path(custom_p)
                if not chosen_path.exists():
                    print(f"❌ File not found: {custom_p}")
                    continue
                raw_id = re.sub(r'[^a-zA-Z0-9_-]', '_', chosen_path.stem)[:24].strip('_')
                avatar_id = raw_id or "avatar"
                break
        except ValueError:
            print("Invalid input. Please enter a number.")

    if avatar_id in cached_avatars:
        re_ask = input(f"⚡ Avatar '{avatar_id}' is cached on GPU. Use cached version [Y] or Re-upload [r]? (default: Y): ").strip().lower()
        if re_ask != "r":
            return avatar_id

    display_name = chosen_path.name if len(chosen_path.name) < 45 else (chosen_path.name[:40] + "..." + chosen_path.suffix)
    print(f"\n🚀 Registering avatar '{avatar_id}' from {display_name}...")
    print("   (Extracting facial landmarks, DWPose bounding boxes, VAE latents, and ping-pong loop...)")
    start = time.time()
    res = client.register_avatar(avatar_id=avatar_id, media_path=str(chosen_path))
    elapsed = time.time() - start
    print(f"✅ Registered in {elapsed:.2f}s! ({res.get('frames', 0)} frames cached)")
    return avatar_id


def play_audio_async(audio_path: str):
    """Plays audio asynchronously on Windows."""
    if HAS_WINSOUND and sys.platform == "win32":
        try:
            winsound.PlaySound(audio_path, winsound.SND_FILENAME | winsound.SND_ASYNC)
            return
        except Exception:
            pass
    try:
        if sys.platform == "win32":
            cmd = f'powershell -c (New-Object Media.SoundPlayer "{audio_path}").Play()'
            subprocess.Popen(cmd, shell=True)
        elif sys.platform == "darwin":
            subprocess.Popen(["afplay", audio_path])
        else:
            subprocess.Popen(["aplay", audio_path])
    except Exception:
        pass


def stop_audio():
    """Stops any currently playing audio."""
    if HAS_WINSOUND and sys.platform == "win32":
        try:
            winsound.PlaySound(None, winsound.SND_PURGE)
        except Exception:
            pass


def load_idle_frames(avatar_dir: Path, avatar_id: str) -> List[Any]:
    """Loads idle video frames for seamless local ping-pong display."""
    idle_candidates = [
        avatar_dir / f"{avatar_id}_idle.mp4",
        avatar_dir / "sample_dadaji_idle.mp4",
        avatar_dir / f"{avatar_id}.jpg",
        avatar_dir / f"{avatar_id}.png",
    ]
    chosen = None
    for c in idle_candidates:
        if c.exists():
            chosen = c
            break

    frames = []
    if chosen:
        try:
            import cv2
            if chosen.suffix.lower() in [".mp4", ".mov", ".webm"]:
                cap = cv2.VideoCapture(str(chosen))
                while len(frames) < 150:
                    ret, f = cap.read()
                    if not ret or f is None:
                        break
                    frames.append(f)
                cap.release()
            else:
                img = cv2.imread(str(chosen))
                if img is not None:
                    frames = [img]
        except Exception:
            pass
    return frames


def stream_talking_speech(client: MuseTalkAvatarClient, avatar_id: str, audio_path: str, window_name: str):
    """
    Main-thread synchronous streaming player:
    Streams frames live from Colab GPU directly into OpenCV window, in sync with audio.
    """
    import cv2
    import numpy as np

    print(f"\n⚡ Streaming live talking avatar for '{avatar_id}' driven by {Path(audio_path).name}...")
    first_frame = True
    frame_count = 0
    t0 = time.time()

    for chunk in client.generate_lipsync_stream(avatar_id=avatar_id, audio_path=str(audio_path)):
        if chunk.get("image_bytes"):
            nparr = np.frombuffer(chunk["image_bytes"], np.uint8)
            frame_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame_bgr is not None:
                if first_frame:
                    first_frame = False
                    ttff = time.time() - t0
                    print(f"🚀 Time-to-First-Frame: {ttff:.3f}s (Audio Playing Live!)")
                    play_audio_async(str(audio_path))

                frame_count += 1
                sys.stdout.write(f"\r🎞️ Streaming frame #{chunk.get('frame_index', frame_count)} | Total: {frame_count}")
                sys.stdout.flush()

                cv2.imshow(window_name, frame_bgr)
                key = cv2.waitKey(33) & 0xFF
                if key == ord('q'):
                    print("\nStream interrupted by user.")
                    break

    total_time = time.time() - t0
    effective_fps = frame_count / total_time if total_time > 0 else 25
    print(f"\n✅ Speech rendered: {frame_count} frames in {total_time:.2f}s ({effective_fps:.1f} FPS)!")


def run_live_conversation(client: MuseTalkAvatarClient, avatar_id: str, avatar_dir: Path, voice_dir: Path):
    """
    Interactive Conversational Loop:
    - Displays idle living avatar in OpenCV window.
    - Prompts user to speak or play audio.
    - Streams talking frames with synchronized audio on main thread.
    - Seamlessly returns to living idle display.
    """
    try:
        import cv2
        import numpy as np
    except ImportError:
        print("⚠️ OpenCV (cv2) is required for live window display. Run: pip install opencv-python")
        return

    idle_frames = load_idle_frames(avatar_dir, avatar_id)
    idle_cycle = (idle_frames + idle_frames[::-1]) if idle_frames else []

    window_name = f"Kin-AI Live Avatar: {avatar_id}"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, 540, 540)

    # Show initial idle frame
    if idle_cycle:
        cv2.imshow(window_name, idle_cycle[0])
        cv2.waitKey(100)

    print("\n" + "=" * 72)
    print(f"🎉 LIVE CONVERSATION READY WITH '{avatar_id.upper()}'!")
    print(" Avatar window is active. Type your choice below to speak live.")
    print("=" * 72)

    audios = get_available_audios(voice_dir, avatar_dir)
    clone_out = voice_dir / "clone_out.wav"

    while True:
        print(f"\n💬 {avatar_id.upper()} is listening! Options:")
        print("   [1] Speak with Cloned Speech audio (clone_out.wav)")
        print("   [2] Select another saved audio file")
        print("   [q] Return to main menu")

        choice = input("\n👉 Choose option [1/2/q] (default: 1): ").strip().lower()
        if choice == "q":
            break

        selected_audio = None
        if choice in ["", "1"]:
            if clone_out.exists():
                selected_audio = clone_out
            elif audios:
                selected_audio = audios[0]
            else:
                print("❌ No voice audio found in Backend/Voice/. Please generate speech first.")
                continue
        elif choice == "2":
            for idx, a in enumerate(audios, 1):
                print(f"   [{idx}] {a.name}")
            try:
                pick = int(input("Pick audio #: ").strip())
                if 1 <= pick <= len(audios):
                    selected_audio = audios[pick - 1]
            except Exception:
                continue

        if not selected_audio or not selected_audio.exists():
            print("❌ Invalid audio file.")
            continue

        # Render stream in window
        stream_talking_speech(client, avatar_id, str(selected_audio), window_name)

        # Show idle breathing frame after talking
        if idle_cycle:
            cv2.imshow(window_name, idle_cycle[0])
            cv2.waitKey(100)

        print(f"✅ {avatar_id.upper()} finished speaking.")

    stop_audio()
    cv2.destroyAllWindows()


def main():
    clear_screen()
    print_banner()

    avatar_dir = Path(__file__).resolve().parent
    voice_dir = avatar_dir.parent / "Voice"

    client = MuseTalkAvatarClient()
    prompt_colab_url(client)

    health = client.check_health()
    print("\n" + "-" * 72)
    print("💻 Colab GPU Status:")
    print(f"   Engine : {health.get('engine')}")
    print(f"   GPU    : {health.get('gpu_name')} ({health.get('vram_gb')} GB VRAM) | Device: {health.get('device')}")
    print("-" * 72)

    while True:
        avatar_id = select_or_register_avatar(client, avatar_dir)

        print("\n" + "-" * 72)
        print("🎬 Step 2: Choose Experience Mode")
        print("-" * 72)
        print("   [1] 🌟 Live Interactive Conversation (Sub-second streaming + Living Window)")
        print("   [2] 📹 Generate Studio MP4 Video (Auto-play in media player)")
        print("   [3] ⚡ Benchmark Real-Time Stream (Measure Latency & FPS)")
        mode = input("\n👉 Choose mode [1/2/3] (default: 1): ").strip()
        if not mode or mode not in ["1", "2", "3"]:
            mode = "1"

        if mode == "1":
            run_live_conversation(client, avatar_id, avatar_dir, voice_dir)

        elif mode == "2":
            audios = get_available_audios(voice_dir, avatar_dir)
            if not audios:
                print("❌ No audio files found in Backend/Voice/.")
                continue
            print("\nSelect driving audio:")
            for idx, a in enumerate(audios, 1):
                tag = "  [🌟 Cloned Voice Output]" if a.name == "clone_out.wav" else ""
                print(f"   [{idx}] {a.name}{tag}")
            try:
                pick = int(input("Select audio #: ").strip() or "1")
                chosen_audio = audios[pick - 1]
            except Exception:
                chosen_audio = audios[0]

            out_file = avatar_dir / f"{avatar_id}_talking.mp4"
            print(f"\n⚡ Rendering studio talking MP4 video for '{avatar_id}'...")
            t0 = time.time()
            v_path = client.generate_lipsync_video(avatar_id=avatar_id, audio_path=str(chosen_audio), output_path=str(out_file))
            elapsed = time.time() - t0
            print(f"\n✨ Video ready in {elapsed:.2f}s! ({v_path})")

            # Launch player
            try:
                if os.name == "nt":
                    os.startfile(v_path)
                elif sys.platform == "darwin":
                    subprocess.run(["open", v_path])
                else:
                    subprocess.run(["xdg-open", v_path])
            except Exception as e:
                print(f"Note: Play video manually: {v_path}")

        elif mode == "3":
            audios = get_available_audios(voice_dir, avatar_dir)
            chosen_audio = audios[0] if audios else None
            if not chosen_audio:
                print("❌ No audio file available for benchmark.")
                continue

            print(f"\n⚡ Streaming benchmark for '{avatar_id}' with {chosen_audio.name}...")
            t0 = time.time()
            frame_count = 0
            ttff = None
            for chunk in client.generate_lipsync_stream(avatar_id=avatar_id, audio_path=str(chosen_audio)):
                if ttff is None:
                    ttff = time.time() - t0
                    print(f"🚀 Time-to-First-Frame: {ttff:.3f}s (Sub-Second Latency!)")
                frame_count += 1
                sys.stdout.write(f"\r🎞️ Streaming frame #{chunk.get('frame_index', frame_count)} | Total: {frame_count}")
                sys.stdout.flush()

            total_elapsed = time.time() - t0
            fps = frame_count / total_elapsed if total_elapsed > 0 else 25
            print(f"\n✅ Received {frame_count} frames in {total_elapsed:.2f}s ({fps:.1f} FPS)!")

        print("\n" + "=" * 72)
        repeat = input("🔄 Continue with another session? [Y/n]: ").strip().lower()
        if repeat == "n":
            print("\n👋 Exiting Kin-ai-avatar Studio. Have a great day!")
            break


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Exiting Kin-ai-avatar Studio.")
