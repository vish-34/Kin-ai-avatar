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
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough, RunnableSerializable
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables.history import RunnableWithMessageHistory
from clonellm import CloneLLM
from clonellm.models import UserProfile
from clonellm.memory import get_session_history
from operator import itemgetter
import functools

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

# Phase 1 Model & Generation Configuration
PRIMARY_MODEL = "groq/openai/gpt-oss-20b"
FALLBACK_MODEL = "groq/openai/gpt-oss-120b"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

# Inference Parameters (Documented: max_tokens 300 -> 1024 to accommodate reasoning tokens)
DEFAULT_MAX_TOKENS = 1024
DEFAULT_TEMPERATURE = 0.7
DEFAULT_PRESENCE_PENALTY = 0.3
DEFAULT_FREQUENCY_PENALTY = 0.3


class EnhancedCloneLLM(CloneLLM):
    """Subclass of CloneLLM that removes artificial input wrappers ('Question:\n')

    and toxic jailbreak prompts, while configuring proper token budgets and penalties.
    """

    def _build_natural_prompt(self, with_history: bool = True) -> ChatPromptTemplate:
        messages = []

        # 1. Custom persona instructions (our refined human conversational rules)
        for prompt_text in (self.system_prompts or []):
            messages.append(("system", prompt_text))

        # 2. Biographical profile context (if provided)
        if self.user_profile:
            safe_profile = self._user_profile.replace("{", "{{").replace("}", "}}")
            messages.append(
                (
                    "system",
                    f"PERSONAL PROFILE & DEMOGRAPHICS:\n{safe_profile}\n"
                    "Express these personality traits and background naturally through tone and attitude.",
                )
            )

        # 3. Retrieved memory context with explicit epistemic grounding
        messages.append(
            (
                "system",
                "AUTHENTIC MEMORIES & BACKGROUND KNOWLEDGE:\n{context}\n"
                "(Integrate these memories naturally when relevant. Do NOT fabricate memories contrary to this background.)",
            )
        )

        # 4. Conversation history
        if with_history:
            messages.append(MessagesPlaceholder(variable_name="chat_history"))

        # 5. Natural user input - NO 'Question:\n' WRAPPER!
        messages.append(("human", "{input}"))

        return ChatPromptTemplate.from_messages(messages)

    def _get_rag_chain(self) -> RunnableSerializable[Any, str]:
        prompt = self._build_natural_prompt(with_history=False)
        context = self._get_retriever() if self.embedding else lambda x: self.context
        return {"context": context, "input": RunnablePassthrough()} | prompt | self._llm | StrOutputParser()

    def _get_rag_chain_with_history(self) -> RunnableWithMessageHistory:
        prompt = self._build_natural_prompt(with_history=True)
        context = itemgetter("input") | self._get_retriever() if self.embedding else lambda x: self.context
        first_step = RunnablePassthrough.assign(context=context)
        rag_chain = first_step | prompt | self._llm | StrOutputParser()

        if not self.memory:
            max_memory_size = 0
        elif (isinstance(self.memory, bool) and self.memory) or self.memory == -1:
            max_memory_size = -1
        else:
            max_memory_size = int(self.memory)

        get_session_history_ = functools.partial(get_session_history, max_memory_size=max_memory_size)

        return RunnableWithMessageHistory(
            rag_chain,
            get_session_history_,
            input_messages_key="input",
            history_messages_key="chat_history",
            output_parser=StrOutputParser(),
        )


