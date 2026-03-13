export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { extractSupervisorPlan, JSONExtractionError } from '@/lib/utils/json';
import { createTask, updateTaskStatus } from '@/lib/db';
import { executeHierarchicalTask, broadcastTaskUpdate } from '@/lib/worker';
import { updateGlobalWarRoomState, resetGlobalWarRoomState } from '@/lib/warroom-state';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';

const TEAM_MAPPING: Record<string, string> = {
  musawwir: 'raqim',
  matin: 'banna',
  fatah: 'khatib',
  hasib: 'sani',
  abdulhakim: 'banna',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brief, service_id = 'full_agency', priority = 'normal' } = body;

    if (!brief) {
      return NextResponse.json({ success: false, error: 'Brief is required' }, { status: 400 });
    }

    console.log('[Supervisor] Received brief:', brief.substring(0, 100) + '...');

    // War Room Protocol pour full_agency
    if (service_id === 'full_agency') {
      console.log('[Supervisor] Launching War Room Protocol...');
      void runWarRoomProtocol(brief, TEAM_MAPPING);
      
      return NextResponse.json({
        success: true,
        data: {
          protocol: 'WAR_ROOM_PROTOCOL',
          phases: ['EXPLORATION', 'DEBATE', 'DECISION', 'EXECUTION'],
          status: 'WAR_ROOM_INITIATED',
          message: 'Strategic decision-making in progress'
        }
      }, { status: 202 });
    }

    // Mode direct pour les autres services
    const directorMap: Record<string, string> = {
      branding: 'musawwir',
      web_dev: 'matin',
      marketing: 'fatah',
      data: 'hasib'
    };
    
    const directorId = directorMap[service_id] || 'matin';
    const executorId = TEAM_MAPPING[directorId];
    
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await createTask({ id: taskId, agentName: `${directorId}→${executorId}`, prompt: brief });
    
    void executeHierarchicalTask(taskId, directorId, executorId, brief, service_id, 900000);

    return NextResponse.json({
      success: true,
      data: { taskId, service: service_id, status: 'QUEUED' }
    }, { status: 202 });

  } catch (error) {
    console.error('[Supervisor] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function runWarRoomProtocol(brief: string, teamMapping: Record<string, string>) {
  const warRoomId = `warroom_${Date.now()}`;
  
  console.log(`[WarRoom] ${warRoomId}: Starting War Room Protocol...`);

  // FIX P0-4: Reset complet avant nouvelle session
  resetGlobalWarRoomState();

  updateGlobalWarRoomState({
    id: warRoomId,
    phase: 'EXPLORATION',
    startedAt: Date.now(),
    updatedAt: Date.now(),
  });
  
  broadcastTaskUpdate({
    id: warRoomId,
    status: 'WAR_ROOM_INITIATED',
    stage: 'STRATEGIC_DECISION_MAKING',
    agentName: 'abdulhakim (CEO)',
  });

  try {
    // PHASE 1: EXPLORATION
    console.log(`[WarRoom] ${warRoomId}: Phase 1 - CEO Exploration...`);
    broadcastTaskUpdate({ id: warRoomId, status: 'WAR_ROOM_EXPLORATION', stage: 'CEO_DIVERGENCE', agentName: 'abdulhakim (CEO)' });

    const explorationPrompt = `Tu es AbdulHakim, CEO de Alt Ctrl Lab. Brief: "${brief}"

MISSION: Génère 3 VISIONS stratégiques radicalement différentes.

RÈGLES:
- Vision A = Approche Rapide/Monolithe (MVP rapide)
- Vision B = Approche Scalable/Microservices (Architecture distribuée)
- Vision C = Approche Innovante/Edge (Technologies bleeding-edge)

FORMAT:
VISION A [MONOLITHE RAPIDE]: [Description]
VISION B [MICROSERVICES SCALABLE]: [Description]  
VISION C [EDGE INNOVANT]: [Description]`;

    const visionsResult = await executeOpenClawAgent('abdulhakim', explorationPrompt, 120000);
    if (!visionsResult.success) throw new Error(visionsResult.stderr);
    const visionsRaw = visionsResult.stdout;

    const visionA = visionsRaw.match(/VISION A[\s\S]*?(?=VISION B|$)/i)?.[0]?.replace(/VISION A.*\n/i, '').trim() || '';
    const visionB = visionsRaw.match(/VISION B[\s\S]*?(?=VISION C|$)/i)?.[0]?.replace(/VISION B.*\n/i, '').trim() || '';
    const visionC = visionsRaw.match(/VISION C[\s\S]*?$/i)?.[0]?.replace(/VISION C.*\n/i, '').trim() || '';
    
    console.log('[WarRoom] 3 visions generated');
    
    updateGlobalWarRoomState({
      id: warRoomId,
      phase: 'EXPLORATION',
      visions: { A: { type: 'MONOLITHE_RAPIDE', content: visionA }, B: { type: 'MICROSERVICES_SCALABLE', content: visionB }, C: { type: 'EDGE_INNOVANT', content: visionC } }
    });
    
    broadcastTaskUpdate({
      id: warRoomId,
      status: 'WAR_ROOM_EXPLORATION_DONE',
      stage: 'VISIONS_GENERATED',
      agentName: 'abdulhakim (CEO)',
      data: { visions: { A: { type: 'MONOLITHE_RAPIDE', content: visionA }, B: { type: 'MICROSERVICES_SCALABLE', content: visionB }, C: { type: 'EDGE_INNOVANT', content: visionC } } }
    });

    // PHASE 2: DEBATE
    console.log(`[WarRoom] ${warRoomId}: Phase 2 - Expert Debate...`);
    broadcastTaskUpdate({ id: warRoomId, status: 'WAR_ROOM_DEBATE', stage: 'CROSS_EXAMINATION', agentName: 'matin (CTO) + musawwir (DA)' });

    const visionsText = `VISION A: ${visionA}\n\nVISION B: ${visionB}\n\nVISION C: ${visionC}`;

    const [matinResult, musawwirResult] = await Promise.all([
      executeOpenClawAgent('matin', `Tu es Matin, CTO. Évalue ces 3 visions sur faisabilité technique (sur 10):\n${visionsText}\n\nFORMAT: VISION A: Note=/10 | [Justification]`, 90000),
      executeOpenClawAgent('musawwir', `Tu es Musawwir, DA. Évalue ces 3 visions sur UX et impact visuel (sur 10):\n${visionsText}\n\nFORMAT: VISION A: Note=/10 | [Justification]`, 90000)
    ]);

    if (!matinResult.success) throw new Error(matinResult.stderr);
    if (!musawwirResult.success) throw new Error(musawwirResult.stderr);

    console.log('[WarRoom] Debate completed');
    
    updateGlobalWarRoomState({
      id: warRoomId,
      phase: 'DEBATE',
      evaluations: {
        cto: { agent: 'matin', role: 'CTO', content: matinResult.stdout },
        da: { agent: 'musawwir', role: 'Directeur Artistique', content: musawwirResult.stdout }
      }
    });
    
    broadcastTaskUpdate({
      id: warRoomId,
      status: 'WAR_ROOM_DEBATE_DONE',
      stage: 'EXPERT_EVALUATIONS',
      agentName: 'matin (CTO) + musawwir (DA)',
      data: { evaluations: { cto: { agent: 'matin', role: 'CTO', content: matinResult.stdout }, da: { agent: 'musawwir', role: 'Directeur Artistique', content: musawwirResult.stdout } } }
    });

    // PHASE 3: DECISION
    console.log(`[WarRoom] ${warRoomId}: Phase 3 - Executive Decision...`);
    broadcastTaskUpdate({ id: warRoomId, status: 'WAR_ROOM_DECISION', stage: 'CEO_CONVERGENCE', agentName: 'abdulhakim (CEO)' });

    const decisionPrompt = `Tu es AbdulHakim, CEO.

TES 3 VISIONS:\n${visionsText}

ÉVALUATION CTO (Matin):\n${matinResult.stdout}

ÉVALUATION DA (Musawwir):\n${musawwirResult.stdout}

MISSION: Choisis LA meilleure vision (A, B ou C) ou un HYBRIDE. Génère un PLAN D'ACTION JSON avec actions pour chaque agent.`;

    const decisionResult = await executeOpenClawAgent('abdulhakim', decisionPrompt, 180000);
    if (!decisionResult.success) throw new Error(decisionResult.stderr);
    const finalDecision = decisionResult.stdout;
    
    console.log('[WarRoom] Final decision generated');
    
    const finalPlan = extractSupervisorPlan(finalDecision);
    
    updateGlobalWarRoomState({
      id: warRoomId,
      phase: 'DECISION',
      decision: finalDecision,
      plan: finalPlan
    });
    
    broadcastTaskUpdate({
      id: warRoomId,
      status: 'WAR_ROOM_DECISION_DONE',
      stage: 'EXECUTIVE_PLAN_READY',
      agentName: 'abdulhakim (CEO)',
      data: { decision: finalDecision, plan: finalPlan }
    });
    
    // PHASE 4: EXECUTION
    void runSequentialPipeline(finalPlan, teamMapping);
    
    console.log(`[WarRoom] ${warRoomId}: Protocol completed`);

  } catch (error) {
    console.error(`[WarRoom] ${warRoomId} failed:`, error);
    broadcastTaskUpdate({
      id: warRoomId,
      status: 'WAR_ROOM_FAILED',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function runSequentialPipeline(plan: { actions: any[] }, teamMapping: Record<string, string>) {
  for (const action of plan.actions) {
    const directorId = action.agent_id;
    const executorId = teamMapping[directorId];
    if (!executorId) continue;

    const taskId = `pipe_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const enrichedBrief = `${action.directive_top_1_percent}\n\nANGLE: ${action.angle_psychologique_ou_technique}\n\nLIVRABLE: ${action.livrable_attendu}`;
    
    await createTask({ id: taskId, agentName: `${directorId}→${executorId}`, prompt: enrichedBrief });
    await executeHierarchicalTask(taskId, directorId, executorId, enrichedBrief, 'generic', 900000);
  }
}
