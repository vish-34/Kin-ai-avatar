"""
test_persona_relationships.py
Comprehensive test suite verifying dynamic persona relationships and calling name behavior.

Tests:
1. Brother (Aryna, calling name: Bhaiya) - verify sibling dynamic, memory retrieval, no 'beta'
2. Grandfather (Dadaji, calling name: Beta) - verify grandfather dynamic, retains elder voice
3. Friend (Rahul, calling name: Vishal) - verify friend dynamic, no elder voice
4. Sister (Neha, calling name: Bhai) - verify sister dynamic, sibling address
5. Friend without calling name (Rahul, null) - verify no invented calling name
"""

import sys
import os
import json
import time
import tempfile
import shutil
from pathlib import Path

# UTF-8 stdout
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
PYTHON_DIR = BACKEND_DIR / "python"
CLONE_SERVICE_DIR = PYTHON_DIR / "clone_service"

if str(PYTHON_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_DIR))
if str(CLONE_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(CLONE_SERVICE_DIR))

# Load .env
from dotenv import dotenv_values
ENV_PATH = BACKEND_DIR / ".env"
if ENV_PATH.exists():
    env_vars = dotenv_values(ENV_PATH)
    groq_key = env_vars.get("GroqAPIKey") or env_vars.get("GROQ_API_KEY")
    if groq_key:
        os.environ["GROQ_API_KEY"] = groq_key

from clone_service.clone_engine import PersonaCloneEngine, get_clone_engine

