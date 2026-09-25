import os
import json
import datetime
from pathlib import Path
from typing import List, Tuple, Optional

from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader, TextLoader, UnstructuredMarkdownLoader
from clonellm.models import UserProfile, PersonalityTraits, CommunicationSample

DATA_DIR = Path(__file__).resolve().parent / "data"

def load_persona_profile(profile_path: Optional[Path] = None) -> Optional[UserProfile]:
    """Loads the UserProfile and PersonalityTraits from profile.json if available."""
    target_path = profile_path or (DATA_DIR / "profile.json")
    if not target_path.exists():
        return None

    try:
        with open(target_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Parse birth date if provided
        birth_date = None
        if "birth_date" in data and data["birth_date"]:
            try:
                birth_date = datetime.date.fromisoformat(data["birth_date"])
            except Exception:
                birth_date = data["birth_date"]

        # Parse personality traits
        traits = None
        if "personality_traits" in data and data["personality_traits"]:
            traits = PersonalityTraits(**data["personality_traits"])

        # Parse communication samples
        samples = []
        if "communication_samples" in data and isinstance(data["communication_samples"], list):
            for s in data["communication_samples"]:
                samples.append(CommunicationSample(**s))

        profile = UserProfile(
            first_name=data.get("first_name", "Persona"),
            last_name=data.get("last_name", ""),
            preferred_name=data.get("preferred_name"),
            prefix=data.get("prefix"),
            birth_date=birth_date,
            gender=data.get("gender"),
            city=data.get("city"),
            state=data.get("state"),
            country=data.get("country"),
            phone_number=data.get("phone_number"),
            email=data.get("email"),
            personality_traits=traits,
            communication_samples=samples if samples else None,
            expertise=data.get("expertise"),
            home_page=data.get("home_page"),
            github_page=data.get("github_page"),
            linkedin_page=data.get("linkedin_page"),
        )
        return profile
    except Exception as e:
        print(f"[Loader] Error parsing profile.json: {e}")
        return None

def load_all_documents(data_dir: Optional[Path] = None) -> List[Document]:
    """Scans data/ directory and loads all .txt, .md, .pdf, and other .json documents."""
    target_dir = data_dir or DATA_DIR
    target_dir.mkdir(parents=True, exist_ok=True)

    documents: List[Document] = []

    for file_path in target_dir.iterdir():
        if file_path.is_dir():
            continue

        # Skip profile.json since it is handled by load_persona_profile
        if file_path.name.lower() == "profile.json":
            continue

        suffix = file_path.suffix.lower()
        try:
            if suffix in [".txt", ".text"]:
                docs = TextLoader(str(file_path), encoding="utf-8").load()
                documents.extend(docs)
                print(f"[Loader] Loaded text document: {file_path.name} ({len(docs)} segments)")

            elif suffix == ".md":
                docs = TextLoader(str(file_path), encoding="utf-8").load()
                documents.extend(docs)
                print(f"[Loader] Loaded markdown document: {file_path.name} ({len(docs)} segments)")

            elif suffix == ".pdf":
                docs = PyPDFLoader(str(file_path)).load()
                documents.extend(docs)
                print(f"[Loader] Loaded PDF document: {file_path.name} ({len(docs)} pages)")

            elif suffix == ".json":
                with open(file_path, "r", encoding="utf-8") as jf:
                    json_content = jf.read()
                documents.append(Document(page_content=json_content, metadata={"source": file_path.name}))
                print(f"[Loader] Loaded JSON document: {file_path.name}")

        except Exception as err:
            print(f"[Loader] Warning: Failed to load {file_path.name}: {err}")

    return documents

def get_persona_bundle(data_dir: Optional[Path] = None) -> Tuple[List[Document], Optional[UserProfile]]:
    """Returns all ingested documents and the user profile ready for CloneLLM."""
    docs = load_all_documents(data_dir)
    target_profile_path = (data_dir / "profile.json") if data_dir else None
    profile = load_persona_profile(target_profile_path)
    return docs, profile
