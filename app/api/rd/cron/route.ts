/**
 * ⭐ R&D CRON ENDPOINT
 *
 * GET /api/rd/cron - Exécute le cycle R&D complet
 * À appeler via cron toutes les 6 heures
 */

import { NextRequest, NextResponse } from 'next/server';
import { rdScheduler } from '@/lib/ai/agents/rd-scheduler';
import { rdWarRoomConnector } from '@/lib/ai/agents/rd-warroom-connector';
import { autoPlaybookGenerator } from '@/lib/ai/agents/playbook-generator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Vérification d'auth basique
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET || 'altctrl-rnd-2024';
  
  if (authHeader !== `Bearer ${expectedToken}`) {
    // En dev, on laisse passer avec warning
    console.log('[Cron/RD] Warning: Invalid auth, running anyway in dev mode');
  }
  
  const results: Record<string, any> = {};
  const startTime = Date.now();
  
  try {
    console.log('[Cron/RD] Starting R&D automation cycle...');
    
    // 1. Scout
    console.log('[Cron/RD] Step 1: Scout...');
    results.scout = await rdScheduler.runTask('scout');
    
    // 2. Elevate
    console.log('[Cron/RD] Step 2: Elevate...');
    results.elevate = await rdScheduler.runTask('elevate');
    
    // 3. Analyze
    console.log('[Cron/RD] Step 3: Analyze...');
    results.analyze = await rdScheduler.runTask('analyze');
    
    // 4. Dispatch to War Room
    console.log('[Cron/RD] Step 4: Dispatch to War Room...');
    results.dispatch = await rdWarRoomConnector.dispatchApprovedInnovations();
    
    // 5. Generate playbooks
    console.log('[Cron/RD] Step 5: Generate playbooks...');
    results.playbooks = await autoPlaybookGenerator.generateFromSources();
    
    // 6. Compile metrics
    console.log('[Cron/RD] Step 6: Compile metrics...');
    results.metrics = await rdScheduler.runTask('metrics');
    
    const duration = Date.now() - startTime;
    
    console.log(`[Cron/RD] Cycle completed in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error('[Cron/RD] Cycle failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      partialResults: results,
    }, { status: 500 });
  }
}
