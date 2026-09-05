# 🎙️ Kin-AI-Avatar: Voice Cloning Module (OpenVoice V2 + Colab)

This directory contains the integration for **OpenVoice V2** running on Google Colab (with a free NVIDIA T4 GPU) and connecting directly to your local `Kin-ai-avatar` backend and frontend.

---

## 📁 Files in this Directory

| File | Description |
| :--- | :--- |
| **[`openvoice_avatar_colab.ipynb`](file:///c:/Users/vishal/Desktop/Kin-ai-avatar/Backend/Voice/openvoice_avatar_colab.ipynb)** | Complete Google Colab notebook. Open this in Google Colab to run OpenVoice V2 on a T4 GPU. |
| **[`colab_server.py`](file:///c:/Users/vishal/Desktop/Kin-ai-avatar/Backend/Voice/colab_server.py)** | The standalone FastAPI server script executed inside Colab. |
| **[`voice_client.py`](file:///c:/Users/vishal/Desktop/Kin-ai-avatar/Backend/Voice/voice_client.py)** | Local Python client that your backend / avatar frontend calls to synthesize speech and stream sentence-by-sentence. |

---

## 🚀 Quickstart Guide

### Step 1: Open the Notebook in Google Colab
1. Go to [Google Colab](https://colab.research.google.com/).
2. Click **File > Upload Notebook** and select `openvoice_avatar_colab.ipynb` from this folder (`Backend/Voice/`).
3. Set your runtime to GPU: **Runtime > Change runtime type > T4 GPU**.

### Step 2: Run the Cells
1. Run Cells 1 through 4 to install dependencies and download model weights.
2. In **Cell 5**, upload a 5–15 second clean audio clip (`.wav` or `.mp3`) of the person whose voice you want to clone (e.g., `elder.wav`).
3. Run **Cell 6** to test the voice cloning directly in Colab.

### Step 3: Start the Public Server
1. In **Cell 7**, paste your free **Ngrok Auth Token** (get one free at [ngrok.com](https://dashboard.ngrok.com/get-started/your-authtoken)).
2. Run the cell. Colab will display your public URL:
   ```
   🚀 PUBLIC COLAB URL: https://xxxx-xx-xx-xx.ngrok-free.app
   ```

### Step 4: Connect to your Local Backend
Add the URL to your [`Backend/.env`](file:///c:/Users/vishal/Desktop/Kin-ai-avatar/Backend/.env):
```ini
COLAB_VOICE_URL = https://xxxx-xx-xx-xx.ngrok-free.app
```

---

## 💻 Using with `Clonellm` (Streaming Voice)

You can connect `voice_client.py` directly to [`PersonaCloneEngine`](file:///c:/Users/vishal/Desktop/Kin-ai-avatar/Backend/Clonellm/main.py):

```python
from Clonellm.clone_engine import PersonaCloneEngine
from Voice.voice_client import ColabVoiceClient

engine = PersonaCloneEngine()
voice_client = ColabVoiceClient()

user_question = "Tell me about your childhood."

# Stream LLM tokens -> Stream audio chunks as each sentence finishes!
token_stream = engine.ask_stream(user_question)
for audio_chunk_bytes in voice_client.stream_sentences(token_stream, speaker_name="elder"):
    # Send audio_chunk_bytes to frontend over WebSocket or play locally!
    pass
```
