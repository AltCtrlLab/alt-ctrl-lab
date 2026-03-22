// Design Tokens - Alt Ctrl Lab v2 (Fuchsia Brand Identity)

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

  // Brand palette
  accent: {
    primary: '#d946ef',      // fuchsia-500
    primaryGlow: '#e879f9',  // fuchsia-400
    secondary: '#22d3ee',    // cyan-400 (detail accent only)
    success: '#10b981',      // emerald-500
    warning: '#f59e0b',      // amber-500
    danger: '#f43f5e',       // rose-500
  },

  // Gradients
  gradients: {
    hero: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)',
    brandGlow: 'radial-gradient(circle, rgba(217,70,239,0.08) 0%, transparent 70%)',
    brandSubtle: 'radial-gradient(circle, rgba(217,70,239,0.04) 0%, transparent 50%)',
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
  glowBrand: '0 0 20px rgba(217, 70, 239, 0.15)',
  glowSubtle: '0 0 20px rgba(34, 211, 238, 0.1)',
};

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
};

export const motion = {
  stagger: { delay: 0.06, delayChildren: 0.1 },
  spring: { damping: 25, stiffness: 300 },
  springSnappy: { damping: 20, stiffness: 350 },
  duration: { fast: 0.15, normal: 0.25, slow: 0.4 },
  ease: [0.25, 0.1, 0.25, 1] as const,
};

// XP System Configuration
export const xpSystem = {
  levels: [
    { level: 1, title: 'Freelance Junior', xpRequired: 0, color: '#71717a' },
    { level: 2, title: 'Freelance Confirmé', xpRequired: 500, color: '#d946ef' },
    { level: 3, title: 'Studio Local', xpRequired: 1500, color: '#c026d3' },
    { level: 4, title: 'Studio Régional', xpRequired: 3500, color: '#a21caf' },
    { level: 5, title: 'Agence National', xpRequired: 7000, color: '#e879f9' },
    { level: 6, title: 'Agence International', xpRequired: 12000, color: '#22d3ee' },
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
  { id: 'speed_demon', name: 'Speed Demon', desc: 'Valider 5 tâches en une journée', icon: 'Zap', color: '#e879f9' },
  { id: 'quality_guru', name: 'Quality Guru', desc: '10 validations d\'affilée sans rework', icon: 'Award', color: '#34d399' },
  { id: 'night_owl', name: 'Night Owl', desc: 'Travailler après 22h', icon: 'Moon', color: '#d946ef' },
  { id: 'early_bird', name: 'Early Bird', desc: 'Première tâche avant 8h', icon: 'Sun', color: '#e879f9' },
  { id: 'streak_master', name: 'Streak Master', desc: '7 jours de suite sur la plateforme', icon: 'Flame', color: '#f43f5e' },
  { id: 'brief_king', name: 'Brief King', desc: 'Créer 20 briefs détaillés', icon: 'Crown', color: '#d946ef' },
];
