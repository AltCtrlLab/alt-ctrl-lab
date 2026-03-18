/**
 * 🔧 CORE EXECUTOR - Single Source of Truth
 *
 * Exécute un agent OpenClaw de manière robuste et fiable.
 * Supporte deux modes :
 *   - Windows (local dev) : via WSL bash
 *   - Linux (VPS/Railway)  : bash natif + openclaw installé en /usr/local/bin
 *
 * Gestion complète : nettoyage, spawn, timeout, graceful shutdown.
 * Chaque agent charge ses COMPETENCES.md au démarrage.
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// ─── Détection plateforme ────────────────────────────────────────────────────

const IS_WINDOWS = process.platform === 'win32';

// Chemins selon la plateforme
const OPENCLAW_BIN = IS_WINDOWS
  ? '/home/user/.npm-global/bin/openclaw'  // WSL path
  : '/usr/local/bin/openclaw';             // Linux natif

const OPENCLAW_WORKSPACE = IS_WINDOWS
  ? '/home/user/.openclaw/workspace'       // WSL path
  : `${process.env.HOME || '/root'}/.openclaw/workspace`; // Linux natif

const OPENCLAW_AGENTS_DIR = IS_WINDOWS
  ? null  // chargé via WSL directement
  : `${process.env.HOME || '/root'}/.openclaw/agents`;

// Exposé pour compatibilité avec les imports existants
export const WORKSPACE_DIR = OPENCLAW_WORKSPACE;

export interface AgentExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

// ─── Chargement des compétences ──────────────────────────────────────────────

async function loadAgentCompetences(agentId: string): Promise<string> {
  try {
    let cmd: string;
    if (IS_WINDOWS) {
      cmd = `wsl bash -c "cat ~/.openclaw/agents/${agentId}/COMPETENCES.md 2>/dev/null || echo ''"`;
    } else {
      const agentsDir = OPENCLAW_AGENTS_DIR || '/root/.openclaw/agents';
      cmd = `cat "${agentsDir}/${agentId}/COMPETENCES.md" 2>/dev/null || echo ''`;
    }
    const { stdout } = await execPromise(cmd);
    const content = stdout.trim();
    return content || '';
  } catch {
    return '';
  }
}

// ─── Nettoyage des locks ─────────────────────────────────────────────────────

async function cleanupLocks(agentId: string): Promise<void> {
  try {
    if (IS_WINDOWS) {
      await execPromise(`wsl bash -c "pkill -f 'openclaw agent --agent ${agentId}' || true"`);
      await execPromise(`wsl bash -c "rm -f ~/.openclaw/agents/${agentId}/sessions/*.lock"`);
    } else {
      await execPromise(`pkill -f 'openclaw agent --agent ${agentId}' 2>/dev/null || true`);
      const agentsDir = OPENCLAW_AGENTS_DIR || '/root/.openclaw/agents';
      await execPromise(`rm -f "${agentsDir}/${agentId}/sessions/"*.lock 2>/dev/null || true`);
    }
  } catch { /* ignorer */ }
}

// ─── Executor principal ──────────────────────────────────────────────────────

/**
 * Exécute un agent OpenClaw.
 * Sur Windows : via WSL bash.
 * Sur Linux   : bash natif (VPS, CI…).
 *
 * @param agentId  - ID de l'agent (ex: 'fatah', 'khatib', 'matin')
 * @param prompt   - Prompt à envoyer à l'agent
 * @param timeoutMs - Timeout en millisecondes (défaut: 15 min)
 */
export async function executeOpenClawAgent(
  agentId: string,
  prompt: string,
  timeoutMs: number = 900000
): Promise<AgentExecutionResult> {

  await cleanupLocks(agentId);

  // Charger les compétences et les préfixer au prompt
  const competences = await loadAgentCompetences(agentId);
  const fullPrompt = competences
    ? `${competences}\n\n---\n\n## MISSION REÇUE\n\n${prompt}`
    : prompt;

  if (competences) {
    console.log(`[CoreExecutor] Loaded COMPETENCES.md for ${agentId} (${competences.length} chars)`);
  }

  return new Promise((resolve) => {
    const timeoutSec = Math.floor(timeoutMs / 1000);
    const escapedPrompt = fullPrompt.replace(/'/g, `'\\''`);

    const REGISTERED_AGENTS = ['main', 'musawwir', 'matin', 'fatah', 'hasib', 'raqim', 'banna', 'khatib', 'sani'];
    const resolvedAgent = REGISTERED_AGENTS.includes(agentId) ? agentId : 'main';

    // Commande bash à exécuter
    let bashCmd: string;
    if (IS_WINDOWS) {
      bashCmd = [
        `export PATH=/home/user/.npm-global/bin:/usr/local/bin:/usr/bin:/bin`,
        `&& mkdir -p ${OPENCLAW_WORKSPACE}`,
        `&& cd ${OPENCLAW_WORKSPACE}`,
        `&& ${OPENCLAW_BIN} agent`,
        `--agent ${resolvedAgent}`,
        `--message '${escapedPrompt}'`,
        `--local`,
        `--timeout ${timeoutSec}`,
      ].join(' ');
    } else {
      bashCmd = [
        `export PATH=/usr/local/bin:/usr/bin:/bin`,
        `&& mkdir -p ${OPENCLAW_WORKSPACE}`,
        `&& cd ${OPENCLAW_WORKSPACE}`,
        `&& ${OPENCLAW_BIN} agent`,
        `--agent ${resolvedAgent}`,
        `--message '${escapedPrompt}'`,
        `--local`,
        `--timeout ${timeoutSec}`,
      ].join(' ');
    }

    const resolvedAgentForLog = REGISTERED_AGENTS.includes(agentId) ? agentId : `main (fallback from ${agentId})`;
    const platform = IS_WINDOWS ? 'WSL' : 'Linux';
    console.log(`[CoreExecutor][${platform}] openclaw --agent ${resolvedAgentForLog} (${timeoutMs}ms)`);

    // Spawn : WSL sur Windows, bash natif sur Linux
    const child = IS_WINDOWS
      ? spawn('wsl', ['bash', '-c', bashCmd], { env: { ...process.env, FORCE_COLOR: '0' } })
      : spawn('bash', ['-c', bashCmd], { env: { ...process.env, FORCE_COLOR: '0' } });

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
