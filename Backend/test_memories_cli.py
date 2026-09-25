"""
test_memories_cli.py - Interactive Custom Memory Ingestion & Evaluation CLI
Allows you to provide your own custom memories, stories, or life events,
ingests them into CloneLLM's local RAG system, and lets you chat to verify responses.

Usage:
  python test_memories_cli.py
"""

import os
import sys
import tempfile
import json
from pathlib import Path

# Ensure UTF-8 in Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")

CURRENT_DIR = Path(__file__).resolve().parent
PYTHON_DIR = CURRENT_DIR / "python"
CLONE_SERVICE_DIR = PYTHON_DIR / "clone_service"

if str(PYTHON_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_DIR))
if str(CLONE_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(CLONE_SERVICE_DIR))

# Load .env
from dotenv import dotenv_values
ENV_PATH = CURRENT_DIR / ".env"
if ENV_PATH.exists():
    env_vars = dotenv_values(ENV_PATH)
    groq_key = env_vars.get("GroqAPIKey") or env_vars.get("GROQ_API_KEY")
    if groq_key:
        os.environ["GROQ_API_KEY"] = groq_key

from clone_service.clone_engine import PersonaCloneEngine


def main():
    print("=" * 70)
    print("   🧠 KIN AI — Custom Memory Ingestion & Evaluation Studio")
    print("=" * 70)
    print("This tool lets you feed custom memories to CloneLLM and chat with it")
    print("to test RAG memory retrieval, emotional pacing, and epistemic accuracy.")
    print("-" * 70)

    # 1. Ask for Persona Info
    name_input = input("\n1. Enter Persona Name [Press Enter for 'Dadaji']: ").strip()
    name = name_input if name_input else "Dadaji"

    relation_input = input(f"2. Enter Relation to User [Press Enter for 'Grandfather']: ").strip()
    relation = relation_input if relation_input else "Grandfather"

    calling_input = input(f"3. What does {name} call you? (e.g. 'Bhaiya', 'Beta', or leave blank if none): ").strip()
    calling_name = calling_input if calling_input else None

    hometown_input = input(f"4. Enter Hometown / City [Press Enter for 'Pune']: ").strip()
    hometown = hometown_input if hometown_input else "Pune"

    print("\n" + "-" * 70)
    print(f"5. Provide Memories for {name} ({relation})")
    print("   Type or paste stories, lived events, favorite things, or life secrets.")
    print("   (When done, type 'DONE' on a new line and press Enter)")
    print("-" * 70)

    # Pre-filled sample memories suggestion
    print("\nExample memories you can test:")
    print("  • In 1982, I built a wooden grandfather clock by hand in our Pune workshop.")
    print("  • I had a mischievous green parrot named Mithu who loved stealing green chillies.")
    print("  • Every Diwali, my favorite sweet was hot homemade puran poli with extra ghee.")
    print("  • I always told my grandchildren: 'Patience solves what anger destroys.'\n")

    lines = []
    while True:
        try:
            line = input()
            if line.strip().upper() == "DONE":
                break
            lines.append(line)
        except EOFError:
            break

    user_memories = "\n".join(lines).strip()
    if not user_memories:
        print("\n[Notice] No memories provided. Using default sample memories about Pune workshop & Mithu the parrot.")
        user_memories = (
            f"NAME: {name}\n"
            f"RELATION: {relation}\n"
            f"HOMETOWN: {hometown}\n"
            "AUTHENTIC MEMORIES:\n"
            "- In 1982, I built a wooden grandfather clock by hand in our Pune workshop using teak wood.\n"
            "- I had a mischievous green parrot named Mithu who loved stealing green chillies from the kitchen.\n"
            "- Every Diwali, my favorite sweet was hot homemade puran poli with extra ghee made by my mother.\n"
            "- I always told my grandchildren: 'Patience solves what anger destroys.'"
        )

    # 2. Stage memories into an isolated temporary directory for PersonaCloneEngine
    temp_dir = Path(tempfile.mkdtemp(prefix="kin_test_persona_"))
    
    # Write profile.json
    profile_data = {
        "first_name": name,
        "last_name": "",
        "calling_name": calling_name,
        "preferred_name": name,
        "relation": relation,
        "city": hometown,
        "hometown": hometown,
        "personality_summary": f"A warm and grounded {relation.lower()} from {hometown}.",
    }
    with open(temp_dir / "profile.json", "w", encoding="utf-8") as pf:
        json.dump(profile_data, pf, indent=2, ensure_ascii=False)

    # Write memories.txt
    with open(temp_dir / "memories.txt", "w", encoding="utf-8") as mf:
        mf.write(user_memories)

    print("\n⏳ Ingesting documents & building local vector embeddings with all-MiniLM-L6-v2...")
    engine = PersonaCloneEngine(persona_id="custom_test", persona_dir=temp_dir)

    print("\n" + "=" * 70)
    print(f"🎉 Persona '{name}' initialized with your custom memories!")
    print(f"LLM:       {engine.model} (via Groq Cloud)")
    print(f"Memories:  {len(user_memories.splitlines())} lines ingested into local RAG vector store")
    print("=" * 70)
    print("Try asking:")
    print("  • 'Tell me about the wooden clock you made'")
    print("  • 'Did you ever have any pets?'")
    print("  • 'What was your favorite sweet during Diwali?'")
    print("  • 'Remember when you were a pilot in New York?' (Test false memory refutation!)")
    print("-" * 70)
    print("Commands: 'clear' to reset memory buffer | 'exit' to quit\n")

    while True:
        try:
            prompt = input("You: ").strip()
            if not prompt:
                continue

            if prompt.lower() in ["exit", "quit", "q"]:
                print(f"\n{name}: Take care! Phir milte hain.\n")
                break

            if prompt.lower() in ["clear", "reset"]:
                engine.reset_memory()
                print("\n[System] Conversation history cleared. Persona memories remain preserved.\n")
                continue

            print(f"\n{name}: ", end="", flush=True)
            for token in engine.ask_stream(prompt):
                print(token, end="", flush=True)
            print("\n")

        except KeyboardInterrupt:
            print(f"\n\n{name}: Goodbye!\n")
            break
        except Exception as err:
            print(f"\n[Error] {err}\n")

    # Cleanup temp dir on exit
    try:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
    except Exception:
        pass


if __name__ == "__main__":
    main()
