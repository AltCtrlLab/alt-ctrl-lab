export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createTask } from '@/lib/db';
import { executeHierarchicalTask } from '@/lib/worker';

// Les 9 agents de l'organisation Alt Ctrl Lab
const AGENTS = [
  // Directeurs (Managers)
  { id: 'abdulhakim', name: 'AbdulHakim', role: 'CEO/Superviseur', emoji: '👔', color: '#4F46E5', type: 'director' },
  { id: 'musawwir', name: 'Musawwir', role: 'DA Senior (Directeur Création)', emoji: '🎨', color: '#EC4899', type: 'director' },
  { id: 'matin', name: 'Matin', role: 'Lead Dev (Directeur Technique)', emoji: '💻', color: '#10B981', type: 'director' },
  { id: 'fatah', name: 'Fatah', role: 'CGO (Directeur Growth)', emoji: '📈', color: '#F59E0B', type: 'director' },
  { id: 'hasib', name: 'Hasib', role: 'Architect (Directeur Data)', emoji: '⚙️', color: '#6B7280', type: 'director' },
  
  // Exécutants (Doers)
  { id: 'raqim', name: 'Raqim', role: 'Exécutant Création (UI)', emoji: '🖌️', color: '#EC4899', type: 'executor', director: 'musawwir' },
  { id: 'banna', name: 'Banna', role: 'Exécutant Dev (Code)', emoji: '🔧', color: '#10B981', type: 'executor', director: 'matin' },
  { id: 'khatib', name: 'Khatib', role: 'Exécutant Copy (Marketing)', emoji: '✍️', color: '#F59E0B', type: 'executor', director: 'fatah' },
  { id: 'sani', name: 'Sani', role: 'Exécutant Data (Automations)', emoji: '🔌', color: '#6B7280', type: 'executor', director: 'hasib' },
];

// Paires valides Director → Executor
const VALID_PAIRS: Record<string, string[]> = {
  'musawwir': ['raqim'],
  'matin': ['banna'],
  'fatah': ['khatib'],
  'hasib': ['sani'],
};

// Mapping Director → Service ID (pour le mode physique)
const DIRECTOR_TO_SERVICE: Record<string, string> = {
  'musawwir': 'branding',
  'matin': 'web_dev',
  'fatah': 'marketing',
  'hasib': 'data',
};

interface HierarchicalRequest {
  director_id: string;
  executor_id: string;
  brief: string;
  timeout?: number;
}

