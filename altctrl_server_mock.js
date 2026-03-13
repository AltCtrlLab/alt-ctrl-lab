#!/usr/bin/env node
/**
 * AltCtrl Server - VERSION MOCK
 * 
 * Cette version simule les réponses d'agents pour permettre
 * au dashboard de tester l'API sans dépendre de la CLI OpenClaw.
 * 
 * À remplacer par la vraie implémentation quand OpenClaw sera réparé.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.ALTCTRL_PORT || 8000;
const WORKSPACE_DIR = process.env.ALTCTRL_WORKSPACE || '/home/user/.openclaw/workspace';

// Stockage des jobs
const jobs = new Map();

// Simuler différents types d'agents
const AGENT_PROFILES = {
  'supervisor': { name: 'Hakim', role: 'Supervisor', style: 'analytical' },
  'musawwir': { name: 'Musawwir', role: 'Branding', style: 'creative' },
  'matin': { name: 'Matin', role: 'WebDev', style: 'technical' },
  'fatah': { name: 'Fatah', role: 'Marketing', style: 'persuasive' },
  'hasib': { name: 'Hasib', role: 'Automation', style: 'systematic' },
  'main': { name: 'Default', role: 'General', style: 'balanced' }
};

function generateMockResponse(agentName, prompt) {
  const agent = AGENT_PROFILES[agentName] || AGENT_PROFILES['main'];
  const promptLower = prompt.toLowerCase();
  
  // Réponses contextualisées selon le type de demande
  if (promptLower.includes('logo') || promptLower.includes('branding')) {
    return {
      status: 'success',
      agent: agent.name,
      role: agent.role,
      deliverable: {
        type: 'branding_concept',
        title: 'Proposition de logo',
        content: {
          concept: 'Design moderne et minimaliste',
          colors: ['#2D5A4A', '#F5F1E8', '#8B6914'],
          typography: 'Inter + Playfair Display',
          mockup_description: 'Logo adapté pour réseaux sociaux et papeterie'
        },
        reasoning: 'Basé sur votre demande de style ' + (promptLower.includes('moderne') ? 'moderne' : 'professionnel')
      },
      next_steps: ['Valider la direction', 'Affiner les détails', 'Livrer les fichiers sources']
    };
  }
  
  if (promptLower.includes('site') || promptLower.includes('web')) {
    return {
      status: 'success',
      agent: agent.name,
      role: agent.role,
      deliverable: {
        type: 'web_architecture',
        title: 'Architecture du site',
        content: {
          structure: ['Home', 'Services', 'Portfolio', 'Contact'],
          tech_stack: 'Next.js + Tailwind + Vercel',
          features: ['SEO optimisé', 'Responsive', 'CMS intégré']
        }
      }
    };
  }
  
  // Réponse générique par défaut
  return {
    status: 'success',
    agent: agent.name,
    role: agent.role,
    deliverable: {
      type: 'general_response',
      content: `Analyse effectuée par ${agent.name} (${agent.role}):\n\n${prompt}`,
      recommendations: [
        'Action prioritaire identifiée',
        'Points de vigilance',
        'Prochaines étapes suggérées'
      ]
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * POST /api/v1/agent/run
 */
app.post('/api/v1/agent/run', async (req, res) => {
  const startTime = Date.now();
  const { agent_name, prompt, options = {} } = req.body;

  if (!agent_name || !prompt) {
    return res.status(400).json({
      success: false,
      error: 'agent_name et prompt sont requis'
    });
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[AltCtrl-MOCK] [${jobId}] Job: agent=${agent_name}`);

  // Simuler un délai de traitement (500ms - 2s)
  await new Promise(r => setTimeout(r, 500 + Math.random() * 1500));

  const result = generateMockResponse(agent_name, prompt);
  
  jobs.set(jobId, {
    id: jobId,
    agent_name,
    status: 'completed',
    result,
    createdAt: new Date().toISOString()
  });

  res.json({
    success: true,
    data: {
      job_id: jobId,
      agent_name,
      status: 'completed',
      result
    },
    meta: {
      execution_time_ms: Date.now() - startTime,
      mode: 'mock'
    }
  });
});

/**
 * GET /api/v1/agent/status/:jobId
 */
app.get('/api/v1/agent/status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  res.json({ success: true, data: job });
});

/**
 * GET /api/v1/health
 */
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'altctrl-server',
      version: '1.0.0-mock',
      mode: 'mock',
      agents_available: Object.keys(AGENT_PROFILES),
      workspace: WORKSPACE_DIR
    }
  });
});

/**
 * GET /api/v1/agents
 */
app.get('/api/v1/agents', (req, res) => {
  res.json({
    success: true,
    data: {
      agents: Object.entries(AGENT_PROFILES).map(([id, profile]) => ({
        id,
        ...profile
      }))
    }
  });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║     AltCtrl Server - MODE MOCK (OpenClaw indispo)      ║
╠════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                        ║
║  Mode:     SIMULATION (réponses fictives)               ║
║  Health:   http://localhost:${PORT}/api/v1/health               ║
╚════════════════════════════════════════════════════════╝
Agents disponibles: ${Object.keys(AGENT_PROFILES).join(', ')}
  `);
});
