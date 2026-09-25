"""
internal_server.py - Internal Microservice Wrapper for CloneLLM
Exposes an internal HTTP interface on localhost:5001 for Express.
Does NOT modify CloneLLM or clone_engine.py internals.
Loads persona and memory definitions directly from persistent backend.
"""

import os
import sys
import json
import re
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Ensure safe standard stream encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")

CURRENT_DIR = Path(__file__).resolve().parent
PYTHON_DIR = CURRENT_DIR.parent
if str(PYTHON_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_DIR))
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

# Load .env from Backend root if present
BACKEND_DIR = CURRENT_DIR.parent.parent
ENV_PATH = BACKEND_DIR / ".env"
if ENV_PATH.exists():
    from dotenv import dotenv_values
    env_vars = dotenv_values(ENV_PATH)
    groq_key = env_vars.get("GroqAPIKey") or env_vars.get("GROQ_API_KEY")
    if groq_key:
        os.environ["GROQ_API_KEY"] = groq_key

from clone_service.clone_engine import get_clone_engine, PersonaCloneEngine, _persona_engines

app = FastAPI(title="KIN CloneLLM Internal Service", version="1.0.0")

# Cache directory where MongoDB-synced persona documents are staged for CloneLLM loader
CACHE_DIR = CURRENT_DIR / "cache" / "personas"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


class SyncPersonaRequest(BaseModel):
    persona_id: str
    name: str
    calling_name: Optional[str] = None
    relation: Optional[str] = "Family Member"
    lifespan: Optional[str] = ""
    hometown: Optional[str] = ""
    personality_summary: Optional[str] = ""
    catchphrases: Optional[List[str]] = []
    memories: Optional[List[str]] = []


class ChatRequest(BaseModel):
    message: str
    avatar_id: Optional[str] = "dadaji"


@app.get("/internal/health")
def health():
    return {
        "status": "ok",
        "service": "clonellm-internal",
        "loaded_personas": list(_persona_engines.keys()),
        "has_groq_key": bool(os.getenv("GROQ_API_KEY")),
    }


@app.post("/internal/persona/sync")
def sync_persona_from_backend(req: SyncPersonaRequest):
    """
    Receives persistent persona profile and memories from MongoDB/Express.
    Stages profile.json and memories.txt, then initializes or refreshes PersonaCloneEngine.
    """
    clean_id = re.sub(r'[^a-zA-Z0-9_-]', '_', req.persona_id.lower().strip()).strip('_')
    if not clean_id:
        raise HTTPException(status_code=400, detail="Invalid persona_id")

    persona_path = CACHE_DIR / clean_id
    persona_path.mkdir(parents=True, exist_ok=True)

    # 1. Write profile.json
    comm_samples = []
    if req.catchphrases:
        comm_samples.append({
            "context": "Signature Saying",
            "audience_type": "Close Connection",
            "formality_level": 0.1,
            "content": f"{req.catchphrases[0]}."
        })

    profile_data = {
        "name": req.name,
        "first_name": req.name,
        "last_name": "",
        "calling_name": req.calling_name if req.calling_name else None,
        "preferred_name": req.name,
        "relation": req.relation or "Family Member",
        "lifespan": req.lifespan or "",
        "city": req.hometown or "",
        "hometown": req.hometown or "",
        "personality_summary": req.personality_summary or "",
        "catchphrases": req.catchphrases or [],
        "communication_samples": comm_samples,
    }
    with open(persona_path / "profile.json", "w", encoding="utf-8") as pf:
        json.dump(profile_data, pf, indent=2, ensure_ascii=False)

    # 2. Write memories.txt
    memories_parts = [
        f"NAME: {req.name}",
        f"RELATION TO USER: {req.relation or 'Family Member'}",
    ]
    if req.calling_name:
        memories_parts.append(f"HOW THIS PERSON ADDRESSES THE USER: {req.calling_name}")
    if req.lifespan:
        memories_parts.append(f"LIFESPAN: {req.lifespan}")
    if req.hometown:
        memories_parts.append(f"HOMETOWN: {req.hometown}")
    if req.personality_summary:
        memories_parts.append(f"PERSONALITY & ESSENCE: {req.personality_summary}")
    if req.catchphrases:
        memories_parts.append(
            "FAVORITE SAYINGS & CATCHPHRASES:\n" + "\n".join(f"- \"{p}\"" for p in req.catchphrases)
        )
    if req.memories:
        memories_parts.append(
            "AUTHENTIC MEMORIES & LIVED EXPERIENCES:\n" + "\n\n".join(req.memories)
        )

    with open(persona_path / "memories.txt", "w", encoding="utf-8") as mf:
        mf.write("\n\n".join(memories_parts))

    # 3. Reload or Initialize PersonaCloneEngine
    try:
        if clean_id in _persona_engines:
            _persona_engines[clean_id].reload_data()
        else:
            get_clone_engine(persona_id=clean_id, persona_dir=persona_path)
    except Exception as e:
        print(f"[Internal CloneLLM] Engine initialization warning for '{clean_id}': {e}")

    return {
        "success": True,
        "persona_id": clean_id,
        "status": "synced",
    }


def _get_engine_for(avatar_id: str) -> PersonaCloneEngine:
    clean_id = re.sub(r'[^a-zA-Z0-9_-]', '_', (avatar_id or "dadaji").lower().strip()).strip('_')
    persona_path = CACHE_DIR / clean_id
    if persona_path.exists() and (persona_path / "profile.json").exists():
        return get_clone_engine(persona_id=clean_id, persona_dir=persona_path)
    return get_clone_engine(persona_id="dadaji")


@app.post("/internal/chat")
def chat(req: ChatRequest):
    """Full text invocation with memory grounding and conversational rules."""
    engine = _get_engine_for(req.avatar_id)
    try:
        response_text = engine.ask(req.message.strip())
        return {
            "success": True,
            "response": response_text,
            "citation": "Synthesized from authentic voice profile & personal memories",
        }
    except Exception as e:
        err_str = str(e).lower()
        if "rate_limit" in err_str or "429" in err_str or "tokens" in err_str:
            import time
            time.sleep(3.0)
            try:
                response_text = engine.ask(req.message.strip())
                return {
                    "success": True,
                    "response": response_text,
                    "citation": "Synthesized from authentic voice profile & personal memories",
                }
            except Exception as retry_err:
                return {
                    "success": True,
                    "response": "Arre beta, my mind paused for a moment. What were we talking about?",
                    "citation": "Fallback conversational response",
                }
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/internal/chat/stream")
def chat_stream(req: ChatRequest):
    """Streams SSE tokens from CloneLLM in real time."""
    engine = _get_engine_for(req.avatar_id)
    prompt = req.message.strip()

    def stream_generator():
        try:
            for token in engine.ask_stream(prompt):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield f"data: {json.dumps({'done': True, 'citation': 'Synthesized from authentic voice profile & personal memories'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )


@app.post("/internal/memory/reset")
def reset_memory(avatar_id: Optional[str] = "dadaji"):
    """Resets session conversation history."""
    try:
        engine = _get_engine_for(avatar_id)
        engine.reset_memory()
        return {"success": True, "message": "Memory reset successfully."}
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5001"))
    uvicorn.run(app, host="127.0.0.1", port=port)
