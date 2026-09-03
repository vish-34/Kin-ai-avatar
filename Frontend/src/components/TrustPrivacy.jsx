import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Heart, Award, Check } from 'lucide-react';

export default function TrustPrivacy() {
  const principles = [
    {
      icon: Shield,
      title: 'Family-Owned Lineage',
      desc: 'Your recordings and avatar belong exclusively to your family. They are encrypted end-to-end and will never be used for public training or shared with third parties.',
    },
    {
      icon: Heart,
      title: 'Emotional Dignity, Not Replacement',
      desc: 'We strictly reject uncanny deepfakes or morbid novelty. The interface honors their authentic presence, making memories conversational without pretending to replace the person.',
    },
    {
      icon: Lock,
      title: 'Explicit Consent & Opt-In Control',
      desc: 'Every session is guided with transparent consent. Family members can archive, pause, or edit memories at any time with complete autonomy.',
    },
    {
      icon: Award,
      title: 'Grounded Verifiability',
      desc: 'Every answer given by an avatar directly cites the exact recorded interview moment, ensuring factual truth and historical accuracy for future generations.',
    },
  ];

  return (
    <section className="section-trust">
      <div className="trust-dark-card">
        <div className="trust-header">
          <div className="trust-tag-badge">
            <Shield size={14} />
            <span>Ethical Foundation & Lineage Security</span>
          </div>
          <h2 className="trust-main-title">
            Built on dignity, consent,
            <br />
            and generational trust.
          </h2>
          <p className="trust-subtext">
            Preserving a loved one's mind is a profound responsibility. We engineered Kin.ai with strict boundary safeguards to protect family privacy.
          </p>
        </div>

        <div className="trust-principles-grid">
          {principles.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="trust-item-box"
              >
                <div className="trust-icon-wrap">
                  <Icon size={18} />
                </div>
                <h4 className="trust-item-title">{item.title}</h4>
                <p className="trust-item-desc">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
