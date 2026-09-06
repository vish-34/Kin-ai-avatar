"""
test_server_flow.py - Verification for Backend/server.py
Tests endpoints using Starlette/FastAPI TestClient.
"""

import sys
from pathlib import Path
from starlette.testclient import TestClient

# Ensure safe UTF-8
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from server import app

def test_status():
    print("\n--- Testing GET /api/status ---")
    client = TestClient(app)
    r = client.get("/api/status")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    print("Status response:", data)
    assert data.get("status") == "online"
    assert "persona" in data
    assert "colab" in data
    print("✅ /api/status PASSED!")

def test_config_colab():
    print("\n--- Testing POST /api/config/colab ---")
    client = TestClient(app)
    test_url = "https://kin-ai-test-flow.trycloudflare.com"
    r = client.post("/api/config/colab", json={"url": test_url})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert data.get("url") == test_url
    print("✅ POST /api/config/colab PASSED!")

def test_idle_media():
    print("\n--- Testing GET /api/avatar/idle ---")
    client = TestClient(app)
    r = client.get("/api/avatar/idle")
    assert r.status_code in [200, 404], f"Status: {r.status_code}"
    print(f"✅ /api/avatar/idle returned status {r.status_code} ({r.headers.get('content-type')})")

def test_memory_reset():
    print("\n--- Testing POST /api/memory/reset ---")
    client = TestClient(app)
    r = client.post("/api/memory/reset")
    assert r.status_code == 200
    print("✅ POST /api/memory/reset PASSED!")

def test_chat_stream_validation():
    print("\n--- Testing POST /api/chat/stream Validation ---")
    client = TestClient(app)
    # Empty message should fail with 400
    r = client.post("/api/chat/stream", json={"message": "   "})
    assert r.status_code == 400
    print("✅ Empty message correctly rejected with 400!")

if __name__ == "__main__":
    test_status()
    test_config_colab()
    test_idle_media()
    test_memory_reset()
    test_chat_stream_validation()
    print("\n🎉 ALL SERVER FLOW TESTS PASSED!")
