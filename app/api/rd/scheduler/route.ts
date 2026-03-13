/**
 * ⭐ R&D SCHEDULER CONTROL
 * 
 * GET /api/rd/scheduler - Voir la config actuelle
 * POST /api/rd/scheduler - Modifier la config
 * POST /api/rd/scheduler/trigger - Lancer manuellement
 */

import { NextRequest, NextResponse } from 'next/server';
import { rdScheduler } from '@/lib/ai/agents/rd-scheduler';

// Configuration en mémoire (à remplacer par DB si persistance souhaitée)
let schedulerConfig = {
  enabled: true,
  mode: 'manual', // 'manual' | 'scheduled'
  schedule: {
    scoutIntervalHours: 6,
    elevateIntervalHours: 12,
    analysisIntervalHours: 24,
  },
  nextRunAt: null as string | null,
  lastRunAt: null as string | null,
  isRunning: false,
};

export const dynamic = 'force-dynamic';

/**
 * GET - Voir la configuration du scheduler
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: schedulerConfig,
  });
}

/**
 * POST - Modifier la configuration ou lancer des actions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;

    switch (action) {
      case 'update_config': {
        // Mise à jour de la config
        if (config) {
          schedulerConfig = {
            ...schedulerConfig,
            ...config,
          };
          
          // Recalculer la prochaine exécution
          if (schedulerConfig.mode === 'scheduled' && schedulerConfig.schedule) {
            const nextRun = new Date();
            nextRun.setHours(nextRun.getHours() + schedulerConfig.schedule.scoutIntervalHours);
            schedulerConfig.nextRunAt = nextRun.toISOString();
          }
        }
        
        return NextResponse.json({
          success: true,
          data: schedulerConfig,
          message: 'Configuration updated',
        });
      }

      case 'trigger_scout': {
        // Lancer manuellement un scouting
        if (schedulerConfig.isRunning) {
          return NextResponse.json({
            success: false,
            error: 'Scheduler is already running',
          }, { status: 409 });
        }

        schedulerConfig.isRunning = true;
        schedulerConfig.lastRunAt = new Date().toISOString();

        try {
          const result = await rdScheduler.runTask('scout');
          schedulerConfig.isRunning = false;
          
          return NextResponse.json({
            success: true,
            data: result,
            message: 'Scout completed manually',
          });
        } catch (error) {
          schedulerConfig.isRunning = false;
          throw error;
        }
      }

      case 'trigger_elevate': {
        // Lancer manuellement une élévation
        if (schedulerConfig.isRunning) {
          return NextResponse.json({
            success: false,
            error: 'Scheduler is already running',
          }, { status: 409 });
        }

        schedulerConfig.isRunning = true;
        
        try {
          const result = await rdScheduler.runTask('elevate');
          schedulerConfig.isRunning = false;
          
          return NextResponse.json({
            success: true,
            data: result,
            message: 'Elevate completed manually',
          });
        } catch (error) {
          schedulerConfig.isRunning = false;
          throw error;
        }
      }

      case 'trigger_pipeline': {
        // Lancer le pipeline complet manuellement
        if (schedulerConfig.isRunning) {
          return NextResponse.json({
            success: false,
            error: 'Scheduler is already running',
          }, { status: 409 });
        }

        schedulerConfig.isRunning = true;
        schedulerConfig.lastRunAt = new Date().toISOString();

        try {
          // Import dynamique pour éviter les dépendances circulaires
          const { abdulKhabir } = await import('@/lib/ai/agents/khabir');
          const { abdulBasir } = await import('@/lib/ai/agents/basir');
          const { fusionEngine } = await import('@/lib/ai/agents/fusion-engine');
          const { rdWarRoomConnector } = await import('@/lib/ai/agents/rd-warroom-connector');

          const results: any = {};

          // 1. Scout
          results.scout = await abdulKhabir.scout({ limit: 10 });

          // 2. Elevate
          results.elevate = await abdulBasir.processPendingDiscoveries();

          // 3. Analyze
          results.analyze = await fusionEngine.analyze();

          // 4. Dispatch
          results.dispatch = await rdWarRoomConnector.dispatchApprovedInnovations();

          schedulerConfig.isRunning = false;

          return NextResponse.json({
            success: true,
            data: results,
            message: 'Full pipeline completed',
          });
        } catch (error) {
          schedulerConfig.isRunning = false;
          throw error;
        }
      }

      case 'enable_auto': {
        schedulerConfig.mode = 'scheduled';
        schedulerConfig.enabled = true;
        
        const nextRun = new Date();
        nextRun.setHours(nextRun.getHours() + (config?.intervalHours || 6));
        schedulerConfig.nextRunAt = nextRun.toISOString();

        return NextResponse.json({
          success: true,
          data: schedulerConfig,
          message: 'Auto-scheduling enabled',
        });
      }

      case 'disable_auto': {
        schedulerConfig.mode = 'manual';
        schedulerConfig.nextRunAt = null;

        return NextResponse.json({
          success: true,
          data: schedulerConfig,
          message: 'Auto-scheduling disabled (manual mode)',
        });
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`,
          validActions: [
            'update_config',
            'trigger_scout',
            'trigger_elevate',
            'trigger_pipeline',
            'enable_auto',
            'disable_auto',
          ],
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[API/RD/Scheduler] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
