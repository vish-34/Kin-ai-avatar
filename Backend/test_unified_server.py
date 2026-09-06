"""
test_unified_server.py
Automated verification tests for:
1. Unified Colab Server endpoints (/health, /register_voice, /synthesize, /synthesize_stream, etc.)
2. OmniVoiceColabClient URL resolution with COLAB_SERVER_URL
3. MuseTalkAvatarClient URL resolution with COLAB_SERVER_URL
"""

import os
import sys
from pathlib import Path
from starlette.testclient import TestClient

# Ensure safe UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Add Backend to path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(backend_dir / "Voice") not in sys.path:
    sys.path.insert(0, str(backend_dir / "Voice"))
if str(backend_dir / "Avatar") not in sys.path:
    sys.path.insert(0, str(backend_dir / "Avatar"))

from unified_colab_server import app
from voice_client import OmniVoiceColabClient
from avatar_client import MuseTalkAvatarClient


def test_unified_health_endpoint():
    print("\n--- Test 1: Testing Unified /health Endpoint ---")
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    print("Health response:", data)

    # Validate keys expected by Voice Client
    assert "status" in data
    assert "engine" in data
    assert "cached_prompts" in data
    assert isinstance(data["cached_prompts"], list)

    # Validate keys expected by Avatar Client
    assert "cached_avatars" in data
    assert isinstance(data["cached_avatars"], list)
    print("✅ Test 1 PASSED: /health satisfies both Voice and Avatar client contracts!")


def test_voice_client_env_resolution():
    print("\n--- Test 2: Testing Voice Client URL Resolution ---")
    test_url = "https://kin-ai-unified-test.trycloudflare.com"
    old_server_url = os.environ.get("COLAB_SERVER_URL")
    old_voice_url = os.environ.get("COLAB_VOICE_URL")

    try:
        # Case A: COLAB_SERVER_URL is set
        os.environ["COLAB_SERVER_URL"] = test_url
        os.environ["COLAB_VOICE_URL"] = ""
        v_client = OmniVoiceColabClient()
        assert v_client.colab_url == test_url, f"Expected {test_url}, got {v_client.colab_url}"
        print(f"✅ Voice client resolves COLAB_SERVER_URL correctly: {v_client.colab_url}")

        # Case B: Direct parameter overrides env
        override_url = "https://override.trycloudflare.com"
        v_client_override = OmniVoiceColabClient(colab_url=override_url)
        assert v_client_override.colab_url == override_url
        print(f"✅ Voice client constructor override works correctly: {v_client_override.colab_url}")
    finally:
        if old_server_url:
            os.environ["COLAB_SERVER_URL"] = old_server_url
        if old_voice_url:
            os.environ["COLAB_VOICE_URL"] = old_voice_url
    print("✅ Test 2 PASSED!")


def test_avatar_client_env_resolution():
    print("\n--- Test 3: Testing Avatar Client URL Resolution ---")
    test_url = "https://kin-ai-unified-test.trycloudflare.com"
    old_server_url = os.environ.get("COLAB_SERVER_URL")
    old_avatar_url = os.environ.get("COLAB_AVATAR_URL")

    try:
        # Case A: COLAB_SERVER_URL is set
        os.environ["COLAB_SERVER_URL"] = test_url
        os.environ["COLAB_AVATAR_URL"] = ""
        a_client = MuseTalkAvatarClient()
        assert a_client.colab_url == test_url, f"Expected {test_url}, got {a_client.colab_url}"
        print(f"✅ Avatar client resolves COLAB_SERVER_URL correctly: {a_client.colab_url}")

        # Case B: Direct parameter overrides env
        override_url = "https://override-avatar.trycloudflare.com"
        a_client_override = MuseTalkAvatarClient(colab_url=override_url)
        assert a_client_override.colab_url == override_url
        print(f"✅ Avatar client constructor override works correctly: {a_client_override.colab_url}")
    finally:
        if old_server_url:
            os.environ["COLAB_SERVER_URL"] = old_server_url
        if old_avatar_url:
            os.environ["COLAB_AVATAR_URL"] = old_avatar_url
    print("✅ Test 3 PASSED!")


def test_validation_endpoints():
    print("\n--- Test 4: Testing Request Validation on Unified Server ---")
    client = TestClient(app)

    # Empty text synthesis should return 400
    r1 = client.post("/synthesize", json={"text": "", "speaker_name": "default"})
    assert r1.status_code == 400
    print("✅ Empty text /synthesize correctly rejected with 400")

    # Empty text synthesize_stream should return 400
    r2 = client.post("/synthesize_stream", json={"text": "   ", "speaker_name": "default"})
    assert r2.status_code == 400
    print("✅ Empty text /synthesize_stream correctly rejected with 400")

    # Empty text synthesize_and_lipsync should return 400
    r3 = client.post("/synthesize_and_lipsync", json={"text": "", "avatar_id": "dadaji"})
    assert r3.status_code == 400
    print("✅ Empty text /synthesize_and_lipsync correctly rejected with 400")
    print("✅ Test 4 PASSED!")


if __name__ == "__main__":
    test_unified_health_endpoint()
    test_voice_client_env_resolution()
    test_avatar_client_env_resolution()
    test_validation_endpoints()
    print("\n🎉 ALL TESTS PASSED SUCCESSFULLY!")
