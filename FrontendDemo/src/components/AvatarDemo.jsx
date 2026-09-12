import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Volume2, Sparkles, Play, Pause, RefreshCw, MessageSquare, ShieldCheck, Heart } from 'lucide-react';

const personas = [
  {
    id: 'thomas',
    name: 'Grandfather Thomas',
    relation: 'Grandfather (1945 – 2023)',
    status: 'Persona Active • Voice Cloned from 8 WhatsApp Audios',
    avatarInitials: 'GT',
    photoBg: 'linear-gradient(135deg, #27272a 0%, #09090b 100%)',
    avatarImg: '/grandfather.jpg', // Dignified elder portrait
    personality: 'Pragmatic, gentle dry humor, mechanical wisdom, stoic optimism',
    contextSources: ['14 WhatsApp Voice Notes', '320 Chat Messages', 'Family Recipe Notes'],
    sampleQuestions: [
      '“Grandpa, I’m feeling stuck in my career. What would you do?”',
      '“Tell me how you and Grandma decided to buy the family house in 1978?”',
      '“What was your favorite memory of us building that treehouse?”',
    ],
    answers: {
      default: "Hey kiddo. You know I always told you—life rarely gives you a smooth road with no traffic. When I was thirty, I had sixty dollars in the bank and a broken distributor cap. The only thing you can control is how steady your hands are when you fix the engine. Take a deep breath, write down the three things you actually control today, and get to work.",
      career: "Look, feeling stuck usually means you've outgrown the room you're sitting in. When I was at the steel mill in '74, I was terrified to switch to precision machining. But stagnation is worse than failure. What's the one move you're avoiding because you're scared of looking foolish?",
      house: "Ha! That house was a disaster when we saw it! The roof leaked over the hallway and your grandmother cried in the car for twenty minutes. But I looked at the oak beams in the basement and knew the bones were solid. You don't buy perfection; you buy good bones and build the rest with patience.",
      treehouse: "Haha! You kept dropping the galvanized nails into the tall grass, and we spent two hours looking for them with a kitchen magnet! You had sap all over your elbows. I wouldn't trade that sunny Saturday for all the gold in Fort Knox.",
    }
  },
  {
    id: 'maya',
    name: 'Mother Maya',
    relation: 'Mother (1960 – 2022)',
    status: 'Persona Active • Voice Cloned from 12 Voice Notes',
    avatarInitials: 'MM',
    photoBg: 'linear-gradient(135deg, #3f3f46 0%, #18181b 100%)',
    avatarImg: '/grandmother.jpg',
    personality: 'Warm, highly empathetic, reassuring, loved garden metaphors & tea',
    contextSources: ['12 Voice Memos', '580 WhatsApp Chats', 'Personal Journal Excerpts'],
    sampleQuestions: [
      '“Mom, I miss you. How do you deal with heavy days?”',
      '“What is one thing you always wanted me to remember?”',
      '“Can you remind me how to make your ginger cardamom tea?”',
    ],
    answers: {
      default: "Oh my sweet heart. I’m right here with you. On heavy days, remember how we used to sit on the porch and just watch the rain? You don't have to carry the whole world on your shoulders today. Drink some warm water, wrap up in that green blanket, and be gentle with yourself. You are doing so well, and I am so proud of you.",
      miss: "I know, darling. Grief is just all the unspent love with nowhere to go. Whenever you feel that ache, remember that my love for you is knitted into every choice you make. You carry my smile, and as long as you're kind to people, I'm right there.",
      remember: "Never let anyone make you feel small for having a big, tender heart. The world tries to make people cold, but your warmth is your superpower. Stay curious, forgive quickly, and never go to sleep angry.",
      tea: "Two cups of water, crush two green cardamom pods and a coin-sized slice of fresh ginger. Let it boil till the kitchen smells like home, then add a splash of oat milk and just a touch of raw honey at the end. Don't rush it!",
    }
  },
];