/**
 * POST /api/orchestrate
 * Architecture Manager-Doer avec QA Loop (Actor-Critic)
 * 
 * Body: {
 *   director_id: "matin",      // Le Manager (DOIT être un director)
 *   executor_id: "banna",      // Le Doer (DOIT être un executor du director)
 *   brief: "Créer une API...", // Brief utilisateur
 *   timeout: 300               // Optionnel, secondes (default: 300 = 5 min)
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: HierarchicalRequest = await request.json();
    const { director_id, executor_id, brief, timeout = 300 } = body;

    // Validation
    if (!director_id || !executor_id || !brief) {
      return NextResponse.json({
        success: false,
        error: { 
          code: 'INVALID_PAYLOAD', 
          message: 'director_id, executor_id, and brief are required' 
        }
      }, { status: 400 });
    }

    // Vérifier que le director existe et est bien un director
    const director = AGENTS.find(a => a.id === director_id && a.type === 'director');
    if (!director) {
      return NextResponse.json({
        success: false,
        error: { 
          code: 'INVALID_DIRECTOR', 
          message: `${director_id} is not a valid director. Choose from: musawwir, matin, fatah, hasib` 
        }
      }, { status: 400 });
    }

    // Vérifier que l'executor existe et est bien un executor
    const executor = AGENTS.find(a => a.id === executor_id && a.type === 'executor');
    if (!executor) {
      return NextResponse.json({
        success: false,
        error: { 
          code: 'INVALID_EXECUTOR', 
          message: `${executor_id} is not a valid executor. Choose from: raqim, banna, khatib, sani` 
        }
      }, { status: 400 });
    }

    // Vérifier la paire Director → Executor
    const validExecutors = VALID_PAIRS[director_id] || [];
    if (!validExecutors.includes(executor_id)) {
      return NextResponse.json({
        success: false,
        error: { 
          code: 'INVALID_PAIR', 
          message: `${director_id} cannot direct ${executor_id}. Valid pairs: musawwir→raqim, matin→banna, fatah→khatib, hasib→sani` 
        }
      }, { status: 400 });
    }

    // Générer ID unique
    const taskId = `hier_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    console.log(`[Orchestrate] Creating hierarchical task ${taskId}: ${director_id} → ${executor_id}`);

    // Créer la tâche en DB
    await createTask({
      id: taskId,
      agentName: `${director_id}→${executor_id}`,
      prompt: `[HIERARCHICAL] Director: ${director_id}, Executor: ${executor_id}\n\nBrief:\n${brief}`,
    });

    // Lancer l'exécution hiérarchique en arrière-plan
    const serviceId = DIRECTOR_TO_SERVICE[director_id];
    
    void executeHierarchicalTask(
      taskId, 
      director_id, 
      executor_id, 
      brief,
      serviceId,  // Passer le service pour activer le mode physique si web_dev
      timeout * 1000
    );

    return NextResponse.json({
      success: true,
      data: {
        taskId,
        architecture: 'MANAGER_DOER_QA',
        hierarchy: {
          director: { id: director.id, name: director.name, emoji: director.emoji },
          executor: { id: executor.id, name: executor.name, emoji: executor.emoji }
        },
        workflow: [
          { stage: 'DIRECTOR_PLANNING', agent: director_id, description: 'Génération du cahier des charges' },
          { stage: 'EXECUTOR_DRAFTING', agent: executor_id, description: 'Première implémentation' },
          { stage: 'DIRECTOR_QA', agent: director_id, description: 'Audit qualité (max 3 iterations)' },
          { stage: 'COMPLETED', agent: executor_id, description: 'Livrable validé' }
        ],
        status: 'QUEUED',
        estimated_duration_seconds: timeout
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime
      }
    }, { status: 202 });

  } catch (error) {
    console.error('[Orchestrate] Error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}

/**
 * GET /api/orchestrate - Documentation et liste des agents
 */
export async function GET() {
  return NextResponse.json({
    service: 'Alt Ctrl Lab - Hierarchical Orchestration',
    version: '3.0.0',
    architecture: 'Manager-Doer with QA Loop (Actor-Critic)',
    description: '9 agents distincts: 4 Directeurs → 4 Exécutants + 1 Superviseur',
    organization: {
      directors: AGENTS.filter(a => a.type === 'director'),
      executors: AGENTS.filter(a => a.type === 'executor'),
      valid_pairs: VALID_PAIRS
    },
    endpoints: {
      POST: {
        path: '/api/orchestrate',
        description: 'Crée une tâche hiérarchique avec QA loop',
        body: {
          director_id: 'string - Le Manager (musawwir|matin|fatah|hasib)',
          executor_id: 'string - Le Doer (raqim|banna|khatib|sani)',
          brief: 'string - Brief utilisateur détaillé',
          timeout: 'number (optional) - Timeout en secondes (default: 300)'
        },
        response: '202 Accepted avec taskId et workflow description'
      }
    },
    examples: [
      { director_id: 'musawwir', executor_id: 'raqim', description: 'Design UI → Implémentation' },
      { director_id: 'matin', executor_id: 'banna', description: 'Architecture → Code' },
      { director_id: 'fatah', executor_id: 'khatib', description: 'Stratégie → Copy' },
      { director_id: 'hasib', executor_id: 'sani', description: 'Data Architecture → Pipelines' }
    ]
  });
}
