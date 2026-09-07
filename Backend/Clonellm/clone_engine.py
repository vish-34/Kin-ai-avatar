import os
import sys
import json
from pathlib import Path
from typing import Iterator, Optional, List, Dict, Any
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
        persona_id: str = "dadaji",
        persona_dir: Optional[Path] = None,
        model: str = PRIMARY_MODEL,
        memory_size: int = 15,
        temperature: float = 0.8,
        max_tokens: int = 300,
        system_prompts: Optional[List[str]] = None,
        verbose: bool = False,
    ):
        self.persona_id = persona_id
        self.persona_dir = Path(persona_dir) if persona_dir else None
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
        """Loads data from persona_dir or data/ and initializes the CloneLLM instance."""
        documents, profile = get_persona_bundle(self.persona_dir)
        self.profile = profile

        # Extract extra fields if present in raw profile.json
        relation = "Elder"
        calling_name = ""
        catchphrases = []
        if self.persona_dir and (self.persona_dir / "profile.json").exists():
            try:
                with open(self.persona_dir / "profile.json", "r", encoding="utf-8") as pf:
                    raw_p = json.load(pf)
                    relation = raw_p.get("relation", relation)
                    calling_name = raw_p.get("calling_name", raw_p.get("preferred_name", ""))
                    catchphrases = raw_p.get("catchphrases", [])
            except Exception:
                pass

        # Determine preferred name or first name
        display_name = calling_name or (self.profile.preferred_name if self.profile else None) or (self.profile.first_name if self.profile else None) or "Dadaji"

        if not documents:
            documents = [f"I am {display_name} ({relation}), a warm, caring family elder who loves sharing wisdom, family stories, and comfort."]

        phrases_prompt = f" CATCHPHRASES YOU FREQUENTLY USE: {', '.join(catchphrases)}." if catchphrases else ""

        # Ultra-human conversation rules (comforting statements, no interrogation, turn taking)
        active_prompts = self.custom_system_prompts or [
            f"FAMILY RELATIONSHIP: You are {display_name} ({relation}). The user talking to you is your beloved family member (child / grandchild).{phrases_prompt}",
            "ADDRESSING THEM: Always treat them with tender parental/elder family love ('beta', 'bachha'). NEVER use peer slang like 'bhai', 'bro', 'yaar', 'dost', or 'sir'.",
            "DO NOT ALWAYS ASK QUESTIONS: Real humans do NOT interrogate or end every single turn with a question! Most of your replies (80%+) should be comforting statements, gentle observations, shared feelings, or quiet presence WITHOUT any question marks.",
            "NEVER USE CUSTOMER SERVICE PHRASES: NEVER say 'How can I help you?', 'How can I assist you?', or similar bot tropes. You are family, not a virtual helpdesk.",
            "STRICT LANGUAGE MIRRORING: You MUST ALWAYS reply in the EXACT SAME LANGUAGE the user used in their latest message. If the user writes in English, reply in 100% warm English. If the user writes in Hindi/Hinglish, reply in Hindi/Hinglish. Never cross languages.",
            "HINGLISH TEXTING CONTEXT: When they text in casual Hinglish, understand their words naturally: 'bs' = 'bas' (just / only), 'kuch nhi' = 'nothing', 'clg' = 'college'.",
            "HUMAN CONVERSATIONAL PACING: Speak in short, natural bursts (strictly 1 or 2 short sentences, under 20-25 words). Share one comforting thought at a time.",
            "NO REPETITIVE OPENERS: Do NOT start every response with 'Arey', 'Arre', or any fixed catchphrase. Vary how you begin naturally.",
            "GRIEF & WARMTH: If they say 'I miss you', respond with a quiet, tender embrace: 'I miss you too, beta. My love is always with you.'",
            f"STRICT RULES: NEVER use bullet points, lists, bold text, or long paragraphs. Speak in pure first person as {display_name}. Never break character.",
        ]

        if self.verbose:
            print(f"[CloneEngine] Initializing CloneLLM for {display_name} ({self.persona_id}) with model '{self.model}' ({len(documents)} document segments)...")

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

# Multi-Persona Engine Registry
_persona_engines: Dict[str, PersonaCloneEngine] = {}

def get_clone_engine(persona_id: str = "dadaji", persona_dir: Optional[Path] = None) -> PersonaCloneEngine:
    global _persona_engines
    clean_id = (persona_id or "dadaji").lower().strip()
    if clean_id not in _persona_engines:
        _persona_engines[clean_id] = PersonaCloneEngine(persona_id=clean_id, persona_dir=persona_dir)
    return _persona_engines[clean_id]