export default function AvatarDemo() {
  const [selectedPersonaId, setSelectedPersonaId] = useState('thomas');
  const [userQuery, setUserQuery] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  const persona = personas.find((p) => p.id === selectedPersonaId) || personas[0];

  useEffect(() => {
    // Reset conversation when switching personas
    setCurrentResponse(persona.answers.default);
    setChatHistory([
      { sender: 'avatar', text: persona.answers.default, timestamp: 'Just now' }
    ]);
    setIsSpeaking(false);
  }, [selectedPersonaId]);

  const handleAsk = (questionText) => {
    const q = questionText || userQuery;
    if (!q.trim()) return;

    // Add user message
    const newHistory = [...chatHistory, { sender: 'user', text: q, timestamp: 'Just now' }];
    setChatHistory(newHistory);
    setUserQuery('');
    setIsSpeaking(true);

    // Pick contextual answer
    let responseText = persona.answers.default;
    const lower = q.toLowerCase();
    if (lower.includes('career') || lower.includes('stuck') || lower.includes('job')) {
      responseText = persona.answers.career || persona.answers.default;
    } else if (lower.includes('house') || lower.includes('home') || lower.includes('buy')) {
      responseText = persona.answers.house || persona.answers.default;
    } else if (lower.includes('treehouse') || lower.includes('memory') || lower.includes('remember')) {
      responseText = persona.answers.treehouse || persona.answers.remember || persona.answers.default;
    } else if (lower.includes('miss') || lower.includes('heavy') || lower.includes('sad')) {
      responseText = persona.answers.miss || persona.answers.default;
    } else if (lower.includes('tea') || lower.includes('recipe')) {
      responseText = persona.answers.tea || persona.answers.default;
    }

    setTimeout(() => {
      setCurrentResponse(responseText);
      setChatHistory([...newHistory, { sender: 'avatar', text: responseText, timestamp: 'Just now' }]);
    }, 600);
  };

  const simulateMic = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      handleAsk(persona.sampleQuestions[0]);
    }, 1800);
  };

  return (
    <section className="section-avatar-demo" id="live-avatar">
      <div className="section-header">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-tag"
        >
          Live Interactive Experience
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="section-title"
        >
          Talk to their avatar.
          <br />
          <span className="text-highlight">In their voice, face, and true persona.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="section-subtitle"
        >
          Trained on real WhatsApp messages, voice notes, and photographs. Experience how it feels to ask a question and hear them respond.
        </motion.p>
      </div>

      {/* Persona Switcher Tabs */}
      <div className="persona-switcher-bar">
        {personas.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPersonaId(p.id)}
            className={`persona-tab-pill ${selectedPersonaId === p.id ? 'active' : ''}`}
          >
            <div className="persona-tab-avatar">
              {p.avatarInitials}
            </div>
            <div className="persona-tab-meta">
              <span className="persona-tab-name">{p.name}</span>
              <span className="persona-tab-rel">{p.relation}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Master Avatar Dialogue Room */}
      <div className="avatar-room-container">
        {/* Left: Avatar Face & Voice Presence */}
        <div className="avatar-visual-panel">
          <div className="avatar-frame-box">
            {/* Visual Portrait */}
            <div className="avatar-portrait-wrapper">
              <img 
                src={persona.avatarImg} 
                alt={persona.name}
                className={`avatar-portrait-img ${isSpeaking ? 'speaking-pulse' : ''}`}
              />
              {/* Subtle Live Audio Reactive Aura */}
              <div className={`avatar-aura ${isSpeaking ? 'active-aura' : ''}`} />

              {/* Status Badge */}
              <div className="avatar-live-badge">
                <span className={`live-dot ${isSpeaking ? 'speaking' : ''}`} />
                <span>{isSpeaking ? 'Speaking in cloned voice...' : 'Listening & Present'}</span>
              </div>
            </div>

            {/* Persona Details Box */}
            <div className="persona-info-footer">
              <h3 className="persona-title">{persona.name}</h3>
              <p className="persona-sub-status">{persona.status}</p>

              {/* Voice & Context Source Badges */}
              <div className="context-tags-grid">
                {persona.contextSources.map((src, i) => (
                  <span key={i} className="context-mini-chip">
                    {src}
                  </span>
                ))}
              </div>

              {/* Cloned Voice Audio Waveform */}
              <div className="voice-stream-card">
                <div className="voice-stream-left">
                  <button 
                    onClick={() => setIsSpeaking(!isSpeaking)} 
                    className="voice-toggle-btn"
                    aria-label="Toggle voice"
                  >
                    {isSpeaking ? <Pause size={14} /> : <Volume2 size={14} />}
                  </button>
                  <span className="voice-stream-label">
                    {isSpeaking ? 'Cloned Voice Audio Playing' : 'Voice Synthesis Ready'}
                  </span>
                </div>

                <div className="live-mini-waveform">
                  {[40, 80, 50, 95, 60, 30, 85, 45, 100, 70, 40, 90].map((h, i) => (
                    <span 
                      key={i} 
                      className={`wave-bar ${isSpeaking ? 'active' : ''}`}
                      style={{ 
                        height: isSpeaking ? `${h}%` : '20%',
                        animationDelay: `${i * 0.1}s` 
                      }} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Conversational Dialogue Stream */}
        <div className="avatar-chat-panel">
          {/* Quick Prompts to Click */}
          <div className="quick-prompts-section">
            <span className="quick-prompt-label">
              <Sparkles size={12} />
              <span>Suggested questions for {persona.name.split(' ')[0]}:</span>
            </span>
            <div className="quick-prompts-list">
              {persona.sampleQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAsk(q)}
                  className="quick-prompt-btn"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="dialogue-messages-stream">
            {chatHistory.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'avatar-row'}`}
              >
                {msg.sender === 'avatar' && (
                  <div className="msg-avatar-icon">
                    {persona.avatarInitials}
                  </div>
                )}
                <div className={`chat-bubble ${msg.sender === 'user' ? 'user-msg' : 'avatar-msg'}`}>
                  {msg.sender === 'avatar' && (
                    <div className="msg-header-tag">
                      <Volume2 size={12} className="text-zinc-400" />
                      <span>{persona.name} (Cloned Voice)</span>
                    </div>
                  )}
                  <p className="msg-text">{msg.text}</p>
                </div>
              </motion.div>
            ))}

            {isSpeaking && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="typing-indicator-row"
              >
                <div className="typing-bubble">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </motion.div>
            )}
          </div>

          {/* Live Input & Voice Microphone Bar */}
          <div className="chat-input-toolbar">
            <div className="input-box-wrapper">
              <input
                type="text"
                placeholder={`Ask ${persona.name} anything... (e.g. "What was your advice about...")`}
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAsk();
                }}
                className="interactive-chat-input"
              />

              <button
                type="button"
                onClick={simulateMic}
                className={`mic-record-action ${isListening ? 'listening' : ''}`}
                title="Speak using microphone"
              >
                <Mic size={16} />
                {isListening && <span className="mic-pulse-ring" />}
              </button>

              <button
                type="button"
                onClick={() => handleAsk()}
                disabled={!userQuery.trim()}
                className="send-msg-btn"
                aria-label="Send query"
              >
                <Send size={15} />
              </button>
            </div>

            <div className="input-footer-guarantee">
              <ShieldCheck size={13} className="shield-ok" />
              <span>Grounded in their real chats, voice notes & letters • 100% Private Lineage</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
