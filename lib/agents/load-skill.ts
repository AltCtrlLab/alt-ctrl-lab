/**
 * Système de chargement des fichiers .skill
 *
 * Convention :
 *   lib/agents/skills/[skill-name].skill.md
 *
 * Les .skill files définissent les compétences, la posture et les protocoles
 * de chaque agent spécialisé. Ils sont lus à runtime (côté serveur) et
 * embedés dans les prompts des agents OpenClaw.
 *
 * Sur Railway (pas de WSL), ces fichiers remplacent les COMPETENCES.md WSL.
 * Sur VPS/local, ils complètent les COMPETENCES.md (chargés automatiquement par exec-agent).
 */

import fs from 'fs';
import path from 'path';

const SKILLS_DIR = path.join(process.cwd(), 'lib', 'agents', 'skills');

/**
 * Charge un fichier .skill par son nom (sans extension).
 * Retourne le contenu ou une chaîne vide si le fichier n'existe pas.
 */
export function loadSkill(skillName: string): string {
  try {
    const filePath = path.join(SKILLS_DIR, `${skillName}.skill.md`);
    if (!fs.existsSync(filePath)) return '';
    return fs.readFileSync(filePath, 'utf-8').trim();
  } catch {
    return '';
  }
}

/**
 * Construit un prompt complet en préfixant les compétences skill.
 * Format identique à exec-agent.ts pour cohérence.
 */
export function buildPromptWithSkill(skillName: string, mission: string): string {
  const skill = loadSkill(skillName);
  if (!skill) return mission;
  return `${skill}\n\n---\n\n## MISSION REÇUE\n\n${mission}`;
}
