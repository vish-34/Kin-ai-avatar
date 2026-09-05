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
} from 'lucide-react';
import './AvatarDialogueRoom.css';

export default function AvatarDialogueRoom({ avatar, autoStartVideo = false, onBackToVault }) {
  const callingName = avatar?.callingName || avatar?.name?.split(' ')[0] || 'Loved One';
  const catchphrase =
    avatar?.catchphrases && avatar.catchphrases.length > 0
      ? avatar.catchphrases[0]
      : 'Take things one step at a time, you have the strength for this.';
  const initialGreeting = `“Namaste beta. It is so good to be with you today. Always remember: ${catchphrase} What is on your mind?”`;
  const callGreeting = `“Namaste beta! I can see and hear you clearly. It brings such warmth to see your face. What would you like to talk about today?”`;

  const [isSpeaking, setIsSpeaking] = useState(autoStartVideo);
  const [isListening, setIsListening] = useState(false);
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

  // Video Call Mode State
  const [isVideoCallActive, setIsVideoCallActive] = useState(autoStartVideo);
  const [avatarFitMode, setAvatarFitMode] = useState('cover'); // 'cover' (natural portrait card fit) | 'contain' (full uncropped photo)
  const [isUserMuted, setIsUserMuted] = useState(false);
  const [isUserVideoEnabled, setIsUserVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const chatBottomRef = useRef(null);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Start Video Call with interactive audio greeting
  const handleStartVideoCall = () => {
    setIsVideoCallActive(true);
    setActiveSpeechText(callGreeting);
    setIsSpeaking(true);
    setTimeout(() => {
      setIsSpeaking(false);
    }, 4200);
  };

  const handleEndVideoCall = () => {
    setIsVideoCallActive(false);
    setCallDuration(0);
    setIsSpeaking(false);
    setIsListening(false);
  };

  // Handle initial voice speech timeout when auto-starting video call
  useEffect(() => {
    if (autoStartVideo) {
      const timer = setTimeout(() => {
        setIsSpeaking(false);
      }, 4200);
      return () => clearTimeout(timer);
    }
  }, [autoStartVideo]);

  // Video call timer tracking
  useEffect(() => {
    if (!isVideoCallActive) return;
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isVideoCallActive]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatOpen]);

  if (!avatar) return null;

  // Handle user sending text or speech question
  const handleAskQuestion = (questionText) => {
    const q = (questionText || textInput).trim();
    if (!q) return;

    setTextInput('');
    setIsSpeaking(true);

    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        sender: 'user',
        text: q,
        timestamp: 'Just now',
      },
    ]);

    // Contextual answer synthesis simulation
    let reply = `“You know, thinking about that reminds me of what I always told you: ${
      avatar.catchphrases && avatar.catchphrases[1] ? avatar.catchphrases[1] : 'Keep your head high and your heart gentle.'
    } You have good instincts, beta. Don't let momentary worries shake what you built.”`;

    let citation = 'Referenced from WhatsApp chat archives & personal memoirs';

    const lower = q.toLowerCase();
    if (lower.includes('advice') || lower.includes('stress') || lower.includes('hard') || lower.includes('overwhelm') || lower.includes('career')) {
      reply = `“Whenever things got heavy at work or life felt uncertain, I told myself: you don't control the weather, you only control your umbrella. Write down three things you can do today, take a quiet breath, and keep moving forward.”`;
      citation = 'Referenced from 1974 foundry notes & chat archive';
    } else if (lower.includes('miss') || lower.includes('love') || lower.includes('remember')) {
      reply = `“I'm right here in your heart and in how you carry yourself every single day. Look in the mirror—you carry my stubborn optimism and your mother's kind smile. Love doesn't end just because the form changes.”`;
      citation = 'Synthesized from voice note #14 & personal letters';
    } else if (lower.includes('story') || lower.includes('youth') || lower.includes('garden') || lower.includes('tea')) {
      reply = `“Haha! Did I ever tell you about the summer we planted that sapling in the back garden? You thought watering it three times an hour would make it grow by evening! Some things in life simply take time and quiet soil.”`;
      citation = 'Extracted from family lore & handwritten diary entry';
    }

    setActiveSpeechText(reply);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 2,
          sender: 'avatar',
          text: reply,
          timestamp: 'Just now',
          citation: citation,
        },
      ]);
      // Keep speaking animation for audio duration
      setTimeout(() => {
        setIsSpeaking(false);
      }, 4000);
    }, 1200);
  };

  // Simulate Mic voice input
  const handleMicClick = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      handleAskQuestion('What advice would you give me when life feels overwhelming?');
    }, 2400);
  };

  const sampleQuestions = avatar.sampleQuestions || [
    `“${callingName}, what advice would you give me today?”`,
    `“Tell me a story from your youth.”`,
    `“I miss you. How do I stay strong on heavy days?”`,
  ];

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
            {/* Top Video Header */}
            <div className="vcall-top-header">
              <div className="vcall-identity-pill">
                <span className="vcall-live-beacon" />
                <div className="vcall-name-group">
                  <h3 className="vcall-person-name">{avatar.name}</h3>
                  <span className="vcall-role-label">
                    {avatar.callingName ? `“${avatar.callingName}”` : ''} • {avatar.relation || 'Loved One'}
                  </span>
                </div>
              </div>

              <div className="vcall-timer-badge">
                <Radio size={13} className="text-rose-500 animate-pulse" />
                <span className="vcall-time-counter">{formatDuration(callDuration)}</span>
                <span className="vcall-hd-spec">1080p Neural Feed</span>
              </div>

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
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="vcall-head-btn"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
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
              {/* Ambient Blurred Aura Backdrop (Fills widescreen periphery subtly with warmth) */}
              <div className="vcall-ambient-backdrop" aria-hidden="true">
                <img
                  src={
                    avatar.photoUrl ||
                    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1200&auto=format&fit=crop&q=85'
                  }
                  alt=""
                  className="vcall-ambient-img"
                />
                <div className="vcall-ambient-overlay" />
              </div>

              {/* Centered Portrait Video Frame (3:4 ratio, natural video call perspective) */}
              <div className={`vcall-portrait-frame ${isSpeaking ? 'speaking-active' : ''}`}>
                <img
                  src={
                    avatar.photoUrl ||
                    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1200&auto=format&fit=crop&q=85'
                  }
                  alt={avatar.name}
                  className={`vcall-portrait-img ${avatarFitMode === 'contain' ? 'fit-contain' : 'fit-cover'}`}
                />

                {/* Subtle Edge Vignette */}
                <div className="vcall-portrait-vignette" />

                {/* Portrait Header Bar with Avatar Identity & Fit Toggle */}
                <div className="vcall-portrait-header-bar">
                  <div className="vcall-portrait-identity">
                    <span className={`portrait-live-dot ${isSpeaking ? 'speaking' : ''}`} />
                    <span className="portrait-person-name">{avatar.name}</span>
                    <span className="portrait-neural-hd">HD Live</span>
                  </div>

                  <button
                    onClick={() => setAvatarFitMode((m) => (m === 'cover' ? 'contain' : 'cover'))}
                    className="vcall-portrait-fit-toggle"
                    title={
                      avatarFitMode === 'cover'
                        ? 'Switch to uncropped photo view (Fit Entire Photo)'
                        : 'Switch to portrait card view (Fill Frame)'
                    }
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

                {/* Audio-Reactive Speaking Waveform Banner */}
                {isSpeaking && (
                  <div className="vcall-portrait-speaking-pill">
                    <div className="vcall-waveform-bars">
                      {[35, 80, 50, 95, 65, 40, 85, 55, 100, 75, 45, 90].map((h, i) => (
                        <span
                          key={i}
                          className="vcall-wave-bar animated"
                          style={{
                            height: `${h}%`,
                            animationDelay: `${(i % 5) * 0.12}s`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="vcall-wave-tag">
                      <Volume2 size={13} className="text-emerald-400" />
                      <span>{callingName} is speaking...</span>
                    </span>
                  </div>
                )}

                {/* Listening Alert when user speaks */}
                {isListening && (
                  <div className="vcall-portrait-listening-pill">
                    <span className="listening-halo-pulse" />
                    <span>Listening to your voice...</span>
                  </div>
                )}
              </div>

              {/* Real-time Subtitles at bottom of video stream */}
              {activeSpeechText && (
                <motion.div
                  key={activeSpeechText}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="vcall-cinematic-subtitles"
                >
                  <p>{activeSpeechText}</p>
                </motion.div>
              )}

              {/* Picture-in-Picture (PiP) Window (User Webcam view) */}
              <div className="vcall-self-pip-card">
                <div className="pip-screen">
                  {isUserVideoEnabled ? (
                    <div className="pip-video-on">
                      <div className="pip-avatar-circle">YOU</div>
                      <span className="pip-cam-label">Camera Active</span>
                    </div>
                  ) : (
                    <div className="pip-video-off">
                      <VideoOff size={22} className="text-zinc-500" />
                      <span className="pip-cam-label">Camera Muted</span>
                    </div>
                  )}
                </div>
                <div className="pip-bottom-bar">
                  <span>You {isUserMuted ? '(Muted)' : ''}</span>
                  {isUserMuted && <MicOff size={12} className="text-rose-400" />}
                </div>
              </div>

              {/* Interactive Conversation Prompt Chips */}
              <div className="vcall-quick-prompts-bar">
                <span className="vcall-prompts-label">
                  <Sparkles size={13} className="text-amber-400" />
                  <span>Ask {callingName}:</span>
                </span>
                <div className="vcall-prompts-scroller">
                  {sampleQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAskQuestion(q)}
                      className="vcall-prompt-chip"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Floating Video Call Control Dock */}
            <div className="vcall-bottom-control-dock">
              {/* Mic Toggle */}
              <button
                onClick={() => setIsUserMuted(!isUserMuted)}
                className={`vcall-dock-action-btn ${isUserMuted ? 'muted' : ''}`}
                title={isUserMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isUserMuted ? <MicOff size={20} /> : <Mic size={20} />}
                <span className="dock-action-text">{isUserMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              {/* Camera Toggle */}
              <button
                onClick={() => setIsUserVideoEnabled(!isUserVideoEnabled)}
                className={`vcall-dock-action-btn ${!isUserVideoEnabled ? 'muted' : ''}`}
                title={isUserVideoEnabled ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {isUserVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                <span className="dock-action-text">{isUserVideoEnabled ? 'Video On' : 'Video Off'}</span>
              </button>

              {/* Giant Speak with Avatar Mic Action */}
              <button
                onClick={handleMicClick}
                className={`vcall-dock-talk-btn ${isListening ? 'talking' : ''}`}
                title="Tap to speak directly"
              >
                <Mic size={22} />
                <span>{isListening ? 'Listening...' : `Talk to ${callingName}`}</span>
              </button>

              {/* Chat Toggle */}
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className={`vcall-dock-action-btn ${chatOpen ? 'active' : ''}`}
                title="Toggle Text Chat"
              >
                <MessageSquare size={20} />
                <span className="dock-action-text">Chat</span>
              </button>

              {/* End Video Call Action */}
              <button
                onClick={handleEndVideoCall}
                className="vcall-dock-action-btn end-call"
                title="End Video Call"
              >
                <PhoneOff size={20} />
                <span className="dock-action-text">End Call</span>
              </button>
            </div>

            {/* In-Call Text Chat Drawer */}
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
                        if (e.key === 'Enter') handleAskQuestion();
                      }}
                      className="drawer-text-input dark-input"
                    />
                    <button
                      onClick={() => handleAskQuestion()}
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
      {/* Top Navbar */}
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
          {/* Start Fullscreen Video Call Button */}
          <button
            onClick={handleStartVideoCall}
            className="room-vcall-launch-btn"
            title="Start live video call with avatar"
          >
            <Video size={15} />
            <span>Start Live Video Call</span>
          </button>

          {/* Toggle Chat Button */}
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
              <img
                src={
                  avatar.photoUrl ||
                  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80'
                }
                alt={avatar.name}
                className={`avatar-speaking-img ${isSpeaking ? 'talking' : ''}`}
              />
            </div>

            {/* Speaking Audio Waveform Bar */}
            <div className={`avatar-wave-dock ${isSpeaking ? 'active' : ''}`}>
              <div className="dock-wave-bars">
                {[35, 75, 50, 95, 60, 40, 85, 45, 100, 70, 50, 90, 65, 40, 80, 55].map((h, i) => (
                  <span
                    key={i}
                    className={`dock-bar ${isSpeaking ? 'animated' : ''}`}
                    style={{
                      height: isSpeaking ? `${h}%` : '20%',
                      animationDelay: `${(i % 6) * 0.1}s`,
                    }}
                  />
                ))}
              </div>
              <span className="dock-voice-tag">
                <Volume2 size={13} className="text-emerald-500" />
                <span>Cloned Voice Synthesizer Active</span>
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
            >
              <Mic size={28} />
              {isListening && <span className="mic-halo-ring" />}
            </button>
            <span className="mic-caption-label">
              {isListening ? 'Listening to your voice... (Speak now)' : `Tap to talk with ${callingName}`}
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
                  onClick={() => handleAskQuestion(q)}
                  className="room-prompt-pill"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Slide-in Text Chat Drawer (Toggles only when user wants) */}
        <AnimatePresence>
          {chatOpen && !isVideoCallActive && (
            <motion.aside
              initial={{ opacity: 0, x: 340 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 340 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="room-chat-drawer"
            >
              {/* Drawer Header */}
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

              {/* Message Feed */}
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

              {/* Drawer Text Input Bar */}
              <div className="drawer-input-bar">
                <input
                  type="text"
                  placeholder={`Send a message to ${callingName}...`}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAskQuestion();
                  }}
                  className="drawer-text-input"
                />
                <button
                  onClick={() => handleAskQuestion()}
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
    </div>
  );
}
