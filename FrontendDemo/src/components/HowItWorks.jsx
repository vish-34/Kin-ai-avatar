import React from 'react';
import { motion } from 'framer-motion';
import { Mic, BrainCircuit, Users, CheckCircle2, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Mic,
    tag: 'Frictionless Capture',
    title: 'Guided Conversational Prompts',
    description:
      'We send thoughtful, gentle voice & video prompts directly to parents and grandparents. No technical setup, no camera anxiety—just answering one meaningful question at a time.',
    highlight: 'Built specifically for non-technical elders',
  },
  {
    number: '02',
    icon: BrainCircuit,
    tag: 'Cognitive Synthesis',
    title: 'Extracting Mental Models & Values',
    description:
      'Our engine processes not just what happened, but why they made their choices, their distinctive vocabulary, their recurring advice, and their emotional nuances.',
    highlight: 'Extracts thought frameworks, not just facts',
  },
  {
    number: '03',
    icon: Users,
    tag: 'Lineage Layer',
    title: 'A Living Generational Heirloom',
    description:
      'Children and grandchildren can ask questions anytime. The avatar responds with grounded authenticity, familiar stories, and genuine wisdom passed down through generations.',
    highlight: 'Private & encrypted family vault',
  },
];

export default function HowItWorks() {
  return (
    <section className="section-how" id="trending">
      <div className="section-header">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-tag"
        >
          The Input-First Architecture
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="section-title"
        >
          Designed for real families.
          <br />
          <span className="text-highlight">Simple input, profound continuity.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="section-subtitle"
        >
          If data capture is shallow, the memory is shallow. We solved capture first so your elders enjoy the process.
        </motion.p>
      </div>

      <div className="steps-container">
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          return (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="step-card"
            >
              <div className="step-card-top">
                <span className="step-num-badge">{step.number}</span>
                <div className="step-icon-box">
                  <IconComponent size={20} />
                </div>
              </div>

              <span className="step-tag">{step.tag}</span>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.description}</p>

              <div className="step-highlight-box">
                <CheckCircle2 size={14} className="check-icon" />
                <span>{step.highlight}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
