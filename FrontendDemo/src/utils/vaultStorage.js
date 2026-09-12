// vaultStorage.js - Manages locally stored family avatars

const STORAGE_KEY = 'kin_ai_family_vault_avatars';

export const defaultVaultAvatars = [
  {
    id: 'ramesh-dadaji',
    name: 'Ramesh Vance Sharma',
    callingName: 'Dadaji',
    relation: 'Grandfather',
    lifespan: '1948 – 2023',
    hometown: 'Bengaluru, India',
    photoUrl: '/grandfather.jpg',
    catchphrases: ['Sab theek ho jayega, beta', 'Take things one step at a time', 'Never go to sleep angry'],
    personalitySummary: 'A deeply calm, philosophical soul who worked in precision tooling and gave gentle advice using gardening metaphors.',
    contextSourcesSummary: '1,420 WhatsApp Chats • 2 Documents • Voice Cloned',
    createdAt: 'Sep 2026',
    voiceTrained: true,
    sampleQuestions: [
      '“Grandpa, what advice would you give me when life feels overwhelming?”',
      '“Tell me how you and Grandma decided to buy the house in 1978?”',
      '“What was your favorite memory of us in the garden?”'
    ]
  },
  {
    id: 'maya-mother',
    name: 'Maya Devi Sharma',
    callingName: 'Maa',
    relation: 'Mother',
    lifespan: '1954 – 2021',
    hometown: 'Jaipur, India',
    photoUrl: '/grandmother.jpg',
    catchphrases: ['Drink some warm ginger water', 'I am always proud of you', 'Your kindness is your strength'],
    personalitySummary: 'Warm, highly empathetic, loved evening tea rituals and encouraging everyone to stay curious.',
    contextSourcesSummary: '840 WhatsApp Chats • 12 Voice Notes',
    createdAt: 'Aug 2026',
    voiceTrained: true,
    sampleQuestions: [
      '“Maa, I miss you. How do you deal with heavy days?”',
      '“Can you remind me how to make your ginger cardamom tea?”',
      '“What is one thing you always wanted me to remember?”'
    ]
  }
];

export function getVaultAvatars() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultVaultAvatars));
      return defaultVaultAvatars;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultVaultAvatars));
      return defaultVaultAvatars;
    }
    // Auto-migrate legacy avatars with mock Unsplash photos to authentic assets
    let updated = false;
    const sanitized = parsed.map((item) => {
      if (!item.photoUrl || item.photoUrl.includes('unsplash.com')) {
        updated = true;
        if (
          item.id === 'ramesh-dadaji' ||
          (item.name && item.name.includes('Ramesh')) ||
          item.relation === 'Grandfather'
        ) {
          return { ...item, photoUrl: '/grandfather.jpg' };
        } else if (
          item.id === 'maya-mother' ||
          (item.name && item.name.includes('Maya')) ||
          item.relation === 'Mother'
        ) {
          return { ...item, photoUrl: '/grandmother.jpg' };
        } else {
          return { ...item, photoUrl: '/grandfather.jpg' };
        }
      }
      return item;
    });
    if (updated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return defaultVaultAvatars;
  }
}

export function saveAvatarToVault(newAvatar) {
  try {
    const current = getVaultAvatars();
    // Add new avatar to top
    const updated = [newAvatar, ...current.filter((a) => a.id !== newAvatar.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save avatar to vault:', e);
    return defaultVaultAvatars;
  }
}

export function deleteAvatarFromVault(avatarId) {
  try {
    const current = getVaultAvatars();
    const updated = current.filter((a) => a.id !== avatarId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to delete avatar from vault:', e);
    return [];
  }
}
