import {
  HAKIM_CORE_OS,
  HAKIM_PLAYBOOK_1_ANALYZE_BRIEF,
  HAKIM_PLAYBOOK_2_VALIDATE_QUALITY,
} from './prompts/hakim';

import {
  MUSAWWIR_CORE_OS,
  MUSAWWIR_PLAYBOOK_1_IDENTITY,
  MUSAWWIR_PLAYBOOK_2_CAMPAIGN,
} from './prompts/musawwir';

import {
  MATIN_CORE_OS,
  MATIN_PLAYBOOK_1_ARCHITECTURE,
  MATIN_PLAYBOOK_2_CODE_REVIEW,
} from './prompts/matin';

import {
  FATAH_CORE_OS,
  FATAH_PLAYBOOK_1_CRO_COPYWRITING,
  FATAH_PLAYBOOK_2_GROWTH_LOOP,
} from './prompts/fatah';

import {
  HASIB_CORE_OS,
  HASIB_PLAYBOOK_1_WORKFLOW,
  HASIB_PLAYBOOK_2_SCRAPING,
} from './prompts/hasib';

export type AgentName = 'hakim' | 'musawwir' | 'matin' | 'fatah' | 'hasib';

export type PlaybookId =
  | 'analyze_brief'
  | 'validate_quality'
  | 'identity'
  | 'campaign'
  | 'architecture'
  | 'code_review'
  | 'cro_copywriting'
  | 'growth_loop'
  | 'workflow'
  | 'scraping';

interface AgentConfig {
  coreOs: string;
  playbooks: Record<string, string>;
}

const AGENT_CONFIGS: Record<AgentName, AgentConfig> = {
  hakim: {
    coreOs: HAKIM_CORE_OS,
    playbooks: {
      analyze_brief: HAKIM_PLAYBOOK_1_ANALYZE_BRIEF,
      validate_quality: HAKIM_PLAYBOOK_2_VALIDATE_QUALITY,
    },
  },
  musawwir: {
    coreOs: MUSAWWIR_CORE_OS,
    playbooks: {
      identity: MUSAWWIR_PLAYBOOK_1_IDENTITY,
      campaign: MUSAWWIR_PLAYBOOK_2_CAMPAIGN,
    },
  },
  matin: {
    coreOs: MATIN_CORE_OS,
    playbooks: {
      architecture: MATIN_PLAYBOOK_1_ARCHITECTURE,
      code_review: MATIN_PLAYBOOK_2_CODE_REVIEW,
    },
  },
  fatah: {
    coreOs: FATAH_CORE_OS,
    playbooks: {
      cro_copywriting: FATAH_PLAYBOOK_1_CRO_COPYWRITING,
      growth_loop: FATAH_PLAYBOOK_2_GROWTH_LOOP,
    },
  },
  hasib: {
    coreOs: HASIB_CORE_OS,
    playbooks: {
      workflow: HASIB_PLAYBOOK_1_WORKFLOW,
      scraping: HASIB_PLAYBOOK_2_SCRAPING,
    },
  },
};

export class PromptManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromptManagerError';
  }
}

/**
 * Assemble le Core OS et le Playbook spécifique pour un agent donné
 * @param agentName - Nom de l'agent (hakim, musawwir, matin, fatah, hasib)
 * @param playbookId - ID du playbook à utiliser
 * @returns La string complète du prompt assemblé
 * @throws PromptManagerError si l'agent ou le playbook n'existe pas
 */
