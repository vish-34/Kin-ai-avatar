import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Mic,
  Image as ImageIcon,
  CheckCircle2,
  Upload,
  RefreshCw,
  Volume2,
  Sliders,
  User,
  Info,
  Check,
  Radio,
  FileCheck,
  FileText,
  Edit3,
  Trash2,
  Paperclip
} from 'lucide-react';
import { saveAvatarToVault } from '../utils/vaultStorage';
import './CreateAvatarPage.css';

export default function CreateAvatarPage({ onBackToHome, onNavigateToVault, onAvatarCreated }) {
  // Navigation / Steps State (1 to 5)
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    callingName: '',
    relation: 'Grandfather',
    lifespan: '',
    hometown: '',
    personalityTraits: {
      warmth: 85,
      humor: 70,
      resilience: 90,
      storytelling: 80,
      calmness: 75,
    },
    personalitySummary: '',
    catchphrases: ['Take things one step at a time', 'Never go to sleep angry'],
    newPhraseInput: '',
    coreMemories: '',
    // Step 2 Ingestion Multi-Mode: 'whatsapp' | 'documents' | 'written'
    step2ActiveTab: 'whatsapp',
    // 1. WhatsApp Ingestion
    whatsappFile: null,
    whatsappFileName: '',
    whatsappMessagesCount: 0,
    whatsappParsedData: null,
    whatsappSnippet: '',
    // 2. Document & Memory Files Ingestion
    contextDocuments: [],
    // 3. Handwritten / Typed Context Notes
    writtenContextNotes: '',
    // Voice
    audioFile: null,
    audioFileName: '',
    audioDuration: '',
    audioPreviewUrl: null,
    isRecording: false,
    recordingTime: 0,
    voiceTimbreAnalyzed: false,
    // Photo
    photoFile: null,
    photoPreviewUrl: '',
  });

  // Synthesis Pipeline State
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisStage, setSynthesisStage] = useState(0);
  const [synthesisProgress, setSynthesisProgress] = useState(0);

  // Audio recording timer ref
  const recordingTimerRef = useRef(null);

  // Scroll to top whenever step changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  // Handle Recording simulation
  const toggleRecording = () => {
    if (formData.isRecording) {
      clearInterval(recordingTimerRef.current);
      setFormData((prev) => ({
        ...prev,
        isRecording: false,
        audioFileName: 'Voice_Note_Captured.wav',
        audioDuration: `${Math.floor(formData.recordingTime / 60)}:${(formData.recordingTime % 60).toString().padStart(2, '0')}`,
        voiceTimbreAnalyzed: true,
      }));
    } else {
      setFormData((prev) => ({ ...prev, isRecording: true, recordingTime: 0 }));
      recordingTimerRef.current = setInterval(() => {
        setFormData((prev) => ({ ...prev, recordingTime: prev.recordingTime + 1 }));
      }, 1000);
    }
  };

  // Add Catchphrase
  const handleAddCatchphrase = () => {
    if (formData.newPhraseInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        catchphrases: [...prev.catchphrases, prev.newPhraseInput.trim()],
        newPhraseInput: '',
      }));
    }
  };

  const handleRemoveCatchphrase = (index) => {
    setFormData((prev) => ({
      ...prev,
      catchphrases: prev.catchphrases.filter((_, i) => i !== index),
    }));
  };

  // Load Preset Demo Data
  const handleLoadSampleGrandpa = () => {
    setFormData((prev) => ({
      ...prev,
      name: 'Ramesh Vance Sharma',
      callingName: 'Dadaji',
      relation: 'Grandfather',
      lifespan: '1948 – 2023',
      hometown: 'Bengaluru, India',
      personalityTraits: {
        warmth: 95,
        humor: 75,
        resilience: 95,
        storytelling: 85,
        calmness: 90,
      },
      personalitySummary:
        'A deeply calm, philosophical soul who worked at the telegraph office and later precision tooling. Always gave gentle advice using gardening metaphors and advised never to panic when money is tight.',
      catchphrases: [
        'Sab theek ho jayega, beta',
        'Take things one step at a time',
        'You buy good bones and build the rest with patience',
      ],
      coreMemories:
        'Taught us how to fix bicycle chains on Sunday mornings; planted a mango sapling in 1982 that still shades the courtyard; always drank ginger chai at 5 PM sharp.',
      whatsappFileName: 'WhatsApp_Chat_with_Dadaji.txt',
      whatsappMessagesCount: 1420,
      whatsappParsedData: {
        messageCount: 1420,
        voiceNotesCount: 26,
        sentiment: 'Reassuring & Loving',
        frequentTerms: ['beta', 'chai', 'gardening', 'aashirvaad', 'stay calm'],
      },
      contextDocuments: [
        { id: 1, name: 'Grandpa_Memories_and_Recipes.pdf', size: '1.4 MB', type: 'PDF' },
        { id: 2, name: '1974_Precision_Foundry_Journals.txt', size: '48 KB', type: 'TXT' },
      ],
      writtenContextNotes:
        'Dadaji was born in 1948 in Karnataka. He worked for 32 years in precision tooling. Famous family advice: "When you build something with honesty, time works on your side, not against you." Every Sunday morning he sat on the veranda listening to All India Radio while teaching us how to tune bicycle gears. He never raised his voice, loved black pepper ginger tea, and always put family first.',
      audioFileName: 'Dadaji_Sunday_Voicemail_1998.wav',
      audioDuration: '1:14',
      voiceTimbreAnalyzed: true,
      photoPreviewUrl:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
    }));
  };

  // Handle WhatsApp File Upload
  const handleWhatsAppUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormData((prev) => ({
      ...prev,
      whatsappFile: file,
      whatsappFileName: file.name,
      whatsappMessagesCount: 842,
      whatsappParsedData: {
        messageCount: 842,
        voiceNotesCount: 18,
        sentiment: 'Supportive, Warm, Grounded',
        frequentTerms: ['take care', 'pride', 'family', 'proud of you', 'call me'],
      },
    }));
  };

  // Handle Document Files Upload (PDF, TXT, DOCX, MD)
  const handleDocumentUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newDocs = files.map((file, idx) => ({
      id: Date.now() + idx,
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: (file.name.split('.').pop() || 'DOC').toUpperCase(),
    }));

    setFormData((prev) => ({
      ...prev,
      contextDocuments: [...prev.contextDocuments, ...newDocs],
    }));
  };

  const handleRemoveDocument = (id) => {
    setFormData((prev) => ({
      ...prev,
      contextDocuments: prev.contextDocuments.filter((d) => d.id !== id),
    }));
  };

  const handleInsertPromptNote = (promptText) => {
    setFormData((prev) => ({
      ...prev,
      writtenContextNotes: prev.writtenContextNotes
        ? `${prev.writtenContextNotes.trim()}\n\n${promptText}`
        : promptText,
    }));
  };

  // Handle Audio File Upload
  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      audioFile: file,
      audioFileName: file.name,
      audioDuration: '2:15',
      audioPreviewUrl: previewUrl,
      voiceTimbreAnalyzed: true,
    }));
  };

  // Handle Photo Upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      photoFile: file,
      photoPreviewUrl: previewUrl,
    }));
  };

  // Trigger Neural Persona Synthesis Pipeline (transition to Step 5)
  const startSynthesis = () => {
    setIsSynthesizing(true);
    setSynthesisStage(1);
    setSynthesisProgress(15);

    setTimeout(() => {
      setSynthesisStage(2);
      setSynthesisProgress(45);
    }, 1200);

    setTimeout(() => {
      setSynthesisStage(3);
      setSynthesisProgress(75);
    }, 2400);

    setTimeout(() => {
      setSynthesisStage(4);
      setSynthesisProgress(100);
    }, 3600);

    setTimeout(() => {
      const avatarName = formData.callingName || formData.name || 'Your Loved One';

      // Construct newly created avatar record
      const newAvatar = {
        id: 'avatar-' + Date.now(),
        name: formData.name,
        callingName: formData.callingName || formData.name.split(' ')[0],
        relation: formData.relation || 'Loved One',
        lifespan: formData.lifespan || '',
        hometown: formData.hometown || '',
        photoUrl:
          formData.photoPreviewUrl ||
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
        catchphrases:
          formData.catchphrases && formData.catchphrases.length > 0
            ? formData.catchphrases
            : ['Take things one step at a time', 'Never go to sleep angry'],
        personalitySummary:
          formData.personalitySummary ||
          `${formData.name} was a deeply cherished ${formData.relation.toLowerCase()} whose memories and voice are preserved here.`,
        contextSourcesSummary: [
          formData.whatsappMessagesCount ? `${formData.whatsappMessagesCount} WhatsApp Chats` : null,
          formData.contextDocuments.length > 0 ? `${formData.contextDocuments.length} Documents` : null,
          formData.writtenContextNotes.trim() ? 'Handwritten Notes' : null,
          formData.audioFileName ? 'Voice Cloned' : null,
        ].filter(Boolean).join(' • ') || 'Family Memory Vault',
        createdAt: 'Just now',
        voiceTrained: true,
        sampleQuestions: [
          `“${avatarName}, what advice would you give me today?”`,
          `“Tell me a story from your youth.”`,
          `“I miss you. How do I stay strong on heavy days?”`,
        ],
      };

      // Save to localStorage Family Vault
      saveAvatarToVault(newAvatar);

      // Transition directly to Family Vault as requested by user
      if (onAvatarCreated) {
        onAvatarCreated(newAvatar);
      } else if (onNavigateToVault) {
        onNavigateToVault(newAvatar.name);
      }
    }, 4500);
  };

  const stepsList = [
    { num: 1, label: 'Identity & Context', icon: User },
    { num: 2, label: 'WhatsApp, Files & Notes', icon: MessageSquare },
    { num: 3, label: 'Voice Cloning', icon: Mic },
    { num: 4, label: 'Portrait Photo & Synthesis', icon: ImageIcon },
  ];

  return (
    <div className="studio-root-container">
      {/* Top Floating Studio Header */}
      <header className="studio-navbar">
        <div className="studio-nav-left">
          <button onClick={onBackToHome} className="studio-back-btn">
            <ArrowLeft size={16} />
            <span>Back to Kin.ai Home</span>
          </button>
          <div className="studio-brand-divider" />

          {/* Switcher between Persona Studio & Family Vault */}
          <div className="vault-top-switcher">
            <button className="switcher-tab active" title="Currently editing in Persona Studio">
              <Sparkles size={14} />
              <span>Persona Studio</span>
            </button>
            <button
              onClick={onNavigateToVault}
              className="switcher-tab"
              title="View saved avatars in Family Vault"
            >
              <span className="switcher-dot" />
              <span>Family Vault</span>
            </button>
          </div>
        </div>

        <div className="studio-nav-right">
          <button onClick={handleLoadSampleGrandpa} className="studio-demo-preset-btn">
            <Sparkles size={14} />
            <span>Load Sample Profile (Grandpa Ramesh)</span>
          </button>
        </div>
      </header>

      {/* Main Studio Viewport */}
      <main className="studio-content-body">
        {/* Step Progress Tracker */}
        <nav className="studio-stepper-tracker">
          {stepsList.map((st) => {
            const isDone = currentStep > st.num;
            const isCurrent = currentStep === st.num;
            const Icon = st.icon;

            return (
              <button
                key={st.num}
                onClick={() => {
                  if (st.num < currentStep || (formData.name && st.num <= 4)) {
                    setCurrentStep(st.num);
                  }
                }}
                className={`stepper-node ${isCurrent ? 'active' : ''} ${isDone ? 'completed' : ''}`}
              >
                <div className="stepper-icon-circle">
                  {isDone ? <Check size={14} /> : <Icon size={14} />}
                </div>
                <div className="stepper-text">
                  <span className="stepper-step-idx">Step 0{st.num}</span>
                  <span className="stepper-step-name">{st.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Synthesis Overlay Modal when processing */}
        <AnimatePresence>
          {isSynthesizing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="synthesis-overlay"
            >
              <div className="synthesis-modal-box">
                <div className="synthesis-spinner-ring">
                  <RefreshCw size={36} className="spinning-icon" />
                  <Sparkles size={20} className="spinner-center-sparkle" />
                </div>

                <h3>Synthesizing Your Loved One's Persona</h3>
                <p className="synthesis-sub">
                  Fusing cognitive language patterns, voiceprint acoustics, and facial rig...
                </p>

                {/* Progress track */}
                <div className="synthesis-progress-track">
                  <motion.div
                    className="synthesis-progress-fill"
                    style={{ width: `${synthesisProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                {/* Synthesis Stages Feed */}
                <div className="synthesis-stages-feed">
                  <div className={`stage-row ${synthesisStage >= 1 ? 'active' : ''}`}>
                    <CheckCircle2 size={15} className="stage-icon" />
                    <span>Analyzing WhatsApp chats, attached documents, and handwritten context...</span>
                  </div>
                  <div className={`stage-row ${synthesisStage >= 2 ? 'active' : ''}`}>
                    <CheckCircle2 size={15} className="stage-icon" />
                    <span>Extracting acoustic timbre & pitch embeddings for voice cloning...</span>
                  </div>
                  <div className={`stage-row ${synthesisStage >= 3 ? 'active' : ''}`}>
                    <CheckCircle2 size={15} className="stage-icon" />
                    <span>Rigging portrait facial mesh and expressive gaze anchors...</span>
                  </div>
                  <div className={`stage-row ${synthesisStage >= 4 ? 'active' : ''}`}>
                    <CheckCircle2 size={15} className="stage-icon" />
                    <span>Calibrating CloneLLM cognitive memory engine & RAG store...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 1: Identity & Persona Context */}
        {currentStep === 1 && (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="studio-stage-card"
          >
            <div className="stage-header">
              <span className="stage-pill-tag">Phase 01: Core Demographics & Mindset</span>
              <h2 className="stage-title">Who are you creating an avatar for?</h2>
              <p className="stage-description">
                Provide foundational context to ground the avatar’s conversational intimacy, memories,
                and linguistic cadence.
              </p>
            </div>

            <div className="stage-form-grid">
              {/* Name & Calling Name */}
              <div className="field-group">
                <label>Loved One's Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Vance Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="stage-input"
                />
              </div>

              <div className="field-group">
                <label>What did you call them? (Preferred Name)</label>
                <input
                  type="text"
                  placeholder="e.g. Dadaji, Grandpa, Nana, Baba"
                  value={formData.callingName}
                  onChange={(e) => setFormData({ ...formData, callingName: e.target.value })}
                  className="stage-input"
                />
              </div>

              {/* Relationship & Era */}
              <div className="field-group">
                <label>Relationship to You</label>
                <select
                  value={formData.relation}
                  onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                  className="stage-input"
                >
                  <option value="Grandfather">Grandfather</option>
                  <option value="Grandmother">Grandmother</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Partner / Spouse">Partner / Spouse</option>
                  <option value="Sibling / Family">Sibling / Family</option>
                  <option value="Mentor / Friend">Mentor / Friend</option>
                </select>
              </div>

              <div className="field-group">
                <label>Lifespan / Generation Era (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 1948 – 2023 or Born 1952"
                  value={formData.lifespan}
                  onChange={(e) => setFormData({ ...formData, lifespan: e.target.value })}
                  className="stage-input"
                />
              </div>

              {/* Personality Radar Sliders */}
              <div className="field-group full-width traits-card-wrapper">
                <div className="traits-card-header">
                  <Sliders size={16} />
                  <h4>Personality & Disposition Tuning</h4>
                  <span className="traits-sub">Calibrates emotional tone and guidance style</span>
                </div>

                <div className="traits-sliders-grid">
                  <div className="trait-slider-item">
                    <div className="slider-label-row">
                      <span>Warmth & Compassion</span>
                      <span className="slider-val">{formData.personalityTraits.warmth}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={formData.personalityTraits.warmth}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalityTraits: {
                            ...formData.personalityTraits,
                            warmth: Number(e.target.value),
                          },
                        })
                      }
                      className="styled-range-input"
                    />
                  </div>

                  <div className="trait-slider-item">
                    <div className="slider-label-row">
                      <span>Dry Humor & Playfulness</span>
                      <span className="slider-val">{formData.personalityTraits.humor}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={formData.personalityTraits.humor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalityTraits: {
                            ...formData.personalityTraits,
                            humor: Number(e.target.value),
                          },
                        })
                      }
                      className="styled-range-input"
                    />
                  </div>

                  <div className="trait-slider-item">
                    <div className="slider-label-row">
                      <span>Stoic Resilience & Pragmatism</span>
                      <span className="slider-val">{formData.personalityTraits.resilience}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={formData.personalityTraits.resilience}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalityTraits: {
                            ...formData.personalityTraits,
                            resilience: Number(e.target.value),
                          },
                        })
                      }
                      className="styled-range-input"
                    />
                  </div>

                  <div className="trait-slider-item">
                    <div className="slider-label-row">
                      <span>Storytelling & Nostalgia</span>
                      <span className="slider-val">{formData.personalityTraits.storytelling}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={formData.personalityTraits.storytelling}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalityTraits: {
                            ...formData.personalityTraits,
                            storytelling: Number(e.target.value),
                          },
                        })
                      }
                      className="styled-range-input"
                    />
                  </div>
                </div>
              </div>

              {/* Signature Catchphrases */}
              <div className="field-group full-width">
                <label>Signature Sayings, Catchphrases & Terms of Endearment</label>
                <div className="catchphrase-input-row">
                  <input
                    type="text"
                    placeholder='Add an idiom or advice they frequently said (e.g. "Take it easy kid", "Sab theek hoga")'
                    value={formData.newPhraseInput}
                    onChange={(e) => setFormData({ ...formData, newPhraseInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCatchphrase();
                      }
                    }}
                    className="stage-input"
                  />
                  <button type="button" onClick={handleAddCatchphrase} className="add-phrase-btn">
                    Add Phrase
                  </button>
                </div>

                <div className="tags-cloud">
                  {formData.catchphrases.map((phrase, idx) => (
                    <span key={idx} className="phrase-pill">
                      <span>“{phrase}”</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCatchphrase(idx)}
                        className="remove-phrase-x"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Cherished Memories & Stories */}
              <div className="field-group full-width">
                <label>Cherished Memories, Life Lore & Anecdotes</label>
                <textarea
                  rows={4}
                  placeholder="Share a couple of specific memories or stories that define them. What were their favorite recipes, hobbies, habits, or inside family jokes?"
                  value={formData.coreMemories}
                  onChange={(e) => setFormData({ ...formData, coreMemories: e.target.value })}
                  className="stage-textarea"
                />
              </div>
            </div>

            {/* Stage Action Footer */}
            <div className="stage-actions-bar">
              <div className="stage-actions-hint">
                <Info size={14} />
                <span>All inputs are encrypted and stored only in your private family space.</span>
              </div>
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!formData.name.trim()}
                className="stage-continue-btn"
              >
                <span>Continue to WhatsApp Messages</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.section>
        )}

        {/* STEP 2: Context Ingestion (WhatsApp, Files & Handwritten Notes) */}
        {currentStep === 2 && (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="studio-stage-card"
          >
            <div className="stage-header">
              <span className="stage-pill-tag">Phase 02: Knowledge, WhatsApp & Memory Context</span>
              <h2 className="stage-title">How would you like to provide their context?</h2>
              <p className="stage-description">
                Feed your loved one's avatar with their authentic memories, communication style, and wisdom.
                You can upload exported WhatsApp chats, upload document files (PDFs, text files, diaries),
                or write memories and stories directly by hand—or combine all three!
              </p>
            </div>

            {/* 3 Input Methods Switcher */}
            <div className="context-modes-selector">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, step2ActiveTab: 'whatsapp' })}
                className={`mode-select-btn ${formData.step2ActiveTab === 'whatsapp' ? 'active' : ''}`}
              >
                <div className="mode-btn-left">
                  <div className="mode-icon-circle">
                    <MessageSquare size={17} />
                  </div>
                  <div className="mode-btn-text">
                    <span className="mode-title">1. WhatsApp Chats</span>
                    <span className="mode-sub">Exported .txt or .zip archives</span>
                  </div>
                </div>
                {formData.whatsappFileName && (
                  <span className="mode-badge-loaded">
                    <Check size={12} />
                    <span>{formData.whatsappMessagesCount} Loaded</span>
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, step2ActiveTab: 'documents' })}
                className={`mode-select-btn ${formData.step2ActiveTab === 'documents' ? 'active' : ''}`}
              >
                <div className="mode-btn-left">
                  <div className="mode-icon-circle">
                    <FileText size={17} />
                  </div>
                  <div className="mode-btn-text">
                    <span className="mode-title">2. Upload Memory Files</span>
                    <span className="mode-sub">PDFs, Word docs, letters, diaries</span>
                  </div>
                </div>
                {formData.contextDocuments.length > 0 && (
                  <span className="mode-badge-loaded">
                    <Check size={12} />
                    <span>{formData.contextDocuments.length} Attached</span>
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, step2ActiveTab: 'written' })}
                className={`mode-select-btn ${formData.step2ActiveTab === 'written' ? 'active' : ''}`}
              >
                <div className="mode-btn-left">
                  <div className="mode-icon-circle">
                    <Edit3 size={17} />
                  </div>
                  <div className="mode-btn-text">
                    <span className="mode-title">3. Write Context by Hand</span>
                    <span className="mode-sub">Type stories, advice, habits & wisdom</span>
                  </div>
                </div>
                {formData.writtenContextNotes.trim() && (
                  <span className="mode-badge-loaded">
                    <Check size={12} />
                    <span>{formData.writtenContextNotes.trim().split(/\s+/).length} Words</span>
                  </span>
                )}
              </button>
            </div>

            {/* OPTION 1: WhatsApp Chat Upload Panel */}
            {formData.step2ActiveTab === 'whatsapp' && (
              <div className="mode-panel-wrapper">
                <div className="ingestion-dual-grid">
                  {/* Left Dropzone */}
                  <div className="dropzone-box">
                    <input
                      type="file"
                      id="whatsapp-file-input"
                      accept=".txt,.zip"
                      onChange={handleWhatsAppUpload}
                      className="hidden-file-input"
                    />
                    <label htmlFor="whatsapp-file-input" className="dropzone-content">
                      <div className="dropzone-icon-ring">
                        <MessageSquare size={32} />
                      </div>
                      <h4>Upload Exported WhatsApp Chat</h4>
                      <p>Export chat from WhatsApp without media (generates a <code>.txt</code> or <code>.zip</code> file).</p>
                      <span className="dropzone-cta-pill">
                        <Upload size={14} />
                        <span>Choose WhatsApp File (.txt/.zip)</span>
                      </span>
                    </label>

                    {formData.whatsappFileName && (
                      <div className="uploaded-file-banner">
                        <FileCheck size={18} className="text-emerald-500" />
                        <div className="file-meta">
                          <span className="file-name">{formData.whatsappFileName}</span>
                          <span className="file-sub">Processed {formData.whatsappMessagesCount} messages</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: How to Export & Sample Loader */}
                  <div className="whatsapp-guide-panel">
                    <div className="guide-card-header">
                      <Info size={16} />
                      <h4>How to Export from WhatsApp</h4>
                    </div>
                    <ol className="guide-steps-list">
                      <li>Open the chat with your loved one on WhatsApp.</li>
                      <li>Tap the <strong>three dots</strong> or their <strong>contact name</strong> at the top.</li>
                      <li>Select <strong>More</strong> &gt; <strong>Export Chat</strong>.</li>
                      <li>Choose <strong>Without Media</strong> to get the clean text transcript.</li>
                    </ol>

                    <div className="or-divider">
                      <span>OR TRY INSTANT DEMO</span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          whatsappFileName: 'Dadaji_WhatsApp_Export.txt',
                          whatsappMessagesCount: 1420,
                          whatsappParsedData: {
                            messageCount: 1420,
                            voiceNotesCount: 26,
                            sentiment: 'Loving, Reassuring, Family-Centered',
                            frequentTerms: ['beta', 'chai', 'gardening', 'aashirvaad', 'all will be well'],
                          },
                        }))
                      }
                      className="load-demo-chat-btn"
                    >
                      <Sparkles size={14} />
                      <span>Simulate Uploading 1,420 WhatsApp Messages</span>
                    </button>
                  </div>
                </div>

                {/* Parsed Insights View */}
                {formData.whatsappParsedData && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="parsed-insights-box"
                  >
                    <div className="insights-header">
                      <Sparkles size={16} className="text-zinc-900" />
                      <h4>Extracted Linguistic Insights</h4>
                    </div>
                    <div className="insights-grid">
                      <div className="insight-metric">
                        <span className="metric-val">{formData.whatsappParsedData.messageCount}</span>
                        <span className="metric-lbl">Total Chats Parsed</span>
                      </div>
                      <div className="insight-metric">
                        <span className="metric-val">{formData.whatsappParsedData.voiceNotesCount}</span>
                        <span className="metric-lbl">Voice Notes Identified</span>
                      </div>
                      <div className="insight-metric">
                        <span className="metric-val">{formData.whatsappParsedData.sentiment}</span>
                        <span className="metric-lbl">Dominant Tone</span>
                      </div>
                    </div>

                    <div className="frequent-terms-row">
                      <span className="term-heading">Frequent Terms & Nicknames Detected:</span>
                      <div className="terms-chips">
                        {formData.whatsappParsedData.frequentTerms.map((term, i) => (
                          <span key={i} className="term-chip">
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* OPTION 2: Document & Memory Files Upload Panel */}
            {formData.step2ActiveTab === 'documents' && (
              <div className="mode-panel-wrapper">
                <div className="ingestion-dual-grid">
                  {/* Left Dropzone */}
                  <div className="dropzone-box">
                    <input
                      type="file"
                      id="doc-files-input"
                      multiple
                      accept=".pdf,.txt,.docx,.doc,.md,.json"
                      onChange={handleDocumentUpload}
                      className="hidden-file-input"
                    />
                    <label htmlFor="doc-files-input" className="dropzone-content">
                      <div className="dropzone-icon-ring">
                        <FileText size={32} />
                      </div>
                      <h4>Upload Documents & Memory Files</h4>
                      <p>Attach PDFs, text documents, Word files, letters, transcripts, or diaries (.pdf, .txt, .docx, .md).</p>
                      <span className="dropzone-cta-pill">
                        <Paperclip size={14} />
                        <span>Select Documents from Computer</span>
                      </span>
                    </label>

                    {/* Attached Documents List */}
                    {formData.contextDocuments.length > 0 && (
                      <div className="attached-docs-list">
                        <div className="attached-docs-header">
                          <CheckCircle2 size={15} className="text-emerald-500" />
                          <span>{formData.contextDocuments.length} Document(s) Attached & Indexed:</span>
                        </div>
                        {formData.contextDocuments.map((doc) => (
                          <div key={doc.id} className="doc-item-row">
                            <div className="doc-item-left">
                              <FileText size={16} className="text-zinc-600" />
                              <div className="doc-item-info">
                                <span className="doc-item-title">{doc.name}</span>
                                <span className="doc-item-meta">{doc.size} • {doc.type}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDocument(doc.id)}
                              className="doc-remove-btn"
                              title="Remove file"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Info & Presets */}
                  <div className="whatsapp-guide-panel">
                    <div className="guide-card-header">
                      <Info size={16} />
                      <h4>What kind of documents work best?</h4>
                    </div>
                    <ul className="guide-steps-list">
                      <li><strong>Old Letters & Postcards:</strong> Captures their handwriting cadence, greetings, and affection.</li>
                      <li><strong>Family Recipes & Notes:</strong> Teaches the avatar favorite dishes and kitchen wisdom.</li>
                      <li><strong>Diaries & Journal Entries:</strong> Grounds their worldview and reflections on life.</li>
                      <li><strong>Biographies or Eulogies:</strong> Provides a rich factual timeline of their life milestones.</li>
                    </ul>

                    <div className="or-divider">
                      <span>OR TRY INSTANT DEMO</span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          contextDocuments: [
                            { id: 1, name: 'Grandpa_Memories_and_Recipes.pdf', size: '1.4 MB', type: 'PDF' },
                            { id: 2, name: '1974_Precision_Foundry_Journals.txt', size: '48 KB', type: 'TXT' },
                          ],
                        }))
                      }
                      className="load-demo-chat-btn"
                    >
                      <Sparkles size={14} />
                      <span>Simulate Attaching Sample Letters (PDF + TXT)</span>
                    </button>
                  </div>
                </div>

                {/* Document Vector Index Metrics */}
                {formData.contextDocuments.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="parsed-insights-box"
                  >
                    <div className="insights-header">
                      <Sparkles size={16} className="text-zinc-900" />
                      <h4>Vector RAG Store Ready</h4>
                    </div>
                    <div className="insights-grid">
                      <div className="insight-metric">
                        <span className="metric-val">{formData.contextDocuments.length}</span>
                        <span className="metric-lbl">Files Processed</span>
                      </div>
                      <div className="insight-metric">
                        <span className="metric-val">{formData.contextDocuments.length * 18}</span>
                        <span className="metric-lbl">Knowledge Chunks Indexed</span>
                      </div>
                      <div className="insight-metric">
                        <span className="metric-val">all-MiniLM-L6-v2</span>
                        <span className="metric-lbl">Semantic Embedding Model</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* OPTION 3: Write Context by Hand Panel */}
            {formData.step2ActiveTab === 'written' && (
              <div className="mode-panel-wrapper">
                <div className="written-context-card">
                  <div className="written-card-header">
                    <div className="written-header-title">
                      <Edit3 size={17} />
                      <h4>Write or Paste Memories in Your Own Words</h4>
                    </div>
                    <div className="written-stats">
                      <span>
                        {formData.writtenContextNotes.trim()
                          ? `${formData.writtenContextNotes.trim().split(/\s+/).length} Words`
                          : '0 Words'}
                      </span>
                      <span>•</span>
                      <span>{formData.writtenContextNotes.length} Characters</span>
                    </div>
                  </div>

                  <p className="written-instruction">
                    Describe their childhood, career milestones, habits, favorite advice, or things they always told you.
                    The AI engine will use this as foundational knowledge when conversing.
                  </p>

                  <textarea
                    rows={8}
                    placeholder="Write anything you want the avatar to remember:
- What was their morning or evening routine?
- How did they comfort you when you were sad or stressed?
- What were their famous phrases or advice about marriage, money, or work?
- What are some funny or touching family stories they loved retelling?"
                    value={formData.writtenContextNotes}
                    onChange={(e) => setFormData({ ...formData, writtenContextNotes: e.target.value })}
                    className="stage-textarea full-written-textarea"
                  />

                  {/* Prompt Inspirer Chips */}
                  <div className="prompt-inspirers-bar">
                    <span className="inspirer-label">Click to insert memory starter:</span>
                    <div className="inspirer-chips">
                      <button
                        type="button"
                        onClick={() =>
                          handleInsertPromptNote(
                            'Favorite advice on hard days: "You do not control the weather, beta; you only control your umbrella. Focus on three small steps today and take a quiet breath."'
                          )
                        }
                        className="inspirer-chip"
                      >
                        + Advice on Hard Days
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleInsertPromptNote(
                            'Sunday Morning Ritual: "Always loved sitting on the veranda at 7 AM with black pepper ginger tea, listening to old radio songs and feeding breadcrumbs to the courtyard sparrows."'
                          )
                        }
                        className="inspirer-chip"
                      >
                        + Morning Ritual & Tea
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleInsertPromptNote(
                            'Philosophy on Work: "Never cut corners on what people cannot see. When you build with honesty, time is your friend, not your enemy."'
                          )
                        }
                        className="inspirer-chip"
                      >
                        + Philosophy on Work
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            writtenContextNotes:
                              'Dadaji was born in 1948 in Karnataka. He worked for 32 years with precision machining and was famous in the family for saying: "When you build something with honesty, time works on your side, not against you." Every Sunday morning, he sat on the veranda listening to All India Radio while teaching us how to tune bicycle gears. He never lost his temper, loved black pepper ginger tea, and always put family first.',
                          }))
                        }
                        className="inspirer-chip sample-load"
                      >
                        <Sparkles size={12} />
                        <span>Load Sample Notes</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Omni-Context Summary Box: Shows status of all 3 streams */}
            <div className="omni-context-summary">
              <div className="summary-header-row">
                <Sparkles size={15} className="text-zinc-900" />
                <h4>Summary of Memory Context Attached</h4>
              </div>
              <div className="summary-items-grid">
                <div className="summary-item">
                  <span className="summary-source-label">1. WhatsApp Chats:</span>
                  <span className={`summary-source-val ${formData.whatsappFileName ? 'has-data' : ''}`}>
                    {formData.whatsappFileName
                      ? `${formData.whatsappMessagesCount} Messages (${formData.whatsappFileName})`
                      : 'Not provided yet'}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-source-label">2. Document Files:</span>
                  <span className={`summary-source-val ${formData.contextDocuments.length > 0 ? 'has-data' : ''}`}>
                    {formData.contextDocuments.length > 0
                      ? `${formData.contextDocuments.length} file(s) attached`
                      : 'None attached'}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-source-label">3. Handwritten Notes:</span>
                  <span className={`summary-source-val ${formData.writtenContextNotes.trim() ? 'has-data' : ''}`}>
                    {formData.writtenContextNotes.trim()
                      ? `${formData.writtenContextNotes.trim().split(/\s+/).length} words written`
                      : 'None written'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stage Actions */}
            <div className="stage-actions-bar">
              <button onClick={() => setCurrentStep(1)} className="stage-back-btn">
                <ArrowLeft size={16} />
                <span>Back to Identity</span>
              </button>
              <button onClick={() => setCurrentStep(3)} className="stage-continue-btn">
                <span>Continue to Voice Cloning</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.section>
        )}

        {/* STEP 3: Voice Ingestion & Audio Cloning */}
        {currentStep === 3 && (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="studio-stage-card"
          >
            <div className="stage-header">
              <span className="stage-pill-tag">Phase 03: Acoustic Timbre & Voiceprint</span>
              <h2 className="stage-title">Upload Audio or Record Their Voice</h2>
              <p className="stage-description">
                Just 1 to 5 minutes of clean audio—from old voicemails, recorded phone calls, or
                WhatsApp voice notes—is enough to clone their vocal tone and resonance.
              </p>
            </div>

            <div className="ingestion-dual-grid">
              {/* Option A: Upload Voice File */}
              <div className="dropzone-box">
                <input
                  type="file"
                  id="audio-file-input"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden-file-input"
                />
                <label htmlFor="audio-file-input" className="dropzone-content">
                  <div className="dropzone-icon-ring">
                    <Mic size={32} />
                  </div>
                  <h4>Upload Voice Notes (.mp3, .wav, .opus, .m4a)</h4>
                  <p>Upload WhatsApp voice messages, phone voicemails, or home video audio.</p>
                  <span className="dropzone-cta-pill">
                    <Upload size={14} />
                    <span>Choose Audio Files</span>
                  </span>
                </label>

                {formData.audioFileName && (
                  <div className="uploaded-file-banner">
                    <Volume2 size={18} className="text-emerald-500" />
                    <div className="file-meta">
                      <span className="file-name">{formData.audioFileName}</span>
                      <span className="file-sub">Duration: {formData.audioDuration} • Noise Filtered</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Option B: Direct In-Browser Microphone Recording */}
              <div className="mic-record-panel">
                <div className="mic-panel-header">
                  <Radio size={18} className={formData.isRecording ? 'text-rose-500 animate-pulse' : ''} />
                  <h4>Direct Browser Microphone Recording</h4>
                </div>
                <p className="mic-panel-sub">
                  Play an old voicemail near your microphone or record your own sample phrase to
                  test vocal acoustic extraction.
                </p>

                {/* Animated Waveform Simulation */}
                <div className={`live-wave-screen ${formData.isRecording ? 'active' : ''}`}>
                  <div className="wave-bars-flex">
                    {[30, 60, 95, 45, 80, 100, 70, 40, 85, 55, 90, 40, 75, 95, 50, 80, 65, 35].map(
                      (h, i) => (
                        <span
                          key={i}
                          className={`wave-col ${formData.isRecording ? 'pulse' : ''}`}
                          style={{
                            height: formData.isRecording ? `${h}%` : '20%',
                            animationDelay: `${(i % 5) * 0.15}s`,
                          }}
                        />
                      )
                    )}
                  </div>
                  <span className="record-time-stamp">
                    {formData.isRecording
                      ? `Recording: 0:${formData.recordingTime.toString().padStart(2, '0')}`
                      : 'Microphone Standby'}
                  </span>
                </div>

                <div className="record-actions-row">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`record-toggle-btn ${formData.isRecording ? 'recording' : ''}`}
                  >
                    <Mic size={16} />
                    <span>{formData.isRecording ? 'Stop Recording' : 'Start Recording via Mic'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        audioFileName: 'Dadaji_Sunday_Voicemail_1998.wav',
                        audioDuration: '1:14',
                        voiceTimbreAnalyzed: true,
                      }))
                    }
                    className="load-demo-chat-btn"
                  >
                    <span>Use Sample Voicemail</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Acoustic Analysis Meter */}
            {formData.voiceTimbreAnalyzed && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="acoustic-analysis-box"
              >
                <div className="acoustic-header">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <h4>Acoustic Timbre Analysis Successful</h4>
                </div>
                <div className="acoustic-metrics-grid">
                  <div className="acoustic-item">
                    <span className="acoustic-label">Fundamental Pitch</span>
                    <span className="acoustic-value">118 Hz (Warm Baritone)</span>
                  </div>
                  <div className="acoustic-item">
                    <span className="acoustic-label">Vocal Cadence</span>
                    <span className="acoustic-value">Measured, Gentle Pauses</span>
                  </div>
                  <div className="acoustic-item">
                    <span className="acoustic-label">Noise Floor Isolation</span>
                    <span className="acoustic-value">99.4% Isolated & Cleaned</span>
                  </div>
                  <div className="acoustic-item">
                    <span className="acoustic-label">OpenVoice Embedding</span>
                    <span className="acoustic-value">Ready for Real-Time TTS</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Stage Actions */}
            <div className="stage-actions-bar">
              <button onClick={() => setCurrentStep(2)} className="stage-back-btn">
                <ArrowLeft size={16} />
                <span>Back to WhatsApp</span>
              </button>
              <button onClick={() => setCurrentStep(4)} className="stage-continue-btn">
                <span>Continue to Portrait Photo</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.section>
        )}

        {/* STEP 4: Portrait Photograph & Face Canvas */}
        {currentStep === 4 && (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="studio-stage-card"
          >
            <div className="stage-header">
              <span className="stage-pill-tag">Phase 04: Visual Facial Representation</span>
              <h2 className="stage-title">Upload a Portrait Photograph</h2>
              <p className="stage-description">
                Upload a clear picture of their face. Front-facing portraits with good lighting yield
                the most natural, expressive avatar with real-time gaze and lip synchronization.
              </p>
            </div>

            <div className="photo-stage-grid">
              {/* Dropzone on left */}
              <div className="photo-upload-container">
                <input
                  type="file"
                  id="photo-file-input"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden-file-input"
                />
                <label htmlFor="photo-file-input" className="photo-dropzone">
                  <div className="dropzone-icon-ring">
                    <ImageIcon size={32} />
                  </div>
                  <h4>Upload High-Resolution Photo (.jpg, .png)</h4>
                  <p>Vintage photographs, family portraits, or holiday snapshots all work seamlessly.</p>
                  <span className="dropzone-cta-pill">
                    <Upload size={14} />
                    <span>Choose Photo File</span>
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      photoPreviewUrl:
                        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
                    }))
                  }
                  className="sample-photo-btn"
                >
                  <Sparkles size={14} />
                  <span>Use Sample Portrait (Grandfather Ramesh)</span>
                </button>
              </div>

              {/* Live Face Preview Frame on right */}
              <div className="photo-preview-card">
                <div className="preview-aspect-box">
                  {formData.photoPreviewUrl ? (
                    <div className="live-avatar-preview-wrapper">
                      <img
                        src={formData.photoPreviewUrl}
                        alt="Uploaded portrait"
                        className="preview-photo-img"
                      />
                      <div className="face-target-mesh-overlay" />
                      <div className="face-detected-badge">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        <span>Facial Landmarks Detected (68 points)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-photo-placeholder">
                      <User size={48} className="empty-icon" />
                      <p>Upload a photograph to preview facial rigging & gaze calibration</p>
                    </div>
                  )}
                </div>

                <div className="photo-quality-checklist">
                  <div className="check-item">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Face clearly visible and centered</span>
                  </div>
                  <div className="check-item">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Calibrated for expressive micro-blinking & lip movement</span>
                  </div>
                  <div className="check-item">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Family vault private encryption verified</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Actions */}
            <div className="stage-actions-bar">
              <button onClick={() => setCurrentStep(3)} className="stage-back-btn">
                <ArrowLeft size={16} />
                <span>Back to Voice</span>
              </button>
              <button
                onClick={startSynthesis}
                disabled={!formData.name.trim()}
                className="stage-synthesis-btn"
              >
                <Sparkles size={16} />
                <span>Synthesize & Save to Family Vault</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.section>
        )}
      </main>
    </div>
  );
}
