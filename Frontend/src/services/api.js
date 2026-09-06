/**
 * api.js - Frontend API Service & Real-Time Audio Queue Manager
 * Connects React UI to the local Kin-AI-Avatar Backend Orchestrator (Port 8008)
 */

// 1. Backend Status & Config
export async function fetchBackendStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      status: 'offline',
      persona: { name: 'Dadaji', ready: false },
      colab: { connected: false, url: '', gpu_name: 'None' },
      error: err.message,
    };
  }
}

export async function updateColabUrl(url) {
  const res = await fetch('/api/config/colab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Failed to update URL: ${res.statusText}`);
  return await res.json();
}

export async function resetMemory() {
  try {
    await fetch('/api/memory/reset', { method: 'POST' });
  } catch (e) {
    console.warn('Could not reset memory:', e);
  }
}

// 2. High-Accuracy Whisper Speech-to-Text
export async function transcribeAudioBlob(audioBlob) {
  try {
    const formData = new FormData();
    const ext = audioBlob.type.includes('ogg') ? 'ogg' : audioBlob.type.includes('wav') ? 'wav' : 'webm';
    formData.append('file', audioBlob, `speech.${ext}`);

    const res = await fetch('/api/stt', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`STT HTTP ${res.status}`);
    const data = await res.json();
    return data.text || '';
  } catch (err) {
    console.warn('[STT Service Error]:', err);
    return '';
  }
}

// 2. Real-Time Conversational SSE Stream
export async function streamChat(message, {
  avatarId = 'dadaji',
  speakerName = 'default',
  streamMedia = true,
  generateVideo = false,
  onToken = () => {},
  onMediaChunk = () => {},
  onDone = () => {},
  onError = () => {},
}) {
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        avatar_id: avatarId,
        speaker_name: speakerName,
        stream_media: streamMedia,
        generate_video: generateVideo,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        if (!block.trim()) continue;

        const lines = block.split('\n');
        let event = 'message';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            event = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            dataStr = line.slice(6);
          }
        }

        if (!dataStr) continue;

        try {
          const payload = JSON.parse(dataStr);
          if (event === 'text_chunk') {
            onToken(payload.token);
          } else if (event === 'media_chunk') {
            onMediaChunk(payload);
          } else if (event === 'done') {
            onDone(payload);
          } else if (event === 'error') {
            onError(new Error(payload.error || 'Stream error'));
          }
        } catch (e) {
          console.warn('[Stream parse error]', e, dataStr);
        }
      }
    }
  } catch (err) {
    onError(err);
  }
}

// 3. Web Audio API Seamless Chunk Queue Player
export class AudioQueuePlayer {
  constructor({ onSpeakingStart, onSpeakingEnd, onAmplitude } = {}) {
    this.audioCtx = null;
    this.queue = [];
    this.isPlaying = false;
    this.currentSource = null;
    this.analyser = null;
    this.animFrameId = null;

    this.onSpeakingStart = onSpeakingStart || (() => {});
    this.onSpeakingEnd = onSpeakingEnd || (() => {});
    this.onAmplitude = onAmplitude || (() => {});
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  enqueueBase64(base64Wav, onChunkPlayed) {
    this.initContext();
    const binary = atob(base64Wav);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    this.queue.push({ bufferBytes: bytes.buffer, onChunkPlayed });
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.stopAnalyser();
      this.onSpeakingEnd();
      return;
    }

    this.isPlaying = true;
    this.onSpeakingStart();
    this.startAnalyser();

    const item = this.queue.shift();
    try {
      const audioBuffer = await this.audioCtx.decodeAudioData(item.bufferBytes);
      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;

      source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      source.onended = () => {
        if (item.onChunkPlayed) item.onChunkPlayed();
        this.playNext();
      };

      this.currentSource = source;
      source.start();
    } catch (err) {
      console.warn('[Audio decode error, skipping chunk]', err);
      this.playNext();
    }
  }

  startAnalyser() {
    if (!this.analyser || this.animFrameId) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const checkVolume = () => {
      if (!this.isPlaying) return;
      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      this.onAmplitude(avg / 255); // 0.0 to 1.0
      this.animFrameId = requestAnimationFrame(checkVolume);
    };
    this.animFrameId = requestAnimationFrame(checkVolume);
  }

  stopAnalyser() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.onAmplitude(0);
  }

  stop() {
    this.queue = [];
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {}
      this.currentSource = null;
    }
    this.isPlaying = false;
    this.stopAnalyser();
    this.onSpeakingEnd();
  }
}
