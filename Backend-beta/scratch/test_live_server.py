import requests
import time
import json
import os

URL = "https://muscle-appearance-advice-congress.trycloudflare.com"

print(f"Testing server: {URL}")

# Health
print("\n--- HEALTH CHECK ---")
r = requests.get(f"{URL}/health", timeout=15)
print("Status:", r.status_code)
print(json.dumps(r.json(), indent=2))

# 1. Voice Register
print("\n--- 1. REGISTER VOICE (OmniVoice) ---")
voice_path = "data/personas/maya_6980/voice_sample.wav"
t0 = time.time()
with open(voice_path, "rb") as f:
    files = {"file": ("voice_sample.wav", f, "audio/wav")}
    data = {"name": "test_maya", "ref_text": ""}
    r_reg = requests.post(f"{URL}/register_voice", data=data, files=files, timeout=60)
print(f"Status: {r_reg.status_code}, Elapsed: {time.time()-t0:.2f}s")
print("Response:", r_reg.text)

# 2. Voice Synthesize
print("\n--- 2. SYNTHESIZE AUDIO (OmniVoice) ---")
t0 = time.time()
r_syn = requests.post(
    f"{URL}/synthesize",
    json={"text": "Hello! OmniVoice is working smoothly on our unified server.", "speaker_name": "test_maya", "num_step": 16},
    timeout=60
)
ct = r_syn.headers.get("content-type")
print(f"Status: {r_syn.status_code}, Elapsed: {time.time()-t0:.2f}s, Content-Type: {ct}, Size: {len(r_syn.content)} bytes")
if r_syn.status_code == 200:
    os.makedirs("scratch", exist_ok=True)
    with open("scratch/test_synth_live.wav", "wb") as f:
        f.write(r_syn.content)
    print("SUCCESS: Synthesized audio saved to scratch/test_synth_live.wav")
else:
    print("Error:", r_syn.text)

# 3. Avatar Register (MuseTalk)
print("\n--- 3. REGISTER AVATAR (MuseTalk) ---")
avatar_path = "Avatar/dadaji_idle.mp4"
t0 = time.time()
with open(avatar_path, "rb") as f:
    files = {"file": ("dadaji_idle.mp4", f, "video/mp4")}
    data = {"avatar_id": "test_dadaji", "bbox_shift": 0}
    r_av = requests.post(f"{URL}/register_avatar", data=data, files=files, timeout=120)
print(f"Status: {r_av.status_code}, Elapsed: {time.time()-t0:.2f}s")
print("Response:", r_av.text)

# 4. MuseTalk Idle Frame
print("\n--- 4. GET IDLE FRAME (MuseTalk) ---")
r_frame = requests.get(f"{URL}/idle_frame?avatar_id=test_dadaji&frame_index=0", timeout=15)
print(f"Status: {r_frame.status_code}, Content-Type: {r_frame.headers.get('content-type')}, Size: {len(r_frame.content)} bytes")
if r_frame.status_code == 200:
    with open("scratch/test_idle_live.jpg", "wb") as f:
        f.write(r_frame.content)
    print("SUCCESS: Idle frame saved to scratch/test_idle_live.jpg")

# 5. Check Health again to see cached items
print("\n--- HEALTH CHECK AFTER REGISTRATION ---")
r_h2 = requests.get(f"{URL}/health", timeout=15)
print(json.dumps(r_h2.json(), indent=2))
