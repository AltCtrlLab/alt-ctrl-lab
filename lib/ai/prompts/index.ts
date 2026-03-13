// Core OS Prompts
export { HAKIM_CORE_OS } from './hakim';
export { MUSAWWIR_CORE_OS } from './musawwir';
export { MATIN_CORE_OS } from './matin';
export { FATAH_CORE_OS } from './fatah';
export { HASIB_CORE_OS } from './hasib';

// Playbooks
export { HAKIM_PLAYBOOK_1_ANALYZE_BRIEF, HAKIM_PLAYBOOK_2_VALIDATE_QUALITY } from './hakim';
export { MUSAWWIR_PLAYBOOK_1_IDENTITY, MUSAWWIR_PLAYBOOK_2_CAMPAIGN } from './musawwir';
export { MATIN_PLAYBOOK_1_ARCHITECTURE, MATIN_PLAYBOOK_2_CODE_REVIEW } from './matin';
export { FATAH_PLAYBOOK_1_CRO_COPYWRITING, FATAH_PLAYBOOK_2_GROWTH_LOOP } from './fatah';
export { HASIB_PLAYBOOK_1_WORKFLOW, HASIB_PLAYBOOK_2_SCRAPING } from './hasib';

// Mapping des agents pour utilisation dynamique
export const AGENT_NAMES = {
  HAKIM: 'hakim',
  MUSAWWIR: 'musawwir',
  MATIN: 'matin',
  FATAH: 'fatah',
  HASIB: 'hasib',
} as const;

export type AgentName = typeof AGENT_NAMES[keyof typeof AGENT_NAMES];
