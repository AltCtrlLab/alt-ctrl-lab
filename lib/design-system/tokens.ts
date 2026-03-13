// Design Tokens - Alt Ctrl Lab (Harmonisé)

export const colors = {
  // Backgrounds
  bg: {
    primary: '#09090b',      // zinc-950
    secondary: '#18181b',    // zinc-900
    tertiary: '#27272a',     // zinc-800
    elevated: '#3f3f46',     // zinc-700
  },
  
  // Text
  text: {
    primary: '#fafafa',      // zinc-50
    secondary: '#a1a1aa',    // zinc-400
    tertiary: '#71717a',     // zinc-500
    muted: '#52525b',        // zinc-600
  },
  
  // Accent unique (Cyan/Blue subtil)
  accent: {
    primary: '#06b6d4',      // cyan-500
    primaryGlow: '#22d3ee',  // cyan-400
    secondary: '#3b82f6',    // blue-500
    success: '#10b981',      // emerald-500
    warning: '#f59e0b',      // amber-500
    danger: '#f43f5e',       // rose-500
  },
  
  // Agents Colors (Tons subtils, pas flashy)
  agents: {
    hakim: '#60a5fa',        // blue-400 (plus soft)
    musawwir: '#f472b6',     // pink-400 (plus soft)
    matin: '#34d399',        // emerald-400 (plus soft)
    fatah: '#fbbf24',        // amber-400 (plus soft)
    hasib: '#a78bfa',        // violet-400 (plus soft)
  },
  
  // Gradients subtils
  gradients: {
    hero: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #27272a 100%)',
    glowCyan: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
    glowAmber: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)',
    xpBar: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
  },
};

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
};

export const borderRadius = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
  glowCyan: '0 0 20px rgba(6, 182, 212, 0.15)',
  glowAmber: '0 0 20px rgba(245, 158, 11, 0.15)',
};

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
};

// XP System Configuration
export const xpSystem = {
  levels: [
    { level: 1, title: 'Freelance Junior', xpRequired: 0, color: '#71717a' },
    { level: 2, title: 'Freelance Confirmé', xpRequired: 500, color: '#06b6d4' },
    { level: 3, title: 'Studio Local', xpRequired: 1500, color: '#3b82f6' },
    { level: 4, title: 'Studio Régional', xpRequired: 3500, color: '#8b5cf6' },
    { level: 5, title: 'Agence National', xpRequired: 7000, color: '#ec4899' },
    { level: 6, title: 'Agence International', xpRequired: 12000, color: '#f59e0b' },
    { level: 7, title: 'Alt Ctrl Lab Elite', xpRequired: 20000, color: '#10b981' },
  ],
  
  rewards: {
    taskComplete: 100,
    taskValidated: 200,
    streakBonus: 50,
    perfectWeek: 500,
    firstProject: 300,
  },
};

// Badge System
export const badges = [
  { id: 'speed_demon', name: 'Speed Demon', desc: 'Valider 5 tâches en une journée', icon: 'Zap', color: '#fbbf24' },
  { id: 'quality_guru', name: 'Quality Guru', desc: '10 validations d\'affilée sans rework', icon: 'Award', color: '#34d399' },
  { id: 'night_owl', name: 'Night Owl', desc: 'Travailler après 22h', icon: 'Moon', color: '#a78bfa' },
  { id: 'early_bird', name: 'Early Bird', desc: 'Première tâche avant 8h', icon: 'Sun', color: '#fbbf24' },
  { id: 'streak_master', name: 'Streak Master', desc: '7 jours de suite sur la plateforme', icon: 'Flame', color: '#f87171' },
  { id: 'brief_king', name: 'Brief King', desc: 'Créer 20 briefs détaillés', icon: 'Crown', color: '#f472b6' },
];
