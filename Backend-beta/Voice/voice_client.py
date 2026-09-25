"""
voice_client.py
Local Python client for Kin-ai-avatar to communicate with the Google Colab OmniVoice server.
Features:
- One-time VoiceClonePrompt registration and persistent caching.
- Zero-shot speech synthesis with reusable pre-computed voice prompts.
- Sub-second sentence-by-sentence streaming for long texts and LLM token streams.
"""

import os
import io
import re
import json
import base64
import requests
from pathlib import Path
from typing import Generator, Optional, Dict, Any

# Load environment variables from Backend/.env if available
try:
    from dotenv import load_dotenv, dotenv_values
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
except ImportError:
    pass


class OmniVoiceColabClient:
    def __init__(self, colab_url: Optional[str] = None):
        """
        :param colab_url: Public URL from your Google Colab or Kaggle notebook (ngrok or cloudflare tunnel).
        """
        self.headers = {
            "ngrok-skip-browser-warning": "true",
            "User-Agent": "KinVoiceClient/1.0"
        }
        self.colab_url = ""
        if colab_url:
            self.colab_url = colab_url.strip().rstrip("/")
        else:
            self._resolve_url()

    def _resolve_url(self) -> str:
        """Dynamically re-reads URL from Backend/.env if not explicitly pinned."""
        env_p = Path(__file__).resolve().parent.parent / ".env"
        if env_p.exists():
            try:
                env_vals = dotenv_values(env_p)
                url = (
                    env_vals.get("KAGGLE_VOICE_URL")
                    or env_vals.get("COLAB_VOICE_URL")
                    or env_vals.get("KAGGLE_SERVER_URL")
                    or env_vals.get("COLAB_SERVER_URL")
                    or os.getenv("KAGGLE_VOICE_URL", "")
                    or os.getenv("COLAB_VOICE_URL", "")
                    or os.getenv("KAGGLE_SERVER_URL", "")
                    or os.getenv("COLAB_SERVER_URL", "")
                )
                if url and url.strip():
                    self.colab_url = url.strip().rstrip("/")
            except Exception:
                pass
        return self.colab_url

    def set_url(self, url: str):
        self.colab_url = url.strip().rstrip("/")

    def check_health(self) -> Dict[str, Any]:
        """Verifies connection to the Colab/Kaggle GPU server and lists cached voice prompts."""
        self._resolve_url()
        if not self.colab_url:
            return {"status": "error", "message": "Colab/Kaggle Voice URL is not configured in .env."}
        try:
            r = requests.get(f"{self.colab_url}/health", headers=self.headers, timeout=8)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def register_voice_sample(
        self,
        speaker_name: str,
        audio_path: str,
        ref_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Uploads a 3-20 second audio sample to Google Colab.
        OmniVoice extracts and caches the VoiceClonePrompt (.pt) on the server.
        Subsequent synthesis will reuse this cached prompt with ZERO audio re-processing!
        """
        path = Path(audio_path)
        if not path.exists():
            raise FileNotFoundError(f"Reference audio file not found: {audio_path}")

        self._resolve_url()
        if not self.colab_url:
            raise ConnectionError("Colab/Kaggle Voice URL is not configured in .env.")

        url = f"{self.colab_url}/register_voice"
        clean_speaker = re.sub(r'[^a-zA-Z0-9_-]', '_', speaker_name.strip()) or "default"

        with open(path, "rb") as f:
            files = {"file": (path.name, f, "audio/wav")}
            data = {"name": clean_speaker}
            if ref_text:
                data["ref_text"] = ref_text

            resp = requests.post(url, data=data, files=files, headers=self.headers, timeout=60)
            resp.raise_for_status()
            return resp.json()

    def synthesize(self, text: str, speaker_name: str = "default", num_step: int = 16) -> bytes:
        """
        Full text speech synthesis using the cached VoiceClonePrompt.
        Returns raw WAV bytes.
        """
        self._resolve_url()
        if not self.colab_url:
            raise ConnectionError("Colab/Kaggle Voice URL is not configured in .env.")

        url = f"{self.colab_url}/synthesize"
        payload = {
            "text": text.strip(),
            "speaker_name": speaker_name,
            "num_step": num_step
        }
        resp = requests.post(url, json=payload, headers=self.headers, timeout=45)
        resp.raise_for_status()
        return resp.content

    def synthesize_to_file(
        self,
        text: str,
        output_path: str,
        speaker_name: str = "default",
        num_step: int = 16
    ) -> str:
        """Synthesizes text and saves it directly to a local WAV file."""
        wav_bytes = self.synthesize(text, speaker_name=speaker_name, num_step=num_step)
        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        with open(out, "wb") as f:
            f.write(wav_bytes)
        return str(out)

    def synthesize_stream(
        self,
        text: str,
        speaker_name: str = "default",
        num_step: int = 16
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Streams audio chunks sentence-by-sentence in real time.
        num_step=16 delivers ultra-low latency real-time streaming.
        Yields dictionaries with:
          - chunk_index: int
          - text: sentence clause text
          - audio_bytes: decoded raw WAV bytes for this sentence
          - is_last: bool
        """
        url = f"{self.colab_url}/synthesize_stream"
        payload = {
            "text": text.strip(),
            "speaker_name": speaker_name,
            "num_step": num_step
        }

        with requests.post(url, json=payload, stream=True, timeout=90) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if line:
                    chunk_data = json.loads(line.decode("utf-8"))
                    if "audio_base64" in chunk_data:
                        chunk_data["audio_bytes"] = base64.b64decode(chunk_data["audio_base64"])
                    yield chunk_data

    def stream_sentences(
        self,
        token_generator: Generator[str, None, None],
        speaker_name: str = "default"
    ) -> Generator[bytes, None, None]:
        """
        Takes a streaming token generator (e.g. from Clonellm engine.ask_stream()),
        accumulates text into complete clauses/sentences, and yields WAV bytes
        as each sentence completes for sub-second memorial presence dialogue.
        """
        sentence_endings = re.compile(r'([.!?;:\n]+)')
        buffer = ""

        for token in token_generator:
            buffer += token
            parts = sentence_endings.split(buffer)
            if len(parts) > 2:
                complete_sentence = parts[0] + parts[1]
                buffer = "".join(parts[2:])

                if complete_sentence.strip():
                    try:
                        audio_bytes = self.synthesize(
                            text=complete_sentence.strip(),
                            speaker_name=speaker_name
                        )
                        yield audio_bytes
                    except Exception as e:
                        print(f"[Streaming Voice Error] {e}")

        # Flush any remaining buffer text
        if buffer.strip():
            try:
                audio_bytes = self.synthesize(
                    text=buffer.strip(),
                    speaker_name=speaker_name
                )
                yield audio_bytes
            except Exception as e:
                print(f"[Streaming Voice Error] {e}")


# Backwards compatibility alias
ColabVoiceClient = OmniVoiceColabClient


if __name__ == "__main__":
    client = OmniVoiceColabClient()
    print("Colab Health Check:", client.check_health())
