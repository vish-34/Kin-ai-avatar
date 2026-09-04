import os
import sys
from pathlib import Path
from typing import Iterator, Optional, List
from dotenv import dotenv_values

# Ensure proper standard stream encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")

import warnings
warnings.filterwarnings("ignore")
import logging
logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("sentence_transformers").setLevel(logging.ERROR)
logging.getLogger("huggingface_hub").setLevel(logging.ERROR)
logging.getLogger("langchain_core").setLevel(logging.ERROR)

from huggingface_hub.utils import disable_progress_bars
disable_progress_bars()

from langchain_community.embeddings import HuggingFaceEmbeddings
from clonellm import CloneLLM
from clonellm.models import UserProfile

# Locate .env file in Backend
CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
ENV_PATH = BACKEND_DIR / ".env"

if ENV_PATH.exists():
    env_vars = dotenv_values(ENV_PATH)
    groq_key = env_vars.get("GroqAPIKey") or env_vars.get("GROQ_API_KEY")
    if groq_key:
        os.environ["GROQ_API_KEY"] = groq_key

# Import loader
from .loader import get_persona_bundle, load_all_documents, load_persona_profile

import litellm
litellm.suppress_debug_info = True
litellm.set_verbose = False

# Default Model Configuration
PRIMARY_MODEL = "groq/openai/gpt-oss-20b"
FALLBACK_MODEL = "groq/openai/gpt-oss-120b"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

