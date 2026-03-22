/**
 * Centralized agent definitions for the entire cockpit.
 * Single source of truth — consumed by BriefInput, orchestrate routes, Sidebar, PIL, etc.
 */

export interface AgentDef {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  type: 'supervisor' | 'director' | 'executor';
}

export const AGENTS: AgentDef[] = [
  { id: 'abdulhakim', name: 'AbdulHakim', role: 'CEO/Superviseur', emoji: '\u{1F454}', color: '#D946EF', type: 'supervisor' },
  { id: 'musawwir', name: 'Musawwir', role: 'DA Senior (Directeur Cr\u00e9ation)', emoji: '\u{1F3A8}', color: '#D946EF', type: 'director' },
  { id: 'matin', name: 'Matin', role: 'Lead Dev (Directeur Technique)', emoji: '\u{1F4BB}', color: '#10B981', type: 'director' },
  { id: 'fatah', name: 'Fatah', role: 'CGO (Directeur Growth)', emoji: '\u{1F4C8}', color: '#F59E0B', type: 'director' },
  { id: 'hasib', name: 'Hasib', role: 'Architect (Directeur Data)', emoji: '\u2699\uFE0F', color: '#6B7280', type: 'director' },
  { id: 'raqim', name: 'Raqim', role: 'Ex\u00e9cutant Cr\u00e9ation (UI)', emoji: '\u{1F58C}\uFE0F', color: '#D946EF', type: 'executor' },
  { id: 'banna', name: 'Banna', role: 'Ex\u00e9cutant Dev (Code)', emoji: '\u{1F527}', color: '#10B981', type: 'executor' },
  { id: 'khatib', name: 'Khatib', role: 'Ex\u00e9cutant Copy (Marketing)', emoji: '\u270D\uFE0F', color: '#F59E0B', type: 'executor' },
  { id: 'sani', name: 'Sani', role: 'Ex\u00e9cutant Data (Automations)', emoji: '\u{1F50C}', color: '#6B7280', type: 'executor' },
];

/** Director → Executor mapping */
export const TEAM_MAPPING: Record<string, string> = {
  musawwir: 'raqim',
  matin: 'banna',
  fatah: 'khatib',
  hasib: 'sani',
};

/** Executor → Director (reverse) */
export const EXECUTOR_TO_DIRECTOR: Record<string, string> = Object.fromEntries(
  Object.entries(TEAM_MAPPING).map(([d, e]) => [e, d]),
);

/** Director → Service label */
export const DIRECTOR_TO_SERVICE: Record<string, string> = {
  abdulhakim: 'Full Agency',
  musawwir: 'Branding & Design',
  matin: 'Web Development',
  fatah: 'Marketing & Growth',
  hasib: 'Data & Automation',
};

/** Valid director→executor pairs (for route validation) */
export const VALID_PAIRS: Record<string, string[]> = {
  musawwir: ['raqim'],
  matin: ['banna'],
  fatah: ['khatib'],
  hasib: ['sani'],
};

/** Agent IDs registered for OpenClaw execution */
export const REGISTERED_AGENT_IDS = ['main', ...AGENTS.map(a => a.id)] as const;

/** Stage labels for task status display (used in branding, marketing, web-dev, PIL) */
export const STAGE_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  DIRECTOR_PLANNING: 'Planification en cours...',
  EXECUTOR_DRAFTING: 'Cr\u00e9ation en cours...',
  DIRECTOR_QA: 'Audit qualit\u00e9...',
  EXECUTOR_REVISING: 'R\u00e9vision en cours...',
  COMPLETED: 'Livrable valid\u00e9',
  FAILED: '\u00c9chec',
  FAILED_QA: '\u00c9chec',
  APPROVED: 'Approuv\u00e9',
  REJECTED: 'Rejet\u00e9',
};

/** Active vs done status sets */
export const ACTIVE_STATUSES = ['PENDING', 'DIRECTOR_PLANNING', 'EXECUTOR_DRAFTING', 'DIRECTOR_QA', 'EXECUTOR_REVISING'] as const;
export const DONE_STATUSES = ['COMPLETED', 'FAILED', 'FAILED_QA'] as const;

/** Helper: get agent by ID */
export function getAgent(id: string): AgentDef | undefined {
  return AGENTS.find(a => a.id === id);
}

/** Helper: get all directors */
export function getDirectors(): AgentDef[] {
  return AGENTS.filter(a => a.type === 'director');
}

/** Helper: get all executors */
export function getExecutors(): AgentDef[] {
  return AGENTS.filter(a => a.type === 'executor');
}

/** Clickable brief examples per agent (used on /branding, /web-dev, /marketing pages) */
export const AGENT_BRIEF_EXAMPLES: Record<string, string[]> = {
  musawwir: [
    'Crée un logo minimaliste pour une startup fintech nommée "PayFlow"',
    "Propose une palette de couleurs premium pour un cabinet d'avocats",
    'Génère un brandboard complet pour une marque de cosmétiques bio',
    'Redesign le logo AltCtrl.Lab avec une variante monochrome',
  ],
  matin: [
    'Crée une landing page responsive avec hero, features et CTA',
    'Intègre un formulaire de contact avec validation Zod et envoi email',
    "Optimise les Core Web Vitals de la page d'accueil (LCP, CLS)",
    'Ajoute un système de thème dark/light avec Tailwind et cookies',
  ],
  fatah: [
    'Crée une stratégie de contenu LinkedIn pour une agence digitale B2B',
    "Rédige 5 accroches publicitaires Meta Ads pour un e-commerce de mode",
    "Analyse les mots-clés SEO prioritaires pour un SaaS de gestion RH",
    'Propose un plan de lancement produit sur 4 semaines avec budget 5k€',
  ],
};
