import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Compass, HeartHandshake, Lightbulb, ChevronRight, Mic } from 'lucide-react';

const categories = [
  {
    id: 'roots',
    title: 'Roots & Foundations',
    icon: BookOpen,
    description: 'Capturing origin stories, early childhood realities, and ancestral heritage.',
    prompts: [
      '“What was the house you grew up in like, and what smells or sounds do you remember most?”',
      '“What were your parents like when you were young, and what was their biggest sacrifice?”',
      '“What was something you believed as a child that turned out to be completely different?”',
    ],
  },
  {
    id: 'decisions',
    title: 'Hard Decisions & Crossroads',
    icon: Compass,
    description: 'Understanding mental frameworks during times of uncertainty, crisis, and risk.',
    prompts: [
      '“Tell me about a time you took a massive financial or career gamble. What gave you the courage?”',
      '“What was the biggest mistake you made, and how did you navigate the aftermath?”',
      '“How did you know when it was time to leave a situation or relationship that wasn’t working?”',
    ],
  },
  {
    id: 'relationships',
    title: 'Love, Family & Lineage',
    icon: HeartHandshake,
    description: 'Deep personal wisdom on marriage, partnership, raising children, and forgiveness.',
    prompts: [
      '“What was the moment you knew you loved your partner?”',
      '“What is the hardest truth about raising children that no one prepares you for?”',
      '“What is one tradition you hope our family keeps alive 100 years from now?”',
    ],
  },
  {
    id: 'wisdom',
    title: 'Unfiltered Life Advice',
    icon: Lightbulb,
    description: 'Candid reflections on what truly matters in life versus what was just noise.',
    prompts: [
      '“If you could whisper one sentence of advice to me right now, what would it be?”',
      '“What is something most people worry about constantly that actually does not matter?”',
      '“How do you define a life well lived?”',
    ],
  },
];

export default function PromptLibrary() {
  const [activeCategory, setActiveCategory] = useState('roots');
  const current = categories.find((c) => c.id === activeCategory) || categories[0];

  return (
    <section className="section-prompts" id="faqs">
      <div className="section-header">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-tag"
        >
          Curated Capture Engine
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="section-title"
        >
          Prompts that extract depth,
          <br />
          <span className="text-highlight">not just surface stories.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="section-subtitle"
        >
          We crafted hundreds of research-backed questions that unlock the essence of how someone thinks and lives.
        </motion.p>
      </div>

      <div className="prompt-tabs-grid">
        {/* Category List */}
        <div className="category-sidebar">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`category-tab-btn ${isSelected ? 'active' : ''}`}
              >
                <div className="cat-icon-wrap">
                  <Icon size={18} />
                </div>
                <div className="cat-text-wrap">
                  <h4 className="cat-tab-title">{cat.title}</h4>
                  <p className="cat-tab-sub">{cat.prompts.length} guided sessions</p>
                </div>
                <ChevronRight size={16} className="chevron" />
              </button>
            );
          })}
        </div>

        {/* Selected Prompts Display */}
        <div className="prompts-content-box">
          <div className="prompts-box-header">
            <h3 className="current-cat-title">{current.title}</h3>
            <p className="current-cat-desc">{current.description}</p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="prompts-list"
            >
              {current.prompts.map((promptText, i) => (
                <div key={i} className="prompt-item-card">
                  <div className="prompt-meta-row">
                    <span className="prompt-badge">Session {i + 1}</span>
                    <span className="prompt-duration">~5 mins capture</span>
                  </div>
                  <p className="prompt-quote-text">{promptText}</p>
                  <div className="prompt-footer-action">
                    <button className="sample-record-btn">
                      <Mic size={13} />
                      <span>Preview Interview Format</span>
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
