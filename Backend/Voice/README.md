# 🎙️ Kin-AI-Avatar: OmniVoice Voice Cloning & Streaming Studio

> 💡 **Unified Single-Notebook Recommendation**:
> If you want to run **both Voice (OmniVoice) and Avatar (MuseTalk) simultaneously on one Colab GPU with a single public URL**, use **[`Backend/kin_avatar_unified_colab.ipynb`](../kin_avatar_unified_colab.ipynb)**! You only need to paste one `COLAB_SERVER_URL` into `Backend/.env`.

This directory integrates **`k2-fsa/OmniVoice`** running on a free **Google Colab GPU** with your local Kin-AI-Avatar backend and terminal.

---

## 🌟 Key Capabilities

1. **One-Time Voice Registration (`VoiceClonePrompt`)**:
   - Upload any 3–20 second audio sample (`.wav`, `.mp3`, `.flac`) into `Backend/Voice/`.
   - The server encodes it once into a compact `VoiceClonePrompt` (`.pt`) and saves it on disk.
   - **Zero Re-Processing**: Subsequent text generation directly reuses the pre-computed prompt. No audio re-transcription or re-encoding is performed!

2. **Real-Time Sentence-by-Sentence Streaming**:
   - For long paragraphs or dialogue, the server splits text into natural clauses and streams 24kHz audio chunks in real-time.
   - Time-to-first-audio is **sub-second** (~200ms), so you never have to wait for the entire text to finish before hearing speech.

3. **Interactive Terminal Studio**:
   - Run `python Backend/Voice/interactive_voice.py` to chat and hear cloned speech live in your terminal.

---

## 📁 Files in this Directory

| File | Purpose |
| :--- | :--- |
| **[`omnivoice_avatar_colab.ipynb`](file:///c:/Users/vishal/Desktop/Kin-ai-avatar/Backend/Voice/omnivoice_avatar_colab.ipynb)** | Complete Google Colab notebook to run on a free T4/A100 GPU. |
| **[`colab_server.py`](file:///c:/Users/vishal/Desktop/Kin-ai-avatar/Backend/Voice/colab_server.py)** | FastAPI server script executed inside Google Colab. |
| **[`voice_client.py`](file:///c:/Users/vishal/Desktop/Kin-ai-avatar/Backend/Voice/voice_client.py)** | Python client library (`OmniVoiceColabClient`) for backend and LLM streaming. |
| **[`interactive_voice.py`](file:///c:/Users/vishal/Desktop/Kin-ai-avatar/Backend/Voice/interactive_voice.py)** | Interactive terminal CLI to select voice audio, input text, and stream audio. |
| **[`test_voice.py`](file:///c:/Users/vishal/Desktop/Kin-ai-avatar/Backend/Voice/test_voice.py)** | Standalone pipeline test script. |

---

## 🚀 Step-by-Step Setup Guide

### Step 1: Open the Notebook in Google Colab
1. Go to [Google Colab](https://colab.research.google.com/).
2. Click **File > Upload Notebook** and select `Backend/Voice/omnivoice_avatar_colab.ipynb`.
3. Set your runtime to GPU: **Runtime > Change runtime type > T4 GPU**.

### Step 2: Run All Cells
- Run cells 1 through 4.
- In **Cell 4**, Colab will print your public tunnel URL:
  ```
  ======================================================================
  🚀 PUBLIC COLAB URL: https://xxxx.trycloudflare.com (or ngrok)
  ======================================================================
  ```

### Step 3: Save URL to `Backend/.env`
Open [`Backend/.env`](file:///c:/Users/vishal/Desktop/Kin-ai-avatar/Backend/.env) and set:
```ini
COLAB_VOICE_URL = https://xxxx.trycloudflare.com
```

---

## 🎧 How to Use the Terminal Voice Studio

### 1. Place a Voice Audio Sample (Optional)
Drop any `.wav` or `.mp3` clip of the person's voice (e.g., `dadaji.wav`) directly into `Backend/Voice/`.

### 2. Launch the Interactive Studio
In your terminal, run:
```bash
python Backend/Voice/interactive_voice.py
```

1. The script connects to your Colab server.
2. Select your local audio file (e.g. `dadaji.wav`) to encode and cache it, or pick an existing cached voice.
3. Type any text (short sentence or multi-paragraph story) and press **Enter**.
4. The cloned voice will stream chunk-by-chunk in real-time and play out loud!
5. Final audio is saved to `clone_out.wav`.

---

## 💻 Programmatic Usage with `Clonellm` (Memorial Dialogue)

To stream tokens from `Clonellm`'s `PersonaCloneEngine` directly into cloned speech:

```python
from Clonellm.clone_engine import PersonaCloneEngine
from Voice.voice_client import OmniVoiceColabClient

engine = PersonaCloneEngine()
client = OmniVoiceColabClient()

user_query = "Dadaji, what advice do you have for me today?"

# Stream LLM tokens -> Stream cloned voice audio chunks!
token_stream = engine.ask_stream(user_query)
for audio_chunk in client.stream_sentences(token_stream, speaker_name="dadaji"):
    # Send chunk to frontend over WebSocket or play locally
    pass
```