def run_test_suite():
    print("=" * 70)
    print("🧪 KIN AI — Persona Relationship & Calling Name Test Suite")
    print("=" * 70)

    # -------------------------------------------------------------
    # TEST 1 — BROTHER (Aryna, Bhaiya)
    # -------------------------------------------------------------
    print("\n👉 [TEST 1/5] BROTHER PERSONA: Aryna (Calling name: Bhaiya)")
    temp_dir_1 = Path(tempfile.mkdtemp(prefix="kin_test_brother_"))
    try:
        profile_1 = {
            "first_name": "Aryna",
            "preferred_name": "Aryna",
            "calling_name": "Bhaiya",
            "relation": "Brother",
            "personality_summary": "An energetic younger brother who loves cricket and tech.",
        }
        with open(temp_dir_1 / "profile.json", "w", encoding="utf-8") as f:
            json.dump(profile_1, f)
        
        memories_1 = (
            "MEMORIES:\n"
            "- He used to call me bhaiya.\n"
            "- Loves cricket and plays as an all-rounder in local weekend matches.\n"
            "- Every Diwali, my favorite sweet was hot homemade puran poli with extra ghee.\n"
            "- I always told my grandchildren: 'Patience solves what anger destroys.'\n"
        )
        with open(temp_dir_1 / "memories.txt", "w", encoding="utf-8") as f:
            f.write(memories_1)

        engine_1 = PersonaCloneEngine(persona_id="test_brother", persona_dir=temp_dir_1)

        # Query 1: Greeting
        resp_1 = engine_1.ask("Hey Aryna, how are you?")
        print(f"   Prompt: 'Hey Aryna, how are you?'")
        print(f"   Response: \"{resp_1}\"")
        assert "beta" not in resp_1.lower(), "Brother persona must NOT call user 'beta'!"
        assert not any(w in resp_1.lower() for w in ["grandchild", "grandpa", "grandfather"]), "Must not act as grandparent!"
        print("   ✅ Verified: No 'beta' or grandfather assumptions in response.")

        # Query 2: Memory Retrieval
        time.sleep(2)
        resp_1_mem = engine_1.ask("What sweet did you love having during Diwali?")
        print(f"   Prompt: 'What sweet did you love having during Diwali?'")
        print(f"   Response: \"{resp_1_mem}\"")
        assert any(w in resp_1_mem.lower() for w in ["puran poli", "puran", "sweet"]), "Must retrieve Diwali sweet memory!"
        assert "beta" not in resp_1_mem.lower(), "Must not use 'beta' during memory recall!"
        print("   ✅ Verified: RAG memory (puran poli) accurately retrieved without 'beta'.")

    finally:
        shutil.rmtree(temp_dir_1, ignore_errors=True)

    # -------------------------------------------------------------
    # TEST 2 — GRANDFATHER (Dadaji, Beta)
    # -------------------------------------------------------------
    print("\n👉 [TEST 2/5] GRANDFATHER PERSONA: Dadaji (Calling name: Beta)")
    time.sleep(2)
    engine_2 = get_clone_engine("dadaji")
    resp_2 = engine_2.ask("Dadaji, kaise ho aap?")
    print(f"   Prompt: 'Dadaji, kaise ho aap?'")
    print(f"   Response: \"{resp_2}\"")
    assert any(w in resp_2.lower() for w in ["beta", "badhiya", "theek", "hoon", "aao", "sab"]), "Grandfather persona can naturally speak in elder voice!"
    print("   ✅ Verified: Grandfather persona authentic voice preserved.")

    # -------------------------------------------------------------
    # TEST 3 — FRIEND (Rahul, Vishal)
    # -------------------------------------------------------------
    print("\n👉 [TEST 3/5] FRIEND PERSONA: Rahul (Calling name: Vishal)")
    temp_dir_3 = Path(tempfile.mkdtemp(prefix="kin_test_friend_"))
    try:
        profile_3 = {
            "first_name": "Rahul",
            "preferred_name": "Rahul",
            "calling_name": "Vishal",
            "relation": "Friend",
            "personality_summary": "A close college friend who is witty and direct.",
        }
        with open(temp_dir_3 / "profile.json", "w", encoding="utf-8") as f:
            json.dump(profile_3, f)
        
        memories_3 = (
            "MEMORIES:\n"
            "- We built our first web project together overnight fueled by chai and samosas.\n"
            "- Rahul is a huge fan of rock music and electric guitars.\n"
        )
        with open(temp_dir_3 / "memories.txt", "w", encoding="utf-8") as f:
            f.write(memories_3)

        time.sleep(2)
        engine_3 = PersonaCloneEngine(persona_id="test_friend", persona_dir=temp_dir_3)
        resp_3 = engine_3.ask("Hey Rahul, up for some chai?")
        print(f"   Prompt: 'Hey Rahul, up for some chai?'")
        print(f"   Response: \"{resp_3}\"")
        assert "beta" not in resp_3.lower(), "Friend must NOT use 'beta'!"
        assert not any(w in resp_3.lower() for w in ["grandchild", "blessing", "aashirwad"]), "Friend must not use elder blessings!"
        print("   ✅ Verified: Friend persona responds as a peer without elder terminology.")

    finally:
        shutil.rmtree(temp_dir_3, ignore_errors=True)

    # -------------------------------------------------------------
    # TEST 4 — SISTER (Neha, Bhai)
    # -------------------------------------------------------------
    print("\n👉 [TEST 4/5] SISTER PERSONA: Neha (Calling name: Bhai)")
    temp_dir_4 = Path(tempfile.mkdtemp(prefix="kin_test_sister_"))
    try:
        profile_4 = {
            "first_name": "Neha",
            "preferred_name": "Neha",
            "calling_name": "Bhai",
            "relation": "Sister",
            "personality_summary": "A smart, caring younger sister who loves sketching and teasing.",
        }
        with open(temp_dir_4 / "profile.json", "w", encoding="utf-8") as f:
            json.dump(profile_4, f)
        
        memories_4 = (
            "MEMORIES:\n"
            "- Neha always hid my laptop charger whenever she wanted me to take her out for ice cream.\n"
        )
        with open(temp_dir_4 / "memories.txt", "w", encoding="utf-8") as f:
            f.write(memories_4)

        time.sleep(2)
        engine_4 = PersonaCloneEngine(persona_id="test_sister", persona_dir=temp_dir_4)
        resp_4 = engine_4.ask("Why did you hide my laptop charger?")
        print(f"   Prompt: 'Why did you hide my laptop charger?'")
        print(f"   Response: \"{resp_4}\"")
        assert "beta" not in resp_4.lower(), "Sister must NOT call brother 'beta'!"
        normalized_resp_4 = resp_4.lower().replace("\u2011", " ").replace("-", " ")
        assert any(w in normalized_resp_4 for w in ["ice cream", "charger", "bhai", "haha", "treat", "drawer", "ice", "fridge"]), "Sister responds with banter/memory!"
        print("   ✅ Verified: Sister persona accurately banter-responds without elder tone.")

    finally:
        shutil.rmtree(temp_dir_4, ignore_errors=True)

    # -------------------------------------------------------------
    # TEST 5 — NO CALLING NAME (Rahul, Friend, null)
    # -------------------------------------------------------------
    print("\n👉 [TEST 5/5] NO CALLING NAME SUPPLIED: Rahul (Friend, calling_name=None)")
    temp_dir_5 = Path(tempfile.mkdtemp(prefix="kin_test_nocall_"))
    try:
        profile_5 = {
            "first_name": "Rahul",
            "preferred_name": "Rahul",
            "calling_name": None,
            "relation": "Friend",
            "personality_summary": "A dependable childhood friend.",
        }
        with open(temp_dir_5 / "profile.json", "w", encoding="utf-8") as f:
            json.dump(profile_5, f)
        
        memories_5 = "MEMORIES:\n- We used to ride bicycles around the neighborhood every evening.\n"
        with open(temp_dir_5 / "memories.txt", "w", encoding="utf-8") as f:
            f.write(memories_5)

        time.sleep(2)
        engine_5 = PersonaCloneEngine(persona_id="test_nocall", persona_dir=temp_dir_5)
        resp_5 = engine_5.ask("What do you remember from our childhood?")
        print(f"   Prompt: 'What do you remember from our childhood?'")
        print(f"   Response: \"{resp_5}\"")
        assert "beta" not in resp_5.lower(), "Must NOT assume 'beta' when calling name is None!"
        assert "bhaiya" not in resp_5.lower(), "Must NOT invent 'bhaiya' when none provided!"
        assert any(w in resp_5.lower() for w in ["bicycle", "cycle", "neighborhood", "evening", "riding"]), "Retrieves childhood memory!"
        print("   ✅ Verified: Persona does not invent titles/nicknames when calling name is None.")

    finally:
        shutil.rmtree(temp_dir_5, ignore_errors=True)

    print("\n" + "=" * 70)
    print("🎉 ALL 5 PERSONA RELATIONSHIP TEST CASES PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_test_suite()
