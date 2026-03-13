#!/usr/bin/env node
/**
 * AltCtrl Server - API Bridge pour OpenClaw
 * 
 * Ce serveur expose une API REST qui permet au dashboard Alt Ctrl Lab
 * de piloter OpenClaw sans modifier son code source.
 * 
 * Port par défaut: 8000
 */

const express = require('express');
const { spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.ALTCTRL_PORT || 8000;
const WORKSPACE_DIR = process.env.ALTCTRL_WORKSPACE || '/home/user/.openclaw/workspace';

// Stockage en mémoire des jobs (en prod: Redis ou DB)
const jobs = new Map();

/**
 * Exécute une commande openclaw et retourne le résultat
 * Version corrigée pour utiliser 'openclaw agent'
 */
function execOpenClawAgent(agentName, message, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const cmd = 'openclaw';
    const args = [
      'agent',
      '--agent', agentName,
      '--message', message,
      '--local',
      '--json',
      '--timeout', String(Math.floor(timeoutMs / 1000))
    ];
    
    console.log(`[AltCtrl] Executing: ${cmd} ${args.join(' ')}`);
    
    const child = spawn(cmd, args, {
      cwd: WORKSPACE_DIR,
      env: { ...process.env, FORCE_COLOR: '0' }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        code: -1,
        stdout: stdout.trim(),
        stderr: 'Timeout: ' + stderr.trim(),
        success: false
      });
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: code === 0
      });
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        code: -1,
        stdout: stdout.trim(),
        stderr: err.message,
        success: false
      });
    });
  });
}

/**
 * Ancienne fonction - gardée pour compatibilité
 */
function execOpenClaw(args, timeoutMs = 120000) {
  return execOpenClawAgent('default', args.join(' '), timeoutMs);
}

/**
 * Crée un fichier de tâche pour l'agent
 */
async function createTaskFile(agentName, prompt, jobId) {
  const taskFile = path.join(WORKSPACE_DIR, `task_${jobId}.md`);
  const content = `# Task ${jobId}
Agent: ${agentName}
Created: ${new Date().toISOString()}

## Prompt
${prompt}

## Instructions
Tu es l'agent "${agentName}". Exécute la tâche ci-dessus et retourne UNIQUEMENT un JSON valide à la fin de ta réponse avec ce format:
\`\`\`json
{
  "status": "success|error",
  "result": "ton résultat ici",
  "metadata": {}
}
\`\`\`
`;
  await fs.promises.writeFile(taskFile, content);
  return taskFile;
}

/**
 * POST /api/v1/agent/run
 * Endpoint principal pour exécuter un agent
 * Utilise: openclaw agent --agent <name> --message <prompt> --json
 */
app.post('/api/v1/agent/run', async (req, res) => {
  const startTime = Date.now();
  const { agent_name, prompt, options = {} } = req.body;

  // Validation
  if (!agent_name || typeof agent_name !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'agent_name est requis (string)'
    });
  }

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'prompt est requis (string)'
    });
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[AltCtrl] [${jobId}] Nouveau job: agent=${agent_name}`);

  try {
    // Exécution synchrone via openclaw agent
    const timeoutMs = (options.timeout || 60) * 1000;
    const agentResult = await execOpenClawAgent(agent_name, prompt, timeoutMs);

    // Tentative de parser le résultat JSON
    let parsedResult = null;
    try {
      // Cherche un JSON dans la sortie
      const jsonMatch = agentResult.stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Pas de JSON valide, on garde le texte brut
    }

    const result = {
      job_id: jobId,
      agent_name,
      status: agentResult.success ? 'completed' : 'error',
      output: {
        raw: agentResult.stdout,
        parsed: parsedResult,
        stderr: agentResult.stderr
      }
    };

    jobs.set(jobId, {
      id: jobId,
      agent_name,
      status: result.status,
      result: result,
      createdAt: new Date().toISOString()
    });

    return res.json({
      success: agentResult.success,
      data: result,
      meta: {
        execution_time_ms: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error(`[AltCtrl] [${jobId}] Error:`, error);
    
    jobs.set(jobId, {
      id: jobId,
      agent_name,
      status: 'error',
      error: error.message,
      createdAt: new Date().toISOString()
    });

    return res.status(500).json({
      success: false,
      error: error.message,
      job_id: jobId
    });
  }
});

/**
 * GET /api/v1/agent/status/:jobId
 * Vérifie le statut d'un job asynchrone
 */
app.get('/api/v1/agent/status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found'
    });
  }

  // Si on a un sessionKey, essayer de récupérer le statut
  let latestOutput = null;
  if (job.sessionKey) {
    try {
      const historyResult = await execOpenClaw([
        'sessions', 'history',
        '--session-key', job.sessionKey,
        '--limit', '5'
      ], 10000);
      
      if (historyResult.success) {
        latestOutput = historyResult.stdout;
        // Détecter si terminé
        if (latestOutput.includes('completed') || latestOutput.includes('finished')) {
          job.status = 'completed';
        }
      }
    } catch (e) {
      // Ignorer les erreurs de récupération
    }
  }

  res.json({
    success: true,
    data: {
      job_id: jobId,
      status: job.status,
      agent_name: job.agent_name,
      created_at: job.createdAt,
      output: latestOutput
    }
  });
});

/**
 * GET /api/v1/health
 * Health check
 */
app.get('/api/v1/health', async (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'altctrl-server',
      version: '1.0.0',
      openclaw: 'available_via_cli',
      workspace: WORKSPACE_DIR,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * GET /api/v1/agents
 * Liste les agents disponibles
 */
app.get('/api/v1/agents', async (req, res) => {
  try {
    const result = await execOpenClaw(['agents', 'list'], 10000);
    
    res.json({
      success: true,
      data: {
        agents: result.success ? result.stdout : 'Unable to fetch agents'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[AltCtrl] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║           AltCtrl Server - OpenClaw Bridge             ║
╠════════════════════════════════════════════════════════╣
║  Port:     ${PORT.toString().padEnd(47)}║
║  Workspace: ${WORKSPACE_DIR.padEnd(47)}║
║  Health:   http://localhost:${PORT}/api/v1/health${' '.repeat(PORT.toString().length === 4 ? 18 : 17)}║
╚════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
