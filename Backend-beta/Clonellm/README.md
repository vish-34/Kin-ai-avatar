# Kin-AI-Avatar: Persona Clone Engine (CloneLLM + Groq)

This module implements a personalized digital twin / persona RAG conversational system using **CloneLLM**, powered by **Groq** (`openai/gpt-oss-120b`) and **HuggingFace Embeddings** (`all-MiniLM-L6-v2`).

---

## 📁 Where to Upload Your Data

All knowledge and persona files belong in the **`data/`** folder:

```
Backend/Clonellm/data/
├── profile.json            <-- (Optional) Persona demographics, Big 5 personality & tone samples
├── grandma_memories.txt    <-- (Example) Stories, recipes, memories, advice
├── letters.txt             <-- Any notes, transcripts, or personal diaries
├── resume_or_bio.pdf       <-- Any PDF files (automatically parsed)
└── personal_notes.md       <-- Markdown files
```

### Supported File Types in `data/`:
| File Format | Usage | How It Works |
| :--- | :--- | :--- |
| **`.txt` / `.text`** | Personal stories, memories, recipes, transcripts | Loaded and chunked into the vector database. |
| **`.md`** | Markdown notes, journal entries, logs | Ingested via text loaders. |
| **`.pdf`** | Resumes, letters, books, documents | Parsed page-by-page using `pypdf`. |
| **`.json`** | Custom Q&A pairs, chat history, or messages | Loaded as structured context. |

---

## ⚙️ How to Customize the Persona Profile (`profile.json`)

Inside `Backend/Clonellm/data/profile.json`, you can define:
1. **Demographics**: Name, birth date, hometown, relationships.
2. **Big Five Personality Traits** (Scores from `0.0` to `1.0`):
   * `agreeableness`: e.g. `1.0` for maximum grandmotherly warmth and kindness.
   * `conscientiousness`: e.g. `0.9` for family traditions, neatness, attention to detail.
   * `extraversion`: e.g. `0.75` for lively storytelling and chatting.
   * `openness`: e.g. `0.65` for appreciation of art, cooking, and ideas.
   * `neuroticism`: e.g. `0.10` for calm, reassuring, and soothing energy.
3. **Communication Samples**:
   Provide actual sample phrases and tone for different contexts (e.g. casual greeting, giving comfort).

---

## 🔑 API Keys & Environment Configuration

The engine automatically loads configuration from `Backend/.env`:
* **Groq API Key**: Looks for `GroqAPIKey` or `GROQ_API_KEY`.
* **HuggingFace Key**: Looks for `HuggingFaceAPIKey` or `HF_TOKEN`.

---

## 🚀 How to Run & Test Interactively

Open your terminal in `Backend/` and run:

```bash
cd Backend/Clonellm
python main.py
```

### Interactive Commands:
* Type your question or greeting to chat with the persona in real-time.
* Type **`clear`** to reset the conversation history.
* Type **`reload`** if you add new files to `data/` and want to re-fit without restarting.
* Type **`exit`** to leave the chat.

---

## 💻 Python API Usage in Kin-AI-Avatar

You can import and use the persona engine anywhere in your backend:

```python
from Clonellm.clone_engine import get_clone_engine

engine = get_clone_engine()

# 1. Full response
reply = engine.ask("Hi Grandma, how do you make your tomato sauce?")
print(reply)

# 2. Real-time streaming generator
for chunk in engine.ask_stream("Tell me about your early days."):
    print(chunk, end="", flush=True)

# 3. Reset memory
engine.reset_memory()
```