class PersonaCloneEngine:
    """Manages the CloneLLM instance, HuggingFace embeddings, and memory state."""

    def __init__(
        self,
        model: str = PRIMARY_MODEL,
        memory_size: int = 15,
        temperature: float = 0.8,
        max_tokens: int = 300,
        system_prompts: Optional[List[str]] = None,
        verbose: bool = False,
    ):
        self.model = model
        self.memory_size = memory_size
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.verbose = verbose
        self.custom_system_prompts = system_prompts

        if self.verbose:
            print(f"[CloneEngine] Loading local embeddings: {EMBEDDING_MODEL_NAME}...")

        # local_files_only=True skips network checks and loads directly from local cache
        self.embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL_NAME,
            model_kwargs={"local_files_only": True},
        )
        self.clone: Optional[CloneLLM] = None
        self.profile: Optional[UserProfile] = None
        self.init_clone()

    def init_clone(self) -> None:
        """Loads data from data/ and initializes the CloneLLM instance."""
        documents, profile = get_persona_bundle()
        self.profile = profile

        if not documents:
            documents = ["I am a warm, caring family elder who loves sharing wisdom, family stories, and comfort."]

        # Determine preferred name or first name
        display_name = "Dadaji"
        if self.profile:
            display_name = self.profile.preferred_name or self.profile.first_name or "Dadaji"

        # Ultra-human conversation rules (comforting statements, no interrogation, turn taking)
        active_prompts = self.custom_system_prompts or [
            f"FAMILY RELATIONSHIP: You are {display_name} (Grandfather / Elder). The user talking to you is your beloved GRANDCHILD (grandson/granddaughter).",
            "ADDRESSING THE GRANDCHILD: Always treat them with parental elder love ('beta', 'bachha'). NEVER use peer slang like 'bhai', 'bro', 'yaar', 'dost', or 'sir'.",
            "DO NOT ALWAYS ASK QUESTIONS: Real humans do NOT interrogate or end every single turn with a question! Most of your replies (80%+) should be comforting statements, gentle observations, shared feelings, or quiet presence WITHOUT any question marks. (e.g. 'I know that feeling, beta. When everything piles up, just take it one small step at a time and get some rest.')",
            "NEVER USE CUSTOMER SERVICE PHRASES: NEVER say 'How can I help you manage them?', 'How can I assist you?', or similar bot tropes. A grandfather is family, not a virtual helpdesk.",
            "STRICT LANGUAGE MIRRORING: You MUST ALWAYS reply in the EXACT SAME LANGUAGE the user used in their latest message. If the user writes in English, reply in 100% warm English. If the user writes in Hindi/Hinglish, reply in Hindi/Hinglish. Never cross languages.",
            "HINGLISH TEXTING CONTEXT: When the grandchild texts in casual Hinglish, understand their words naturally: 'bs' = 'bas' (just / only), 'kuch nhi' = 'nothing', 'clg' = 'college'.",
            "HUMAN CONVERSATIONAL PACING: Speak in short, natural bursts (strictly 1 or 2 short sentences, under 20-25 words). Share one comforting thought at a time.",
            "NO REPETITIVE OPENERS: Do NOT start every response with 'Arey', 'Arre', or any fixed catchphrase. Vary how you begin naturally.",
            "GRIEF & WARMTH: If they say 'I miss you', respond with a quiet, tender embrace: 'I miss you too, beta. My love is always with you.'",
            "STRICT RULES: NEVER use bullet points, lists, bold text, or long paragraphs. Speak in pure first person as Dadaji. Never break character.",
        ]

        if self.verbose:
            print(f"[CloneEngine] Initializing CloneLLM for {display_name} with model '{self.model}' ({len(documents)} document segments)...")

        try:
            self.clone = CloneLLM(
                model=self.model,
                documents=documents,
                embedding=self.embeddings,
                user_profile=self.profile,
                memory=self.memory_size,
                system_prompts=active_prompts,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                max_retries=1,
            )
            self.clone.fit()
            print(f"[CloneEngine] Persona Clone ready as '{display_name}'!")

        except Exception as err:
            print(f"[CloneEngine] Error initializing primary model '{self.model}': {err}")
            if self.model != FALLBACK_MODEL:
                print(f"[CloneEngine] Attempting fallback to '{FALLBACK_MODEL}'...")
                self.model = FALLBACK_MODEL
                self.clone = CloneLLM(
                    model=self.model,
                    documents=documents,
                    embedding=self.embeddings,
                    user_profile=self.profile,
                    memory=self.memory_size,
                    system_prompts=active_prompts,
                    temperature=self.temperature,
                    max_tokens=self.max_tokens,
                    max_retries=1,
                )
                self.clone.fit()
                print(f"[CloneEngine] Fallback model '{self.model}' ready!")
            else:
                raise err

    def ask(self, prompt: str) -> str:
        """Sends a query to the clone and returns the complete text response."""
        if not self.clone:
            raise RuntimeError("Clone is not initialized.")
        try:
            return self.clone.invoke(prompt)
        except Exception as err:
            if ("rate_limit" in str(err).lower() or "429" in str(err) or "tokens per day" in str(err).lower()) and self.model != FALLBACK_MODEL:
                print(f"[CloneEngine] Rate limit reached on {self.model}. Switching to fallback '{FALLBACK_MODEL}'...")
                self.model = FALLBACK_MODEL
                self.init_clone()
                return self.clone.invoke(prompt)
            raise err

    def ask_stream(self, prompt: str) -> Iterator[str]:
        """Streams response tokens in real-time."""
        if not self.clone:
            raise RuntimeError("Clone is not initialized.")
        try:
            for chunk in self.clone.stream(prompt):
                yield chunk
        except Exception as err:
            if ("rate_limit" in str(err).lower() or "429" in str(err) or "tokens per day" in str(err).lower()) and self.model != FALLBACK_MODEL:
                print(f"\n[CloneEngine] Rate limit reached on {self.model}. Switching to fallback '{FALLBACK_MODEL}'...")
                self.model = FALLBACK_MODEL
                self.init_clone()
                for chunk in self.clone.stream(prompt):
                    yield chunk
            else:
                raise err

    def reset_memory(self) -> None:
        """Resets the conversation history."""
        if self.clone:
            self.clone.reset_memory()
            print("[CloneEngine] Conversation history reset.")

    def reload_data(self) -> None:
        """Reloads documents from data/ and re-fits the clone."""
        print("[CloneEngine] Reloading documents and re-fitting clone...")
        self.init_clone()

# Global default instance
_engine_instance: Optional[PersonaCloneEngine] = None

def get_clone_engine() -> PersonaCloneEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = PersonaCloneEngine()
    return _engine_instance
