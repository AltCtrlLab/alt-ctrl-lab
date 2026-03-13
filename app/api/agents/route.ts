import { NextRequest, NextResponse } from 'next/server';
import { createTask, getTask, getRecentTasks, updateTaskStatus } from '@/lib/db';
import { executeAgentTask, registerSSEClient } from '@/lib/worker';

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

/**
 * POST /api/agents
 * Crée une tâche et la lance en arrière-plan (202 Accepted)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { action, payload } = body;

    if (action !== 'run_agent') {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_ACTION', message: 'Action must be run_agent' }
      }, { status: 400 });
    }

    const { agent_name, prompt, timeout = 120 } = payload || {};

    if (!agent_name || !prompt) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'agent_name and prompt required' }
      }, { status: 400 });
    }

    // 1. Générer un ID unique
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 2. Créer la tâche en DB (statut PENDING)
    await createTask({
      id: taskId,
      agentName: agent_name,
      prompt: prompt,
    });

    console.log(`[API] Task ${taskId} created (PENDING)`);

    // 3. Lancer l'exécution en arrière-plan (NON-BLOQUANT)
    // Le 'void' indique qu'on ne veut pas attendre
    void executeAgentTask(taskId, agent_name, prompt, timeout * 1000);

    // 4. Retourner immédiatement 202 Accepted
    return NextResponse.json({
      success: true,
      data: {
        taskId,
        status: 'PENDING',
        message: 'Task queued for execution',
        eta_seconds: timeout
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime
      }
    }, { status: 202 }); // ⭐ HTTP 202 Accepted

  } catch (error) {
    console.error('[API] Error:', error);
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
 * GET /api/agents?action=get_agents|get_tasks
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'get_agents') {
      return NextResponse.json({
        success: true,
        data: { agents: AGENTS }
      });
    }

    if (action === 'get_tasks') {
      const tasks = await getRecentTasks(50);
      return NextResponse.json({
        success: true,
        data: { tasks }
      });
    }

    if (action === 'cancel_task') {
      const taskId = new URL(request.url).searchParams.get('taskId');
      if (!taskId) return NextResponse.json({ success: false, error: 'taskId required' }, { status: 400 });
      const task = await getTask(taskId);
      if (!task) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
      if (['COMPLETED', 'FAILED', 'FAILED_QA'].includes(task.status)) {
        return NextResponse.json({ success: false, error: 'Task already finished' }, { status: 400 });
      }
      await updateTaskStatus(taskId, 'FAILED', undefined, 'Annulée manuellement par l\'opérateur');
      return NextResponse.json({ success: true, data: { taskId, status: 'FAILED' } });
    }

    if (action === 'cleanup_stuck') {
      // Force-fail tasks stuck in non-terminal state for more than 2 hours
      const allTasks = await getRecentTasks(200);
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      const stuck = allTasks.filter(t =>
        !['COMPLETED', 'FAILED', 'FAILED_QA'].includes(t.status) &&
        t.updatedAt.getTime() < twoHoursAgo
      );
      for (const t of stuck) {
        await updateTaskStatus(t.id, 'FAILED', undefined, `Timeout automatique — bloqué depuis ${Math.round((Date.now() - t.updatedAt.getTime()) / 3600000)}h`);
      }
      return NextResponse.json({ success: true, data: { cleaned: stuck.length } });
    }

    return NextResponse.json({
      success: true,
      data: {
        service: 'Alt Ctrl Lab API',
        version: '2.0.0-prod',
        endpoints: [
          { method: 'POST', path: '/api/agents', description: 'Create async task (202)' },
          { method: 'GET', path: '/api/agents/stream', description: 'SSE stream for real-time updates' },
          { method: 'GET', path: '/api/agents?action=get_agents', description: 'List available agents' },
          { method: 'GET', path: '/api/agents?action=get_tasks', description: 'List recent tasks' },
        ]
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: { message: 'Server error' }
    }, { status: 500 });
  }
}
