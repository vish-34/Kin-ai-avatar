"""
chat_cli.py - Interactive Terminal Chat with KIN CloneLLM
Allows you to directly chat with Dadaji in your terminal with real-time streaming tokens.

Usage:
  python chat_cli.py
"""

import os
import sys
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

from clone_service.clone_engine import get_clone_engine

def start_terminal_chat():
    print("=" * 68)
    print("          KIN AI — Terminal Dialogue Interface")
    print("=" * 68)
    print("Initializing Persona Clone Engine...")

    engine = get_clone_engine("dadaji")
    name = (engine.profile.preferred_name or engine.profile.first_name) if engine.profile else "Dadaji"

    print(f"\n✅ Ready! Connected as: {name} (Ramesh Vance Sharma)")
    print(f"🧠 Primary LLM: {engine.model} (via Groq Cloud)")
    print("🔍 Local RAG: all-MiniLM-L6-v2 Embeddings")
    print("-" * 68)
    print("Commands:")
    print("  'clear' -> Reset session conversational memory")
    print("  'exit'  -> Quit dialogue")
    print("-" * 68 + "\n")

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
                print(f"\n[System] Conversation history reset. Starting fresh session.\n")
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

if __name__ == "__main__":
    start_terminal_chat()
