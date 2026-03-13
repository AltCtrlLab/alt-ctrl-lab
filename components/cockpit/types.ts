// types.ts - Types pour le cockpit Alt Ctrl Lab

export type Status = 'idle' | 'running' | 'completed' | 'error' | 'paused';

// ⭐ NOUVEAU: Services disponibles (Pattern Gateway)
export type ServiceId = 'full_agency' | 'branding' | 'web_dev' | 'marketing' | 'data';

export interface Service {
  id: ServiceId;
  name: string;
  description: string;
  icon: string;
  director: string; // Le directeur associé
  color: string;
}

// Configuration des services (mapping strict)
export const SERVICES: Service[] = [
  {
    id: 'full_agency',
    name: 'Full Agency',
    description: 'Orchestration complète par le CEO (tous les pôles)',
    icon: '🧠',
    director: 'abdulhakim',
    color: '#4F46E5'
  },
  {
    id: 'branding',
    name: 'Branding & Design',
    description: 'Identité visuelle, UI/UX, Design System',
    icon: '🎨',
    director: 'musawwir',
    color: '#EC4899'
  },
  {
    id: 'web_dev',
    name: 'Web Development',
    description: 'Architecture, code, APIs, Performance',
    icon: '💻',
    director: 'matin',
    color: '#10B981'
  },
  {
    id: 'marketing',
    name: 'Marketing & Growth',
    description: 'Stratégie, copywriting, SEO, CRO',
    icon: '📈',
    director: 'fatah',
    color: '#F59E0B'
  },
  {
    id: 'data',
    name: 'Data & Automation',
    description: 'Pipelines, intégrations, workflows',
    icon: '⚙️',
    director: 'hasib',
    color: '#6B7280'
  }
];

// Mapping service → director (strict)
export const SERVICE_TO_DIRECTOR: Record<ServiceId, string> = {
  'full_agency': 'abdulhakim',
  'branding': 'musawwir',
  'web_dev': 'matin',
  'marketing': 'fatah',
  'data': 'hasib'
};

export interface Agent {
  id: string;
  name: string;
  avatar?: string;
  status: Status;
  lastSeen?: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: Status;
  agentId: string;
  createdAt: Date;
  updatedAt?: Date;
  estimatedDuration?: number;
  priority?: 'low' | 'medium' | 'high';
  serviceId?: ServiceId; // ⭐ NOUVEAU
}

// ⭐ NOUVEAU: Types pour TaskTimeline polymorphe
export type TaskMode = 'full_agency' | 'director_direct';
export type TaskStatus = 'PENDING' | 'PLANNING' | 'EXECUTING' | 'REJECTED' | 'VALIDATED' | 'COMPLETED' | 'FORCED_VALIDATION';

export interface TimelineTask {
  id: string;
  title: string;
  agent: string;
  status: TaskStatus;
  mode: TaskMode;
  parentId?: string;
  depth: number;
  timestamp: Date;
  feedback?: string;
  log?: string;
}
