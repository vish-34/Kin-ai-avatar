import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, ShieldCheck } from 'lucide-react';

const faqs = [
  {
    q: 'How much audio is required to clone my loved one’s voice?',
    a: 'Just 1 to 5 minutes of clear audio is sufficient. This can come from old WhatsApp voice notes, voicemails, home videos, or voice memos. Our acoustic engine automatically separates speech from background noise to isolate their exact vocal tone and cadence.',
  },
  {
    q: 'How does Kin.ai learn how they thought and spoke?',
    a: 'You can export WhatsApp chat histories, write down memories, or upload journal entries. Our cognitive engine parses recurring speech idioms, their advice frameworks, personal anecdotes, and core beliefs to ensure the avatar responds with their authentic reasoning.',
  },
  {
    q: 'What kind of photo is needed for the face avatar?',
    a: 'Any clear photograph where their face is visible works well. Front-facing portraits with good natural lighting produce the most expressive lip-synced 3D facial movements.',
  },
  {
    q: 'Is our family data and voice recordings completely private?',
    a: 'Yes, 100%. Your family data, voice clones, and persona models are strictly encrypted with private lineage access keys. We never train public foundation models on your family’s memories, and no third parties ever have access.',
  },
  {
    q: 'Can multiple family members converse with the avatar?',
    a: 'Yes. The avatar lives in a secure family vault that can be shared with children, grandchildren, and siblings so future generations can ask questions and hear their wisdom anytime.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="section-faq" id="faqs">
      <div className="section-header">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-tag"
        >
          Frequently Asked Questions
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="section-title"
        >
          Everything you need to know
          <br />
          <span className="text-highlight">about preserving their presence.</span>
        </motion.h2>
      </div>

      <div className="faq-accordion-container">
        {faqs.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx} className={`faq-item ${isOpen ? 'open' : ''}`}>
              <button onClick={() => toggle(idx)} className="faq-question-btn">
                <span className="faq-question-text">{item.q}</span>
                <ChevronDown className={`faq-chevron ${isOpen ? 'rotate' : ''}`} size={18} />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="faq-answer-wrapper"
                  >
                    <p className="faq-answer-text">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
