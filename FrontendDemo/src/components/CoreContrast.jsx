import React from 'react';
import { motion } from 'framer-motion';
import { ImageOff, Sparkles, MessageSquare, Volume2, ArrowRight } from 'lucide-react';

export default function CoreContrast() {
  return (
    <section className="section-contrast" id="how-it-works">
      <div className="section-header">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-tag"
        >
          The Fundamental Shift
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="section-title"
        >
          Photos capture how they looked.
          <br />
          <span className="text-highlight">We capture how they thought.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="section-subtitle"
        >
          Most memories are stored as silent, disconnected fragments. They don't explain the reasoning behind hard choices, the quiet humor, or what they would say today.
        </motion.p>
      </div>

      <div className="contrast-grid">
        {/* Left: Traditional Photos/Videos */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="contrast-card traditional"
        >
          <div className="card-top-tag">Traditional Media</div>
          <div className="card-visual-mock fragment-mock">
            <div className="fragment-box box-1">
              <span className="fragment-label">photo_1984.jpg</span>
              <span className="fragment-status">Silent</span>
            </div>
            <div className="fragment-box box-2">
              <span className="fragment-label">home_video.mp4</span>
              <span className="fragment-status">Unindexed</span>
            </div>
          </div>
          <h3 className="card-title">Passive Storage</h3>
          <ul className="card-points">
            <li>Static moments without conversational context</li>
            <li>Memories stay locked in hard drives & photo albums</li>
            <li>No way for grandchildren to ask clarifying questions</li>
          </ul>
        </motion.div>

        {/* Right: Kin.ai Interactive Memory */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="contrast-card dynamic-memory"
        >
          <div className="card-top-tag active-tag">
            <Sparkles size={13} />
            <span>Interactive Persona</span>
          </div>
          <div className="card-visual-mock memory-mock">
            <div className="memory-bubble user-bubble">
              <span className="bubble-text">“How did you choose between law and starting your business?”</span>
            </div>
            <div className="memory-bubble avatar-bubble">
              <div className="voice-indicator">
                <Volume2 size={13} />
                <span className="voice-wave" />
              </div>
              <span className="bubble-text">“Your grandmother and I had $600 in savings. I realized security isn’t a paycheck—it’s knowing how to recover...”</span>
            </div>
          </div>
          <h3 className="card-title">Interactive Presence</h3>
          <ul className="card-points">
            <li>Preserves true vocal cadence, pauses, and personal humor</li>
            <li>Grounded strictly in authentic recorded stories</li>
            <li>Living wisdom your lineage can converse with anytime</li>
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
