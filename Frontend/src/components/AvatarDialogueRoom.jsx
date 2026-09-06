import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Mic,
  Volume2,
  MessageSquare,
  Sparkles,
  X,
  Send,
  ShieldCheck,
  Video,
  VideoOff,
  MicOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Maximize,
  Minimize,
  Radio,
  Settings,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import {
  fetchBackendStatus,
  updateColabUrl,
  streamChat,
  transcribeAudioBlob,
  AudioQueuePlayer,
} from '../services/api';
import grandfatherImg from '../assets/grandfather.jpg';
import grandmotherImg from '../assets/grandmother.jpg';
import './AvatarDialogueRoom.css';

export default function AvatarDialogueRoom({ avatar, autoStartVideo = false, onBackToVault }) {
  const callingName = avatar?.callingName || avatar?.name?.split(' ')[0] || 'Dadaji';

  // Authentic avatar image resolution (replaces mock Unsplash URLs)
  const getAvatarPhoto = (av) => {
    if (!av?.photoUrl || av.photoUrl.includes('unsplash.com')) {
      if (av?.id === 'maya-mother' || av?.relation === 'Mother' || av?.name?.includes('Maya')) {
        return grandmotherImg;
      }
      return grandfatherImg;
    }
    return av.photoUrl;
  };
  const avatarImgSrc = getAvatarPhoto(avatar);
  const catchphrase =
    avatar?.catchphrases && avatar.catchphrases.length > 0
      ? avatar.catchphrases[0]
      : 'Take things one step at a time, you have the strength for this.';
  const initialGreeting = `“Namaste beta. It is so good to be with you today. Always remember: ${catchphrase} What is on your mind?”`;
  const callGreeting = `“Namaste beta! I can see and hear you clearly. What would you like to talk about today?”`;

  // Interaction State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      id: 1,
      sender: 'avatar',
      text: autoStartVideo ? callGreeting : initialGreeting,
      timestamp: 'Just now',
      citation: 'Synthesized from voice profile & memory vault',
    },
  ]);
  const [textInput, setTextInput] = useState('');
  const [activeSpeechText, setActiveSpeechText] = useState(autoStartVideo ? callGreeting : initialGreeting);
  const [audioAmplitude, setAudioAmplitude] = useState(0);
  const [talkingVideoUrl, setTalkingVideoUrl] = useState(null);

  // Video Call Mode State
  const [isVideoCallActive, setIsVideoCallActive] = useState(autoStartVideo);
  const [avatarFitMode, setAvatarFitMode] = useState('cover'); // 'cover' | 'contain'
  const [isUserMuted, setIsUserMuted] = useState(false);
  const [isUserVideoEnabled, setIsUserVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Colab GPU Connection & Settings
  const [colabStatus, setColabStatus] = useState({ connected: false, url: '', gpu_name: 'None' });
  const [showColabModal, setShowColabModal] = useState(false);
  const [colabInputUrl, setColabInputUrl] = useState('');
  const [isTestingUrl, setIsTestingUrl] = useState(false);

  const [micLevel, setMicLevel] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const chatBottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const transcriptRef = useRef('');
  const silenceTimerRef = useRef(null);
  const isListeningRef = useRef(false);
  const hasSpokenRef = useRef(false);

  // Initialize Web Audio Queue Manager & fetch Backend / Colab status
  useEffect(() => {
    audioPlayerRef.current = new AudioQueuePlayer({
      onSpeakingStart: () => setIsSpeaking(true),
      onSpeakingEnd: () => {
        setIsSpeaking(false);
        setTalkingVideoUrl(null);
      },
      onAmplitude: (amp) => setAudioAmplitude(amp),
    });

    const checkStatus = () => {
      fetchBackendStatus().then((res) => {
        if (res && res.colab) {
          setColabStatus(res.colab);
          setColabInputUrl(res.colab.url || '');
        }
      });
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);

    return () => {
      clearInterval(interval);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.stop();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Start Video Call
  const handleStartVideoCall = () => {
    setIsVideoCallActive(true);
    setActiveSpeechText(callGreeting);
    setIsSpeaking(true);
    setTimeout(() => {
      setIsSpeaking(false);
    }, 3500);
  };

  const handleEndVideoCall = () => {
    setIsVideoCallActive(false);
    setCallDuration(0);
    setIsSpeaking(false);
    setIsListening(false);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
    }
  };

  // Video call timer tracking
  useEffect(() => {
    if (!isVideoCallActive) return;
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isVideoCallActive]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatOpen]);

  // Handle saving new Colab URL from UI
  const handleSaveColabUrl = async () => {
    if (!colabInputUrl.trim()) return;
    setIsTestingUrl(true);
    try {
      const res = await updateColabUrl(colabInputUrl.trim());
      if (res && res.colab_health) {
        setColabStatus({
          connected: res.colab_health.status in ['healthy', 'degraded'],
          url: res.url,
          gpu_name: res.colab_health.gpu_name || 'Tesla T4',
        });
      }
      setShowColabModal(false);
    } catch (err) {
      alert(`Could not connect to Colab URL: ${err.message}`);
    } finally {
      setIsTestingUrl(false);
    }
  };

  // Web Speech API + MediaRecorder Hybrid Voice Input
  const stopListeningAndSubmit = async () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    setIsListening(false);
    isListeningRef.current = false;
    setMicLevel(0);

    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      setIsTranscribing(true);
      setActiveSpeechText('Processing your voice...');

      // Stop recorder and wait for final audio chunk to be pushed
      await new Promise((resolve) => {
        mr.onstop = resolve;
        try {
          mr.stop();
        } catch (e) {
          resolve();
        }
      });
      setIsTranscribing(false);
    }

    // Release microphone hardware
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    // Resolve final transcript
    let finalQuery = transcriptRef.current.trim();

    // If WebSpeech was empty or dropped, use Groq Whisper on the recorded audio blob!
    if (!finalQuery && audioChunksRef.current.length > 0) {
      const mime = mr?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mime });
      if (audioBlob.size > 800) {
        setActiveSpeechText('Transcribing speech with Groq Whisper...');
        const whisperText = await transcribeAudioBlob(audioBlob);
        if (whisperText && whisperText.trim()) {
          finalQuery = whisperText.trim();
        }
      }
    }

    audioChunksRef.current = [];
    transcriptRef.current = '';
    setSpeechTranscript('');

    if (finalQuery) {
      if (isVideoCallActive) {
        handleAskQuestion(finalQuery, { mode: 'video', source: 'mic' });
      } else {
        handleAskQuestion(finalQuery, { mode: 'voice', source: 'mic' });
      }
    } else {
      setActiveSpeechText(`“Namaste beta. Tap the mic or type in the chat to speak with me.”`);
    }
  };

  const handleMicClick = async () => {
    if (isListeningRef.current || isListening) {
      await stopListeningAndSubmit();
      return;
    }

    // If avatar is currently speaking, stop audio so mic doesn't pick up speaker feedback
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
    }
    setIsSpeaking(false);
    setTalkingVideoUrl(null);

    try {
      // 1. Request real microphone access directly from browser hardware
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      transcriptRef.current = '';
      hasSpokenRef.current = false;
      setSpeechTranscript('');
      setIsListening(true);
      isListeningRef.current = true;

      // 2. Setup audio volume analyzer for live visual pulsing & silence detection
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const actx = new AudioCtx();
          audioContextRef.current = actx;
          const src = actx.createMediaStreamSource(stream);
          const analyser = actx.createAnalyser();
          analyser.fftSize = 256;
          src.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let silenceStart = null;

          const checkAudioLevel = () => {
            if (!isListeningRef.current) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalized = Math.min(1, avg / 55);
            setMicLevel(normalized);

            // Detect speech activity
            if (normalized > 0.12) {
              hasSpokenRef.current = true;
              silenceStart = null;
            } else if (hasSpokenRef.current) {
              if (!silenceStart) {
                silenceStart = Date.now();
              } else if (Date.now() - silenceStart > 1200) {
                // User spoke and paused for 1.2 seconds -> auto submit immediately!
                stopListeningAndSubmit();
                return;
              }
            }

            animFrameRef.current = requestAnimationFrame(checkAudioLevel);
          };
          animFrameRef.current = requestAnimationFrame(checkAudioLevel);
        }
      } catch (audioErr) {
        console.warn('[AudioContext Analyser]', audioErr);
      }

      // 3. Setup MediaRecorder (Never aborts after a split second)
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/ogg')
          ? 'audio/ogg'
          : '';
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(250);

      // 4. Concurrently run Web Speech API for real-time subtitle preview
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.lang = navigator.language && navigator.language.startsWith('en') ? navigator.language : 'en-IN';
          rec.continuous = true;
          rec.interimResults = true;

          rec.onresult = (event) => {
            let t = '';
            for (let i = 0; i < event.results.length; i++) {
              t += event.results[i][0].transcript;
            }
            if (t.trim()) {
              transcriptRef.current = t.trim();
              setSpeechTranscript(t.trim());
              hasSpokenRef.current = true;
            }
          };

          rec.onerror = (e) => {
            // Non-fatal; MediaRecorder is recording actual audio in background
            console.log('[WebSpeech interim notice]', e.error);
          };

          rec.onend = () => {
            // If user is still recording, DO NOT exit isListening!
            // MediaRecorder is continuing to record user's audio smoothly
          };

          recognitionRef.current = rec;
          rec.start();
        } catch (speechErr) {
          console.log('[WebSpeech init notice, using Whisper]', speechErr);
        }
      }
    } catch (err) {
      console.error('[Microphone Access Error]:', err);
      setIsListening(false);
      isListeningRef.current = false;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert('Microphone access was denied. Please allow microphone permissions in your browser address bar.');
      } else {
        alert(`Could not start microphone: ${err.message}. You can also type in the text chat!`);
      }
    }
  };

  // Main Conversational Turn Handler (3 Distinct Modes):
  // 1. 'chat' : Text only (No audio, No video)
  // 2. 'voice': Audio only (OmniVoice cloned speech, No video)
  // 3. 'video': Full Live Video Call (Audio + MuseTalk live talking video)
  const handleAskQuestion = async (questionText, options = {}) => {
    const q = (questionText || textInput || speechTranscript).trim();
    if (!q) return;

    let mode = options.mode;
    if (!mode) {
      if (isVideoCallActive) {
        mode = 'video';
      } else if (options.source === 'mic' || (!textInput && speechTranscript)) {
        mode = 'voice';
      } else {
        mode = 'chat';
      }
    }

    const isChatMode = mode === 'chat';
    const isVoiceMode = mode === 'voice';
    const isVideoMode = mode === 'video';

    setTextInput('');
    setSpeechTranscript('');

    if (!isChatMode) {
      setIsSpeaking(true);
    }

    const userMsgId = Date.now();
    const avatarMsgId = userMsgId + 1;

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: q,
        timestamp: 'Just now',
      },
      {
        id: avatarMsgId,
        sender: 'avatar',
        text: '',
        timestamp: 'Just now',
        citation: isChatMode ? 'Archival memories' : 'Consulting memory vault...',
      },
    ]);

    if (!isChatMode) {
      setActiveSpeechText('Thinking...');
    }

    let accumulatedText = '';

    await streamChat(q, {
      avatarId: 'dadaji',
      speakerName: 'default',
      streamMedia: !isChatMode,
      generateVideo: isVideoMode,
      onToken: (token) => {
        accumulatedText += token;
        if (!isChatMode) {
          setActiveSpeechText(accumulatedText);
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === avatarMsgId ? { ...m, text: accumulatedText } : m))
        );
      },
      onMediaChunk: (payload) => {
        if (isChatMode) return;

        // 1. Enqueue cloned voice audio (Voice & Video mode)
        if (payload.audio_base64 && audioPlayerRef.current) {
          audioPlayerRef.current.enqueueBase64(payload.audio_base64);
        }

        // 2. Play MuseTalk lip-sync video (ONLY in Live Video Call mode)
        if (isVideoMode) {
          if (payload.video_url) {
            setTalkingVideoUrl(payload.video_url);
          } else if (payload.video_base64) {
            try {
              const binary = atob(payload.video_base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const blob = new Blob([bytes], { type: 'video/mp4' });
              const videoUrl = URL.createObjectURL(blob);
              setTalkingVideoUrl(videoUrl);
            } catch (e) {
              console.warn('Video chunk decode error:', e);
            }
          }
        }
      },
      onDone: (payload) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === avatarMsgId
              ? {
                  ...m,
                  citation:
                    payload.citation ||
                    (isChatMode
                      ? 'Archival memory'
                      : 'Synthesized from authentic voice profile & personal memories'),
                }
              : m
          )
        );
      },
      onError: (err) => {
        console.warn('Backend stream error:', err);
        if (isChatMode) return;
        const fallbackText =
          accumulatedText ||
          "I hear you, beta. Take a quiet breath and remember that things have a way of working out.";
        setActiveSpeechText(fallbackText);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === avatarMsgId
              ? { ...m, text: fallbackText, citation: 'Local offline presence' }
              : m
          )
        );
        if ('speechSynthesis' in window) {
          const ut = new SpeechSynthesisUtterance(fallbackText);
          ut.onend = () => setIsSpeaking(false);
          window.speechSynthesis.speak(ut);
        } else {
          setTimeout(() => setIsSpeaking(false), 3500);
        }
      },
    });
  };

  const sampleQuestions = avatar.sampleQuestions || [
    `“${callingName}, what advice would you give me today?”`,
    `“Tell me a story from your youth.”`,
    `“I miss you. How do I stay strong on heavy days?”`,
  ];

  if (!avatar) return null;

  return (
    <div className="room-root-container">
      {/* ----------------------------------------------------------------------
          FULLSCREEN LIVE VIDEO CALL OVERLAY
          ---------------------------------------------------------------------- */}
      <AnimatePresence>
        {isVideoCallActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className={`vcall-fullscreen-overlay ${isFullscreen ? 'native-fullscreen' : ''}`}
          >
            {/* Top Video Header - Minimalist (Chat + Exit buttons only) */}
            <div className="vcall-top-header" style={{ justifyContent: 'flex-end' }}>
              <div className="vcall-window-controls">
                <button
                  onClick={() => setChatOpen(!chatOpen)}
                  className={`vcall-head-btn ${chatOpen ? 'active' : ''}`}
                  title={chatOpen ? 'Close Chat' : 'Open Text Chat'}
                >
                  <MessageSquare size={16} />
                  <span>{chatOpen ? 'Hide Chat' : 'Chat'}</span>
                  {messages.length > 1 && <span className="vcall-unread-dot" />}
                </button>

                <button
                  onClick={handleEndVideoCall}
                  className="vcall-exit-btn"
                  title="Leave Video Call"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Central Video Stream Screen */}
            <div className="vcall-cinematic-stage">
              {/* Ambient Blurred Aura Backdrop */}
              <div className="vcall-ambient-backdrop" aria-hidden="true">
                <img
                  src={avatarImgSrc}
                  alt=""
                  className="vcall-ambient-img"
                />
                <div className="vcall-ambient-overlay" />
              </div>

              {/* Centered Portrait Video Frame */}
              <div className={`vcall-portrait-frame ${isSpeaking ? 'speaking-active' : ''}`}>
                {/* Clear Authentic Portrait (At rest until video arrives) */}
                <img
                  src={avatarImgSrc}
                  alt={avatar?.name || 'Dadaji'}
                  className={`vcall-portrait-media ${avatarFitMode === 'contain' ? 'fit-contain' : 'fit-cover'}`}
                  style={{ zIndex: 0 }}
                />

                {/* Only plays when talking video arrives from neural engine */}
                {talkingVideoUrl && (
                  <video
                    key={talkingVideoUrl}
                    src={talkingVideoUrl}
                    autoPlay
                    muted
                    playsInline
                    onEnded={() => setTalkingVideoUrl(null)}
                    className={`vcall-portrait-media ${avatarFitMode === 'contain' ? 'fit-contain' : 'fit-cover'}`}
                    style={{ zIndex: 1 }}
                  />
                )}

                {/* Subtle Edge Vignette */}
                <div className="vcall-portrait-vignette" />

                {/* Portrait Header Bar (Fit toggle only) */}
                <div className="vcall-portrait-header-bar" style={{ justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setAvatarFitMode((m) => (m === 'cover' ? 'contain' : 'cover'))}
                    className="vcall-portrait-fit-toggle"
                  >
                    {avatarFitMode === 'cover' ? (
                      <>
                        <Minimize size={12} />
                        <span>Fit Photo</span>
                      </>
                    ) : (
                      <>
                        <Maximize size={12} />
                        <span>Fill Frame</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Listening Alert when user speaks */}
                {isListening && (
                  <div className="vcall-portrait-listening-pill">
                    <span className="listening-halo-pulse" />
                    <span>Listening: “{speechTranscript || 'Speak naturally...'}”</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Floating Video Call Control Dock */}
            <div className="vcall-bottom-control-dock">
              <button
                onClick={() => setIsUserMuted(!isUserMuted)}
                className={`vcall-dock-action-btn ${isUserMuted ? 'muted' : ''}`}
                title={isUserMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isUserMuted ? <MicOff size={20} /> : <Mic size={20} />}
                <span className="dock-action-text">{isUserMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              <button
                onClick={() => setIsUserVideoEnabled(!isUserVideoEnabled)}
                className={`vcall-dock-action-btn ${!isUserVideoEnabled ? 'muted' : ''}`}
                title={isUserVideoEnabled ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {isUserVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                <span className="dock-action-text">{isUserVideoEnabled ? 'Video On' : 'Video Off'}</span>
              </button>

              {/* Talk to Dadaji Microphone Button */}
              <button
                onClick={handleMicClick}
                className={`vcall-dock-talk-btn ${isListening ? 'talking' : ''}`}
                title="Tap to speak directly via microphone"
                style={{
                  boxShadow: isListening ? `0 0 ${15 + micLevel * 25}px rgba(16, 185, 129, 0.8)` : undefined,
                }}
              >
                <Mic size={22} />
                <span>
                  {isTranscribing
                    ? 'Transcribing voice...'
                    : isListening
                    ? speechTranscript
                      ? `“${speechTranscript.slice(0, 18)}...” (Tap Send)`
                      : 'Listening... (Tap Send)'
                    : `Talk to ${callingName}`}
                </span>
              </button>

              <button
                onClick={() => setChatOpen(!chatOpen)}
                className={`vcall-dock-action-btn ${chatOpen ? 'active' : ''}`}
                title="Toggle Text Chat"
              >
                <MessageSquare size={20} />
                <span className="dock-action-text">Chat</span>
              </button>

              <button
                onClick={handleEndVideoCall}
                className="vcall-dock-action-btn end-call"
                title="End Video Call"
              >
                <PhoneOff size={20} />
                <span className="dock-action-text">End Call</span>
              </button>
            </div>

            {/* In-Call Slide Chat Drawer */}
            <AnimatePresence>
              {chatOpen && (
                <motion.aside
                  initial={{ opacity: 0, x: 360 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 360 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="vcall-slide-chat-drawer"
                >
                  <div className="drawer-header dark-vcall-header">
                    <div className="drawer-title-group">
                      <MessageSquare size={16} />
                      <h3>Call Dialogue with {callingName}</h3>
                    </div>
                    <button
                      onClick={() => setChatOpen(false)}
                      className="drawer-close-btn text-white"
                      aria-label="Close chat"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="drawer-messages-stream dark-vcall-stream">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`drawer-msg-row ${m.sender === 'user' ? 'user-msg' : 'avatar-msg'}`}
                      >
                        {m.sender === 'avatar' && (
                          <div className="msg-avatar-tag">
                            <Volume2 size={12} />
                            <span>{callingName}</span>
                          </div>
                        )}
                        <p className="msg-content">{m.text}</p>
                        {m.citation && (
                          <div className="msg-citation">
                            <ShieldCheck size={11} className="text-emerald-400" />
                            <span>{m.citation}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>

                  <div className="drawer-input-bar dark-vcall-input-bar">
                    <input
                      type="text"
                      placeholder={`Send a message to ${callingName}...`}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAskQuestion(undefined, { mode: 'chat' });
                      }}
                      className="drawer-text-input dark-input"
                    />
                    <button
                      onClick={() => handleAskQuestion(undefined, { mode: 'chat' })}
                      disabled={!textInput.trim()}
                      className="drawer-send-btn"
                      aria-label="Send"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------------------------
          STANDARD ROOM OVERVIEW VIEWPORT
          ---------------------------------------------------------------------- */}
      <header className="room-navbar">
        <div className="room-nav-left">
          <button onClick={onBackToVault} className="room-back-btn">
            <ArrowLeft size={16} />
            <span>Family Vault</span>
          </button>

          <div className="room-nav-divider" />

          <div className="room-persona-title-group">
            <h2 className="room-persona-name">{avatar.name}</h2>
            <span className="room-relation-pill">
              {avatar.callingName ? `“${avatar.callingName}”` : ''} • {avatar.relation || 'Loved One'}
            </span>
          </div>
        </div>

        <div className="room-nav-center">
          <div className="room-live-indicator">
            <span className={`live-pulse-dot ${isSpeaking ? 'speaking' : ''}`} />
            <span>{isSpeaking ? 'Speaking in Cloned Voice...' : 'Listening & Present'}</span>
          </div>
        </div>

        <div className="room-nav-right">
          {/* Colab Connection Status Pill */}
          <button
            onClick={() => setShowColabModal(true)}
            className={`colab-status-badge ${colabStatus.connected ? 'connected' : ''}`}
            title="Configure Google Colab Tunnel URL"
          >
            <span className="status-dot" />
            <span>{colabStatus.connected ? `GPU (${colabStatus.gpu_name})` : 'Configure Colab URL'}</span>
            <Settings size={12} />
          </button>

          <button
            onClick={handleStartVideoCall}
            className="room-vcall-launch-btn"
            title="Start live video call with avatar"
          >
            <Video size={15} />
            <span>Start Live Video Call</span>
          </button>

          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`room-chat-toggle-btn ${chatOpen ? 'active' : ''}`}
            title="Toggle text conversation"
          >
            <MessageSquare size={15} />
            <span>{chatOpen ? 'Hide Chat' : 'Open Text Chat'}</span>
            {messages.length > 1 && <span className="chat-count-bubble">{messages.length}</span>}
          </button>
        </div>
      </header>

      {/* Master Interaction Stage */}
      <main className="room-stage-viewport">
        <div className="room-presence-center">
          {/* Main Visual Avatar Frame */}
          <div className="avatar-monument-frame">
            <div className={`avatar-aura-glow ${isSpeaking ? 'speaking-glow' : ''}`} />

            <div className="avatar-portrait-circle-wrap">
              {/* Clear portrait at rest */}
              <img
                src={avatarImgSrc}
                alt={avatar?.name || 'Dadaji'}
                className={`avatar-speaking-img ${isSpeaking ? 'talking' : ''}`}
                style={{ objectFit: 'cover' }}
              />

              {/* Only plays when talking video arrives */}
              {talkingVideoUrl && (
                <video
                  key={talkingVideoUrl}
                  src={talkingVideoUrl}
                  autoPlay
                  muted
                  playsInline
                  onEnded={() => setTalkingVideoUrl(null)}
                  className="avatar-speaking-img talking"
                  style={{ objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 1 }}
                />
              )}
            </div>

            {/* Speaking Audio Waveform Bar */}
            <div className={`avatar-wave-dock ${isSpeaking ? 'active' : ''}`}>
              <div className="dock-wave-bars">
                {[35, 75, 50, 95, 60, 40, 85, 45, 100, 70, 50, 90, 65, 40, 80, 55].map((h, i) => (
                  <span
                    key={i}
                    className={`dock-bar ${isSpeaking ? 'animated' : ''}`}
                    style={{
                      height: isSpeaking ? `${Math.max(20, h * (audioAmplitude || 0.8))}%` : '20%',
                      animationDelay: `${(i % 6) * 0.1}s`,
                    }}
                  />
                ))}
              </div>
              <span className="dock-voice-tag">
                <Volume2 size={13} className="text-emerald-500" />
                <span>OmniVoice 24kHz Cloned Audio</span>
              </span>
            </div>
          </div>

          {/* Direct Video Call Launcher Callout */}
          <div className="room-vcall-banner-strip">
            <button onClick={handleStartVideoCall} className="vcall-prominent-banner-btn">
              <Video size={17} />
              <span>Enter Fullscreen Video Call with {callingName}</span>
              <Sparkles size={14} className="text-amber-300" />
            </button>
          </div>

          {/* Subtitle / Active Speech Speechbubble */}
          {activeSpeechText && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={activeSpeechText}
              className="active-speech-subtitle"
            >
              <p>{activeSpeechText}</p>
            </motion.div>
          )}

          {/* Primary Voice Action Button (Speak Directly) */}
          <div className="voice-mic-interaction-hub">
            <button
              onClick={handleMicClick}
              className={`giant-mic-btn ${isListening ? 'listening' : ''}`}
              aria-label="Speak using microphone"
              style={{
                transform: isListening ? `scale(${1 + micLevel * 0.15})` : 'scale(1)',
                boxShadow: isListening ? `0 0 ${20 + micLevel * 30}px rgba(16, 185, 129, 0.8)` : undefined,
              }}
            >
              <Mic size={28} />
              {isListening && <span className="mic-halo-ring" />}
            </button>
            <span className="mic-caption-label">
              {isTranscribing
                ? 'Processing voice with Groq Whisper...'
                : isListening
                ? `Listening: “${speechTranscript || 'Speak now... (Tap to Send)'}”`
                : `Tap to talk with ${callingName}`}
            </span>
          </div>

          {/* Quick Prompts Carousel */}
          <div className="room-quick-prompts">
            <span className="prompts-title">
              <Sparkles size={13} />
              <span>Suggested topics for {callingName}:</span>
            </span>
            <div className="prompts-row">
              {sampleQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskQuestion(q, { mode: 'chat' })}
                  className="room-prompt-pill"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Slide-in Text Chat Drawer */}
        <AnimatePresence>
          {chatOpen && !isVideoCallActive && (
            <motion.aside
              initial={{ opacity: 0, x: 340 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 340 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="room-chat-drawer"
            >
              <div className="drawer-header">
                <div className="drawer-title-group">
                  <MessageSquare size={16} />
                  <h3>Chat History with {callingName}</h3>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="drawer-close-btn"
                  aria-label="Close chat"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="drawer-messages-stream">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`drawer-msg-row ${m.sender === 'user' ? 'user-msg' : 'avatar-msg'}`}
                  >
                    {m.sender === 'avatar' && (
                      <div className="msg-avatar-tag">
                        <Volume2 size={12} />
                        <span>{callingName}</span>
                      </div>
                    )}
                    <p className="msg-content">{m.text}</p>
                    {m.citation && (
                      <div className="msg-citation">
                        <ShieldCheck size={11} className="text-emerald-600" />
                        <span>{m.citation}</span>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              <div className="drawer-input-bar">
                <input
                  type="text"
                  placeholder={`Send a message to ${callingName}...`}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAskQuestion(undefined, { mode: 'chat' });
                  }}
                  className="drawer-text-input"
                />
                <button
                  onClick={() => handleAskQuestion(undefined, { mode: 'chat' })}
                  disabled={!textInput.trim()}
                  className="drawer-send-btn"
                  aria-label="Send"
                >
                  <Send size={15} />
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>

      {/* ----------------------------------------------------------------------
          COLAB GPU URL CONFIGURATION MODAL
          ---------------------------------------------------------------------- */}
      <AnimatePresence>
        {showColabModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="colab-modal-backdrop"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="colab-modal-card"
            >
              <h3 className="colab-modal-title">Google Colab Tunnel URL</h3>
              <p className="colab-modal-desc">
                Paste the single public URL generated by{' '}
                <code>Backend/kin_avatar_unified_colab.ipynb</code>. Both OmniVoice and MuseTalk
                connect to this link.
              </p>

              <input
                type="text"
                value={colabInputUrl}
                onChange={(e) => setColabInputUrl(e.target.value)}
                placeholder="https://xxxx.trycloudflare.com"
                className="colab-modal-input"
              />

              <div className="colab-modal-actions">
                <button
                  onClick={() => setShowColabModal(false)}
                  className="colab-btn-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveColabUrl}
                  disabled={isTestingUrl || !colabInputUrl.trim()}
                  className="colab-btn-save"
                >
                  {isTestingUrl ? 'Connecting...' : 'Save & Connect'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
