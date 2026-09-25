import sys
import time
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path(r"c:\Users\vishal\Desktop\Kin-ai-avatar\Backend")
load_dotenv(backend_dir / ".env")

sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "Avatar"))

from avatar_client import MuseTalkAvatarClient

client = MuseTalkAvatarClient()
test_wav = backend_dir / "Voice" / "clone_out.wav"
out_mp4 = backend_dir / "Avatar" / "test_dadaji_speaking.mp4"

print("Starting MuseTalk video generation for avatar 'dadaji'...")
t0 = time.time()
try:
    res_path = client.generate_lipsync_video(
        avatar_id="dadaji",
        audio_path=str(test_wav),
        output_path=str(out_mp4)
    )
    dt = time.time() - t0
    print(f"DONE in {dt:.2f}s! Output saved to: {res_path} ({Path(res_path).stat().st_size} bytes)")
except Exception as e:
    print("FAILED:", e)