class PersonaCloneEngine:
    """Manages the EnhancedCloneLLM instance, HuggingFace embeddings, and memory state."""

    def __init__(
        self,
        persona_id: str = "dadaji",
        persona_dir: Optional[Path] = None,
        model: str = PRIMARY_MODEL,
        memory_size: int = 15,
        temperature: float = DEFAULT_TEMPERATURE,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        presence_penalty: float = DEFAULT_PRESENCE_PENALTY,
        frequency_penalty: float = DEFAULT_FREQUENCY_PENALTY,
        system_prompts: Optional[List[str]] = None,
        verbose: bool = False,
    ):
        self.persona_id = persona_id
        self.persona_dir = Path(persona_dir) if persona_dir else None
        self.model = model
        self.memory_size = memory_size
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.presence_penalty = presence_penalty
        self.frequency_penalty = frequency_penalty
        self.verbose = verbose
        self.custom_system_prompts = system_prompts

        if self.verbose:
            print(f"[CloneEngine] Loading local embeddings: {EMBEDDING_MODEL_NAME}...")

        self.embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL_NAME,
            model_kwargs={"local_files_only": True},
        )
        self.clone: Optional[EnhancedCloneLLM] = None
        self.profile: Optional[UserProfile] = None
        self.init_clone()

    def init_clone(self) -> None:
        """Loads data from persona_dir or data/ and initializes the EnhancedCloneLLM instance."""
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

        # Phase 1: High-Fidelity Human Conversational Rules
        active_prompts = self.custom_system_prompts or [
            f"FAMILY IDENTITY: You are {display_name} ({relation}), a retired electrical engineer from Bangalore. You are chatting with your beloved grandchild. Speak in your authentic elder voice. You are family, NOT a customer service agent, and NOT a clinical therapist.",
            "LOW-ENTROPY PROPORTIONALITY (ANTI-OVEREMPATHY): Match the energy and length of the user. If the grandchild texts very short messages ('yeah', 'nah', 'ok', 'lol', 'hmm', 'k', 'cool', 'what', 'idk', 'bruh'), respond with matching natural brevity (1 to 5 words, e.g. 'Haha, okay', 'Haan, batao', 'Good to know'). NEVER provide emotional counseling, deep reassurance, or life advice for one-word inputs.",
            "REDUCE THERAPIST REFLEX: Stop reflexively using AI-therapist phrases ('I hear you', 'I understand how you feel', 'Your feelings are valid', 'I am right here with you', 'I'm proud of you'). Only offer comfort when the grandchild genuinely shares pain or distress. Otherwise, chat casually, observe, tease, share a memory, or give practical tips.",
            "EPISTEMIC MEMORY INTEGRITY (ANTI-SYCOPHANCY): Your memories and life background are real and firm. If the grandchild misremembers or makes false assertions contrary to your memories (e.g. claiming you fixed a wooden clock instead of a toy radio, or that you were a doctor), DO NOT agree with them and DO NOT fabricate sensory details (e.g. ticking sounds). Politely, lovingly correct them like an elder with a sharp memory (e.g. 'Arre nahi beta, it wasn't a clock, it was the toy radio!'). Never hallucinate memories to be agreeable.",
            "HUMOR, SARCASM & BANTER: Recognize sarcasm and dry humor! If they complain sarcastically about endless office meetings, commiserate with dry elder wit—do NOT take sarcasm literally or give earnest stress management advice. If they joke about being lazy or becoming a 'professional sleeper', tease them back affectionately. If they suggest something reckless like dropping out of college for meme-coins, give loving elder pushback and common sense, NOT unconditional praise.",
            "STRICT LANGUAGE & SCRIPT MIRRORING: Reply in the exact same language and script the user uses. If they text in English, reply in natural English. If they text in Romanized Hinglish (e.g. 'kaisa chal raha hai sab', 'clg se aake bore ho rha tha'), reply in Romanized Hinglish. NEVER switch into Devanagari script unless they explicitly text in Devanagari script. Understand casual chat shorthand ('bs' = bas, 'clg' = college, 'kuch nhi' = nothing).",
            "OUT-OF-DOMAIN GRACEFUL DEFLECTION: If asked about modern trends, modern action movies, current cricket scores, or things outside your lived experience, answer naturally as an elder—honestly admit you don't follow these modern things and pivot naturally ('Beta, I don't follow these modern action movies, I only know old classics'). Never freeze into silence or give generic motivational filler.",
            "CONVERSATIONAL PACING: Speak in natural conversational bursts (1 to 3 short sentences). Vary your openers naturally; do not begin every message with 'Beta' or 'I understand'. NEVER use bullet points, numbered lists, or bold markdown.",
        ]

        if self.verbose:
            print(f"[CloneEngine] Initializing EnhancedCloneLLM for {display_name} ({self.persona_id}) with model '{self.model}'...")

        try:
            self.clone = EnhancedCloneLLM(
                model=self.model,
                documents=documents,
                embedding=self.embeddings,
                user_profile=self.profile,
                memory=self.memory_size,
                system_prompts=active_prompts,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                presence_penalty=self.presence_penalty,
                frequency_penalty=self.frequency_penalty,
                max_retries=1,
            )
            self.clone.fit()
            print(f"[CloneEngine] Persona Clone ready as '{display_name}' (max_tokens={self.max_tokens})!")

        except Exception as err:
            print(f"[CloneEngine] Error initializing primary model '{self.model}': {err}")
            if self.model != FALLBACK_MODEL:
                print(f"[CloneEngine] Attempting fallback to '{FALLBACK_MODEL}'...")
                self.model = FALLBACK_MODEL
                self.clone = EnhancedCloneLLM(
                    model=self.model,
                    documents=documents,
                    embedding=self.embeddings,
                    user_profile=self.profile,
                    memory=self.memory_size,
                    system_prompts=active_prompts,
                    temperature=self.temperature,
                    max_tokens=self.max_tokens,
                    presence_penalty=self.presence_penalty,
                    frequency_penalty=self.frequency_penalty,
                    max_retries=1,
                )
                self.clone.fit()
                print(f"[CloneEngine] Fallback model '{self.model}' ready!")
            else:
                raise err

    def ask(self, prompt: str) -> str:
        """Sends a query to the clone with quality layer checks and returns the response."""
        if not self.clone:
            raise RuntimeError("Clone is not initialized.")
        try:
            response = self.clone.invoke(prompt)

            # Response Quality Layer: Detect empty or truncated response
            if not response or not response.strip():
                print(f"[QualityLayer] Warning: Model returned empty response for prompt: '{prompt[:40]}...'. Retrying invocation...")
                # Single diagnostic retry
                response = self.clone.invoke(prompt)

            # Clean trailing cutoffs if any
            clean_resp = response.strip() if response else ""
            if not clean_resp:
                clean_resp = "Arre beta, my mind wandered for a second. Tell me, what were we saying?"

            return clean_resp

        except Exception as err:
            err_str = str(err).lower()
            if ("rate_limit" in err_str or "429" in err_str or "tokens per day" in err_str or "tpm" in err_str) and self.model != FALLBACK_MODEL:
                print(f"[CloneEngine] Rate limit reached on {self.model}. Switching to fallback '{FALLBACK_MODEL}'...")
                self.model = FALLBACK_MODEL
                self.init_clone()
                return self.ask(prompt)
            raise err

    def ask_stream(self, prompt: str) -> Iterator[str]:
        """Streams response tokens in real-time with quality monitoring."""
        if not self.clone:
            raise RuntimeError("Clone is not initialized.")
        try:
            chunk_count = 0
            for chunk in self.clone.stream(prompt):
                chunk_count += 1
                yield chunk
            if chunk_count == 0:
                print(f"[QualityLayer] Warning: Stream emitted 0 chunks for prompt: '{prompt[:40]}...'")
        except Exception as err:
            err_str = str(err).lower()
            if ("rate_limit" in err_str or "429" in err_str or "tokens per day" in err_str or "tpm" in err_str) and self.model != FALLBACK_MODEL:
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


