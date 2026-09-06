import sys
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path(r"c:\Users\vishal\Desktop\Kin-ai-avatar\Backend")
load_dotenv(backend_dir / ".env")

sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "Avatar"))

from avatar_client import MuseTalkAvatarClient

client = MuseTalkAvatarClient()
print("Checking Colab health...")
health = client.check_health()
print("Health:", health)

dadaji_img = backend_dir / "Avatar" / "dadaji.jpg"
print(f"Registering dadaji portrait: {dadaji_img} (size: {dadaji_img.stat().st_size} bytes)")
res = client.register_avatar(avatar_id="dadaji", media_path=str(dadaji_img))
print("Registration result:", res)