export function buildWorkerPrompt(
  agentName: AgentName,
  playbookId: PlaybookId
): string {
  const agentConfig = AGENT_CONFIGS[agentName];

  if (!agentConfig) {
    const validAgents = Object.keys(AGENT_CONFIGS).join(', ');
    throw new PromptManagerError(
      `Agent inconnu: "${agentName}". Agents valides: ${validAgents}`
    );
  }

  const playbook = agentConfig.playbooks[playbookId];

  if (!playbook) {
    const validPlaybooks = Object.keys(agentConfig.playbooks).join(', ');
    throw new PromptManagerError(
      `Playbook inconnu: "${playbookId}" pour l'agent "${agentName}". Playbooks valides: ${validPlaybooks}`
    );
  }

  // Assemble le prompt final avec séparation claire
  const assembledPrompt = `${agentConfig.coreOs}

---

# PLAYBOOK ACTIF

${playbook}

---

# INSTRUCTION FINALE

Tu es maintenant en mode exécution du PLAYBOOK ACTIF ci-dessus.
Respecte scrupuleusement l'algorithme étape par étape.
Retourne UNIQUEMENT le format JSON spécifié dans le Core OS.
`;

  return assembledPrompt;
}

/**
 * Récupère uniquement le Core OS d'un agent (pour contexte général)
 * @param agentName - Nom de l'agent
 * @returns Le Core OS de l'agent
 * @throws PromptManagerError si l'agent n'existe pas
 */
export function getCoreOs(agentName: AgentName): string {
  const agentConfig = AGENT_CONFIGS[agentName];

  if (!agentConfig) {
    const validAgents = Object.keys(AGENT_CONFIGS).join(', ');
    throw new PromptManagerError(
      `Agent inconnu: "${agentName}". Agents valides: ${validAgents}`
    );
  }

  return agentConfig.coreOs;
}

/**
 * Liste tous les agents disponibles
 * @returns Array des noms d'agents
 */
export function listAgents(): AgentName[] {
  return Object.keys(AGENT_CONFIGS) as AgentName[];
}

/**
 * Liste tous les playbooks disponibles pour un agent
 * @param agentName - Nom de l'agent
 * @returns Array des IDs de playbooks
 * @throws PromptManagerError si l'agent n'existe pas
 */
export function listPlaybooks(agentName: AgentName): PlaybookId[] {
  const agentConfig = AGENT_CONFIGS[agentName];

  if (!agentConfig) {
    const validAgents = Object.keys(AGENT_CONFIGS).join(', ');
    throw new PromptManagerError(
      `Agent inconnu: "${agentName}". Agents valides: ${validAgents}`
    );
  }

  return Object.keys(agentConfig.playbooks) as PlaybookId[];
}

/**
 * Vérifie si une combinaison agent/playbook est valide
 * @param agentName - Nom de l'agent
 * @param playbookId - ID du playbook
 * @returns boolean
 */
export function isValidCombination(
  agentName: string,
  playbookId: string
): boolean {
  const agent = AGENT_CONFIGS[agentName as AgentName];
  if (!agent) return false;
  return playbookId in agent.playbooks;
}

/**
 * Mapping des agent types vers leurs playbooks recommandés par défaut
 * Utile pour le Supervisor (Abdul Hakim) lors du routing
 */
export const DEFAULT_PLAYBOOKS: Record<AgentName, PlaybookId> = {
  hakim: 'analyze_brief',
  musawwir: 'identity',
  matin: 'architecture',
  fatah: 'cro_copywriting',
  hasib: 'workflow',
};

/**
 * Mapping des types de tâches vers agent + playbook
 * Utilisé par le Supervisor pour le routing automatique
 */
export const TASK_ROUTING_MAP: Record<string, { agent: AgentName; playbook: PlaybookId }> = {
  'branding_identity': { agent: 'musawwir', playbook: 'identity' },
  'branding_campaign': { agent: 'musawwir', playbook: 'campaign' },
  'web_architecture': { agent: 'matin', playbook: 'architecture' },
  'code_review': { agent: 'matin', playbook: 'code_review' },
  'cro_landing': { agent: 'fatah', playbook: 'cro_copywriting' },
  'growth_strategy': { agent: 'fatah', playbook: 'growth_loop' },
  'automation_workflow': { agent: 'hasib', playbook: 'workflow' },
  'data_scraping': { agent: 'hasib', playbook: 'scraping' },
  'supervisor_analyze': { agent: 'hakim', playbook: 'analyze_brief' },
  'supervisor_validate': { agent: 'hakim', playbook: 'validate_quality' },
};
