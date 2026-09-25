import sys
from pathlib import Path

# Ensure standard encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")

# Allow direct script execution
CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from Clonellm.clone_engine import PersonaCloneEngine

def run_interactive_chat():
    engine = PersonaCloneEngine()
    name = (engine.profile.preferred_name or engine.profile.first_name) if engine.profile else "Family Elder"

    print("=" * 65)
    print(f"       Kin-AI-Avatar: Memorial Presence ({name})")
    print("=" * 65)
    print(f"Model:     {engine.model} (via Groq)")
    print("Embedding: all-MiniLM-L6-v2 (Local HuggingFace - Free)")
    print("Commands:  'exit' to quit | 'clear' to reset memory | 'reload' to reload data/")
    print("=" * 65)

    print(f"\n[Chat Started] You are now speaking with {name}.")
    print("Try asking: 'Tell me about yourself', 'I miss you', or ask for life advice.\n")

    while True:
        try:
            user_input = input("You: ").strip()
            if not user_input:
                continue

            if user_input.lower() in ["exit", "quit", "q"]:
                print(f"\nGoodbye! {name} session ended.")
                break

            if user_input.lower() in ["clear", "reset"]:
                engine.reset_memory()
                print("[System] Conversation memory cleared.\n")
                continue

            if user_input.lower() in ["reload", "update"]:
                engine.reload_data()
                print("[System] Data folder reloaded successfully.\n")
                continue

            print(f"\n{name}: ", end="", flush=True)
            for chunk in engine.ask_stream(user_input):
                print(chunk, end="", flush=True)
            print("\n")

        except KeyboardInterrupt:
            print("\nExiting session...")
            break
        except Exception as e:
            print(f"\n[Error] {e}\n")

if __name__ == "__main__":
    run_interactive_chat()
