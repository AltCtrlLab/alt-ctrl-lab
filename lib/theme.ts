/**
 * F15 — Enhanced Theme System
 * Accent color system with CSS variables and localStorage persistence.
 */

export type AccentColor = 'fuchsia' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet';

export interface AccentPalette {
  300: string;
  400: string;
  500: string;
  600: string;
  glow: string;
  gradient: string;
}

export const ACCENT_PALETTES: Record<AccentColor, AccentPalette> = {
  fuchsia: {
    300: '232, 121, 249',
    400: '217, 70, 239',
    500: '192, 38, 211',
    600: '162, 28, 175',
    glow: 'rgba(217, 70, 239, 0.5)',
    gradient: 'from-fuchsia-500 to-fuchsia-600',
  },
  indigo: {
    300: '165, 180, 252',
    400: '129, 140, 248',
    500: '99, 102, 241',
    600: '79, 70, 229',
    glow: 'rgba(99, 102, 241, 0.5)',
    gradient: 'from-indigo-500 to-violet-500',
  },
  emerald: {
    300: '110, 231, 183',
    400: '52, 211, 153',
    500: '16, 185, 129',
    600: '5, 150, 105',
    glow: 'rgba(16, 185, 129, 0.5)',
    gradient: 'from-emerald-500 to-teal-500',
  },
  amber: {
    300: '252, 211, 77',
    400: '251, 191, 36',
    500: '245, 158, 11',
    600: '217, 119, 6',
    glow: 'rgba(245, 158, 11, 0.5)',
    gradient: 'from-amber-500 to-orange-500',
  },
  rose: {
    300: '253, 164, 175',
    400: '251, 113, 133',
    500: '244, 63, 94',
    600: '225, 29, 72',
    glow: 'rgba(244, 63, 94, 0.5)',
    gradient: 'from-rose-500 to-pink-500',
  },
  cyan: {
    300: '103, 232, 249',
    400: '34, 211, 238',
    500: '6, 182, 212',
    600: '8, 145, 178',
    glow: 'rgba(6, 182, 212, 0.5)',
    gradient: 'from-cyan-500 to-blue-500',
  },
  violet: {
    300: '196, 181, 253',
    400: '167, 139, 250',
    500: '139, 92, 246',
    600: '124, 58, 237',
    glow: 'rgba(139, 92, 246, 0.5)',
    gradient: 'from-violet-500 to-purple-500',
  },
};

export function applyAccentColor(accent: AccentColor): void {
  const palette = ACCENT_PALETTES[accent];
  const root = document.documentElement;
  root.style.setProperty('--accent-300', palette[300]);
  root.style.setProperty('--accent-400', palette[400]);
  root.style.setProperty('--accent-500', palette[500]);
  root.style.setProperty('--accent-600', palette[600]);
  root.style.setProperty('--accent-glow', palette.glow);
  localStorage.setItem('acl-accent', accent);
}

export function getStoredAccent(): AccentColor {
  if (typeof window === 'undefined') return 'fuchsia';
  return (localStorage.getItem('acl-accent') as AccentColor) || 'indigo';
}

export function getStoredSidebarExpanded(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('acl-sidebar-expanded') === 'true';
}

export function setStoredSidebarExpanded(expanded: boolean): void {
  localStorage.setItem('acl-sidebar-expanded', expanded ? 'true' : 'false');
}

export function getStoredDarkMode(): boolean {
  if (typeof window === 'undefined') return true;
  const v = localStorage.getItem('acl-dark');
  return v === null ? true : v !== 'false';
}

export function setStoredDarkMode(dark: boolean): void {
  localStorage.setItem('acl-dark', dark ? 'true' : 'false');
  document.documentElement.classList.toggle('light', !dark);
}

export function getTheme(isDark: boolean) {
  return {
    mainBg: isDark ? 'bg-neutral-950' : 'bg-[#F4F5F7]',
    textMain: isDark ? 'text-neutral-200' : 'text-neutral-800',
    textMuted: isDark ? 'text-neutral-400' : 'text-neutral-500',
    textHeading: isDark ? 'text-neutral-100' : 'text-neutral-900',
    glass: isDark
      ? 'bg-white/[0.03] border-white/[0.08] shadow-black/50'
      : 'bg-white/60 border-white/40 shadow-neutral-200/50',
    glassHover: isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-white/80',
    ambient: isDark ? 'bg-fuchsia-900/10' : 'bg-fuchsia-400/5',
    card: isDark
      ? 'bg-white/[0.03] border-white/[0.08]'
      : 'bg-white border-neutral-200',
    cardHover: isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-neutral-50',
    divider: isDark ? 'border-white/[0.08]' : 'border-neutral-200',
    input: isDark
      ? 'bg-white/[0.05] border-white/[0.1] text-white placeholder:text-neutral-500'
      : 'bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-400',
  };
}
