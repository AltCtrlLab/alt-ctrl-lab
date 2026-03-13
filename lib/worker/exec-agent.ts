/**
 * 🔧 CORE EXECUTOR - Single Source of Truth
 *
 * Exécute un agent OpenClaw (WSL) de manière robuste et fiable.
 * Gestion complète: nettoyage, spawn, timeout, graceful shutdown.
 *
 * Chaque agent charge ses COMPETENCES.md au démarrage pour endosser
 * pleinement son rôle spécialisé avant de traiter le prompt.
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Charge le fichier COMPETENCES.md de l'agent depuis WSL
// Retourne le contenu ou une chaîne vide si le fichier n'existe pas
async function loadAgentCompetences(agentId: string): Promise<string> {
  try {
    const { stdout } = await execPromise(
      `wsl bash -c "cat ~/.openclaw/agents/${agentId}/COMPETENCES.md 2>/dev/null || echo ''"`
    );
    const content = stdout.trim();
    if (!content) return '';
    return content;
  } catch {
    return '';
  }
}

// Chemin complet vers openclaw dans WSL (npm-global, hors PATH par défaut)
const OPENCLAW_BIN = '/home/user/.npm-global/bin/openclaw';
const WSL_WORKSPACE = '/home/user/.openclaw/workspace';

// Exposé pour compatibilité avec les imports existants
export const WORKSPACE_DIR = WSL_WORKSPACE;

export interface AgentExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

/**
 * Exécute un agent OpenClaw via WSL avec gestion robuste des erreurs
 *
 * @param agentId - ID de l'agent (ex: 'abdulkhabir', 'matin')
 * @param prompt - Prompt à envoyer à l'agent
 * @param timeoutMs - Timeout en millisecondes (défaut: 900000 = 15min)
 */
export async function executeOpenClawAgent(
  agentId: string,
  prompt: string,
  timeoutMs: number = 900000
): Promise<AgentExecutionResult> {
  // Nettoyage préventif des locks via WSL
  try {
    await execPromise(`wsl bash -c "pkill -f 'openclaw agent --agent ${agentId}' || true"`);
    await execPromise(`wsl bash -c "rm -f ~/.openclaw/agents/${agentId}/sessions/*.lock"`);
  } catch (e) {
    // Ignorer les erreurs de nettoyage
  }

  // Charger les compétences de l'agent et les préfixer au prompt
  const competences = await loadAgentCompetences(agentId);
  const fullPrompt = competences
    ? `${competences}\n\n---\n\n## MISSION REÇUE\n\n${prompt}`
    : prompt;

  if (competences) {
    console.log(`[CoreExecutor] Loaded COMPETENCES.md for ${agentId} (${competences.length} chars)`);
  }

  return new Promise((resolve) => {
    const timeoutSec = Math.floor(timeoutMs / 1000);

    // Prompt échappé pour passer via bash -c
    const escapedPrompt = fullPrompt.replace(/'/g, `'\\''`);

    // Les agents R&D (abdulkhabir, abdulbasir) ne sont pas enregistrés → fallback sur main
    const REGISTERED_AGENTS = ['main', 'musawwir', 'matin', 'fatah', 'hasib', 'raqim', 'banna', 'khatib', 'sani'];
    const resolvedAgent = REGISTERED_AGENTS.includes(agentId) ? agentId : 'main';

    const bashCmd = [
      `export PATH=/home/user/.npm-global/bin:/usr/local/bin:/usr/bin:/bin`,
      `&& cd ${WSL_WORKSPACE}`,
      `&& ${OPENCLAW_BIN} agent`,
      `--agent ${resolvedAgent}`,
      `--message '${escapedPrompt}'`,
      `--local`,
      `--timeout ${timeoutSec}`,
    ].join(' ');

    const resolvedAgentForLog = ['main','musawwir','matin','fatah','hasib','raqim','banna','khatib','sani'].includes(agentId) ? agentId : `main (fallback from ${agentId})`;
    console.log(`[CoreExecutor] openclaw --agent ${resolvedAgentForLog} (${timeoutMs}ms)`);

    const child = spawn('wsl', ['bash', '-c', bashCmd], {
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    let stdout = '';
    let stderr = '';
    let isResolved = false;

    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    const timeout = setTimeout(() => {
      if (isResolved) return;
      console.warn(`[CoreExecutor] Timeout for ${agentId}, sending SIGTERM...`);
      child.kill('SIGTERM');

      setTimeout(() => {
        if (isResolved) return;
        console.error(`[CoreExecutor] SIGKILL for ${agentId}`);
        child.kill('SIGKILL');
        isResolved = true;
        resolve({ success: false, stdout, stderr: `Timeout after ${timeoutMs}ms` });
      }, 3000);
    }, timeoutMs);

    child.on('close', (code: number | null) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeout);
      resolve({ success: code === 0, stdout: stdout.trim(), stderr: stderr.trim() });
    });

    child.on('error', (err: Error) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeout);
      resolve({ success: false, stdout, stderr: err.message });
    });
  });
}
