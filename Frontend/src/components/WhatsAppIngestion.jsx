import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Mic, Play, Pause, Sparkles, ArrowRight, Check, FileText, CheckCircle2 } from 'lucide-react';

export default function WhatsAppIngestion() {
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [playingVoice, setPlayingVoice] = useState(false);

  return (
    <section className="section-ingestion" id="memory-ingestion">
      <div className="section-header">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-tag"
        >
          Data Ingestion Engine
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="section-title"
        >
          Turn everyday messages & voice notes
          <br />
          <span className="text-highlight">into a conversational persona.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="section-subtitle"
        >
          You don't need formal autobiographies. The way they texted, the voicemails they left, and their spontaneous voice notes contain the purest essence of who they were.
        </motion.p>
      </div>

      <div className="ingestion-showcase-card">
        <div className="ingestion-left-demo">
          <div className="mock-chat-window">
            <div className="mock-chat-header">
              <div className="mock-avatar-circle">D</div>
              <div className="mock-user-meta">
                <span className="mock-name">Dad (WhatsApp Archive)</span>
                <span className="mock-sub">Exported 842 messages & 18 audios</span>
              </div>
            </div>

            <div className="mock-chat-body">
              <div className="chat-date-pill">March 14, 2021</div>

              {/* Sample chat bubble 1 */}
              <div className="mock-bubble incoming">
                <p>Don't stress about the interview tomorrow. Remember what I told you: look them in the eye and be honest about what you know. You've got the talent.</p>
                <span className="time">8:14 PM</span>
              </div>

              {/* Sample Voice note bubble */}
              <div className="mock-bubble incoming voice-note-bubble">
                <button 
                  onClick={() => setPlayingVoice(!playingVoice)}
                  className="voice-play-btn"
                >
                  {playingVoice ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
                </button>
                <div className="voice-wave-graphic">
                  <div className="voice-bars-line">
                    {[30, 60, 90, 40, 75, 100, 60, 40, 80, 50, 90, 35, 70, 85].map((h, i) => (
                      <span 
                        key={i} 
                        className={`mock-vbar ${playingVoice ? 'playing' : ''}`}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <span className="voice-dur">{playingVoice ? 'Playing 0:38' : 'Voice Note (0:38)'}</span>
                </div>
              </div>

              {/* Sample chat bubble 2 */}
              <div className="mock-bubble incoming">
                <p>Call me when you're back home. Mom is making stew. Love you kid.</p>
                <span className="time">9:02 PM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ingestion Transformation Arrow */}
        <div className="ingestion-center-transform">
          <div className="transform-sparkle-pill">
            <Sparkles size={16} />
            <span>Kin AI Persona Extraction</span>
          </div>
          <div className="transform-arrow-line" />
        </div>

        {/* Ingestion Output Persona */}
        <div className="ingestion-right-output">
          <div className="extracted-persona-card">
            <div className="extracted-card-header">
              <Sparkles size={14} className="text-zinc-900" />
              <span>Extracted Cognitive Persona</span>
            </div>

            <div className="extracted-trait-item">
              <span className="trait-label">Tone & Speech Pattern</span>
              <p className="trait-val">Warm, reassuring, uses phrases like "Love you kid", concise stoic encouragement.</p>
            </div>

            <div className="extracted-trait-item">
              <span className="trait-label">Cloned Voiceprint</span>
              <p className="trait-val">Deep baritone, measured pacing, gentle gravel, 99.4% acoustic resemblance.</p>
            </div>

            <div className="extracted-trait-item">
              <span className="trait-label">Core Values & Decision Model</span>
              <p className="trait-val">Integrity-first, family-anchored, pragmatic resilience during career stress.</p>
            </div>

            <div className="extracted-status-pill">
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>Ready for interactive avatar conversation</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
