import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Mic, Image, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

const pillars = [
  {
    step: '01',
    icon: MessageSquare,
    tag: 'Context & Thought Engine',
    title: 'Ingest WhatsApp Chats, Letters & Stories',
    description:
      'Upload exported WhatsApp chat histories (.txt/.zip), voicemails, journal entries, or written recollections. Our cognitive parser extracts how they reasoned, their favorite idioms, inside jokes, and core beliefs.',
    features: [
      'WhatsApp message history import',
      'Personality quirks & decision patterns',
      'Life timeline & key family stories',
    ],
  },
  {
    step: '02',
    icon: Mic,
    tag: 'Voice Cloning Engine',
    title: 'Recreate Their Authentic Voice & Tone',
    description:
      'Provide just 1 to 5 minutes of clean audio—from old voice notes, recorded phone calls, or home videos. We clone their exact timbre, pitch, pauses, and laugh with crystal fidelity.',
    features: [
      'Clones from standard WhatsApp voice notes',
      'Captures natural breathing & cadence',
      'No professional studio audio required',
    ],
  },
  {
    step: '03',
    icon: Image,
    tag: 'Visual Face Avatar',
    title: 'Animate Their Photo into an Interactive Avatar',
    description:
      'Upload a clear photograph. We construct a living 3D facial avatar with natural gaze, responsive expressions, and real-time lip synchronisation when speaking in their cloned voice.',
    features: [
      'Works with vintage or modern portraits',
      'Real-time expressive lip-syncing',
      'Natural eye contact & head movements',
    ],
  },
];

export default function PersonaCreationFlow({ onOpenCreateModal }) {
  return (
    <section className="section-persona-flow" id="persona-studio">
      <div className="section-header">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-tag"
        >
          The Persona Architecture
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="section-title"
        >
          How Kin.ai brings their memory to life.
          <br />
          <span className="text-highlight">Context + Voice + Face.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="section-subtitle"
        >
          You don't need gigabytes of data. Even a handful of WhatsApp voice notes and a family photo are enough to build a remarkably familiar avatar.
        </motion.p>
      </div>

      <div className="persona-pillars-grid">
        {pillars.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="pillar-card"
            >
              <div className="pillar-header">
                <span className="pillar-step-badge">Step {item.step}</span>
                <div className="pillar-icon-box">
                  <Icon size={20} />
                </div>
              </div>

              <span className="pillar-tag">{item.tag}</span>
              <h3 className="pillar-title">{item.title}</h3>
              <p className="pillar-desc">{item.description}</p>

              <div className="pillar-checklist">
                {item.features.map((feat, i) => (
                  <div key={i} className="pillar-check-item">
                    <CheckCircle2 size={13} className="pillar-check-icon" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Interactive Trigger Banner */}
      <div className="studio-trigger-banner">
        <div className="banner-text">
          <h4>Ready to create your loved one's persona?</h4>
          <p>It takes less than 3 minutes to upload initial context and hear their voice respond.</p>
        </div>
        <button onClick={onOpenCreateModal} className="banner-cta-btn">
          <span>Start Persona Studio</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}
