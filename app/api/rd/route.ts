export const dynamic = 'force-dynamic';
/**
 * ⭐ R&D API - Main Router
 * 
 * Endpoints:
 * POST /api/rd - Actions: scout, elevate, analyze, run-pipeline
 * GET /api/rd - Status et overview
 */

import { NextRequest, NextResponse } from 'next/server';
import { abdulKhabir } from '@/lib/ai/agents/khabir';
import { abdulBasir } from '@/lib/ai/agents/basir';
import { fusionEngine } from '@/lib/ai/agents/fusion-engine';
import { vaultEnricher } from '@/lib/ai/agents/vault-enricher';
import { rdWarRoomConnector } from '@/lib/ai/agents/rd-warroom-connector';
import { getDb } from '@/lib/db';
import { discoveries, innovations, detectedPatterns } from '@/lib/db/schema_rd';
import { eq, desc, sql } from 'drizzle-orm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/rd - Overview du système R&D
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'overview';
    
    const db = getDb();
    
    switch (action) {
      case 'overview': {
        // Stats globales
        const discoveriesCount = await db.select({ count: sql`count(*)` }).from(discoveries);
        const innovationsCount = await db.select({ count: sql`count(*)` }).from(innovations);
        const patternsCount = await db.select({ count: sql`count(*)` }).from(detectedPatterns);
        
        const recentDiscoveries = await db.select()
          .from(discoveries)
          .orderBy(desc(discoveries.discoveredAt))
          .limit(5);
        
        const topInnovations = await db.select()
          .from(innovations)
          .where(eq(innovations.status, 'proposed'))
          .orderBy(desc(innovations.opportunityScore))
          .limit(5);
        
        return NextResponse.json({
          success: true,
          data: {
            stats: {
              totalDiscoveries: discoveriesCount[0]?.count || 0,
              totalInnovations: innovationsCount[0]?.count || 0,
              totalPatterns: patternsCount[0]?.count || 0,
            },
            recentDiscoveries,
            topInnovations,
          },
        }, { headers: corsHeaders });
      }
      
      case 'discoveries': {
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '20');
        
        let query = db.select().from(discoveries).orderBy(desc(discoveries.discoveredAt)).limit(limit);
        
        if (status) {
          query = db.select()
            .from(discoveries)
            .where(eq(discoveries.status, status as any))
            .orderBy(desc(discoveries.discoveredAt))
            .limit(limit);
        }
        
        const results = await query;
        
        return NextResponse.json({
          success: true,
          data: { discoveries: results },
        }, { headers: corsHeaders });
      }
      
      case 'innovations': {
        const status = searchParams.get('status') || 'proposed';
        const limit = parseInt(searchParams.get('limit') || '20');
        
        const results = await db.select()
          .from(innovations)
          .where(eq(innovations.status, status as any))
          .orderBy(desc(innovations.opportunityScore))
          .limit(limit);
        
        return NextResponse.json({
          success: true,
          data: { innovations: results },
        }, { headers: corsHeaders });
      }
      
      case 'patterns': {
        const results = await db.select()
          .from(detectedPatterns)
          .orderBy(desc(detectedPatterns.createdAt))
          .limit(20);
        
        return NextResponse.json({
          success: true,
          data: { patterns: results },
        }, { headers: corsHeaders });
      }
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action',
        }, { status: 400, headers: corsHeaders });
    }
  } catch (error) {
    console.error('[API/RD] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * POST /api/rd - Actions R&D
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, payload = {} } = body;
    
    console.log(`[API/RD] Action: ${action}`);
    
    switch (action) {
      case 'scout': {
        // Lancer AbdulKhabir
        const results = await abdulKhabir.scout({
          sources: payload.sources,
          limit: payload.limit || 10,
          dryRun: payload.dryRun,
        });
        
        return NextResponse.json({
          success: true,
          data: {
            discoveriesCreated: results.filter(r => r.success).length,
            results,
          },
        }, { headers: corsHeaders });
      }
      
      case 'elevate': {
        // Lancer AbdulBasir
        const results = await abdulBasir.processPendingDiscoveries();
        
        return NextResponse.json({
          success: true,
          data: {
            innovationsCreated: results.filter(r => r.success).length,
            averageScore: results
              .filter(r => r.opportunityScore)
              .reduce((a, r) => a + (r.opportunityScore || 0), 0) / results.length || 0,
            results,
          },
        }, { headers: corsHeaders });
      }
      
      case 'analyze': {
        // Lancer le Knowledge Fusion Engine
        const analysis = await fusionEngine.analyze({
          since: payload.since ? new Date(payload.since) : undefined,
          minEvidenceCount: payload.minEvidenceCount || 3,
          dryRun: payload.dryRun,
        });
        
        return NextResponse.json({
          success: true,
          data: analysis,
        }, { headers: corsHeaders });
      }
      
      case 'enrich-vault': {
        // Enrichir le vault avec les livrables récents
        const results = await vaultEnricher.processApprovedDeliverables({
          limit: payload.limit || 10,
          dryRun: payload.dryRun,
        });
        
        return NextResponse.json({
          success: true,
          data: {
            entriesCreated: results.filter(r => r.success).length,
            results,
          },
        }, { headers: corsHeaders });
      }
      
      case 'run-pipeline': {
        // Pipeline complet: scout → elevate → analyze
        console.log('[API/RD] Running full R&D pipeline...');
        
        const pipelineResults = {
          scout: { success: false, count: 0 },
          elevate: { success: false, count: 0 },
          analyze: { success: false, patterns: 0 },
        };
        
        // 1. Scout
        try {
          const scoutResults = await abdulKhabir.scout({
            limit: payload.scoutLimit || 10,
          });
          pipelineResults.scout = {
            success: true,
            count: scoutResults.filter(r => r.success).length,
          };
        } catch (e) {
          console.error('[Pipeline] Scout failed:', e);
        }
        
        // 2. Elevate
        try {
          const elevateResults = await abdulBasir.processPendingDiscoveries();
          pipelineResults.elevate = {
            success: true,
            count: elevateResults.filter(r => r.success).length,
          };
        } catch (e) {
          console.error('[Pipeline] Elevate failed:', e);
        }
        
        // 3. Analyze
        try {
          const analysis = await fusionEngine.analyze({
            dryRun: payload.dryRun,
          });
          pipelineResults.analyze = {
            success: true,
            patterns: analysis.patterns.length,
          };
        } catch (e) {
          console.error('[Pipeline] Analyze failed:', e);
        }
        
        return NextResponse.json({
          success: true,
          data: pipelineResults,
          message: 'R&D pipeline completed',
        }, { headers: corsHeaders });
      }
      
      case 'approve-innovation': {
        const { innovationId } = payload;

        if (!innovationId) {
          return NextResponse.json({
            success: false,
            error: 'innovationId required',
          }, { status: 400, headers: corsHeaders });
        }

        const db = getDb();

        // 1. Marquer comme approuvé
        await db.update(innovations)
          .set({ status: 'approved', decidedAt: new Date(), decidedBy: 'CEO' })
          .where(eq(innovations.id, innovationId));

        // 2. Dispatch immédiat vers l'orchestrateur (async, non-bloquant)
        rdWarRoomConnector.forceDispatch(innovationId).then(result => {
          if (result.success) {
            console.log(`[RD] Innovation ${innovationId} dispatched → taskId: ${result.taskId}`);
          } else {
            console.error(`[RD] Dispatch failed for ${innovationId}:`, result.error);
          }
        }).catch(err => {
          console.error(`[RD] Dispatch error for ${innovationId}:`, err);
        });

        return NextResponse.json({
          success: true,
          data: { innovationId, status: 'approved', dispatching: true },
          message: 'Innovation approuvée — dispatch vers le War Room en cours',
        }, { headers: corsHeaders });
      }
      
      case 'approve-with-refinement': {
        const { innovationId, refinement } = payload;
        if (!innovationId || !refinement?.trim()) {
          return NextResponse.json({
            success: false,
            error: 'innovationId and refinement required',
          }, { status: 400, headers: corsHeaders });
        }

        const db = getDb();

        // Récupérer l'innovation
        const [existing] = await db.select().from(innovations).where(eq(innovations.id, innovationId)).limit(1);
        if (!existing) {
          return NextResponse.json({ success: false, error: 'Innovation not found' }, { status: 404, headers: corsHeaders });
        }

        // Enrichir la description avec la précision du CEO
        const enrichedDescription = `${existing.altCtrlMutation}\n\n---\n🎯 PRÉCISION CEO:\n${refinement.trim()}`;

        // Mettre à jour et approuver
        await db.update(innovations)
          .set({
            status: 'approved',
            decidedAt: new Date(),
            decidedBy: 'CEO',
            altCtrlMutation: enrichedDescription,
          })
          .where(eq(innovations.id, innovationId));

        // Dispatch vers le War Room avec la description enrichie
        rdWarRoomConnector.forceDispatch(innovationId).then(result => {
          if (result.success) {
            console.log(`[RD] Innovation ${innovationId} dispatched (with refinement) → taskId: ${result.taskId}`);
          }
        }).catch(err => {
          console.error(`[RD] Dispatch error for ${innovationId}:`, err);
        });

        return NextResponse.json({
          success: true,
          data: { innovationId, status: 'approved', refined: true, dispatching: true },
          message: 'Innovation approuvée avec précision — dispatch vers le War Room en cours',
        }, { headers: corsHeaders });
      }

      case 'reject-innovation': {
        const { innovationId, reason } = payload;
        
        if (!innovationId) {
          return NextResponse.json({
            success: false,
            error: 'innovationId required',
          }, { status: 400, headers: corsHeaders });
        }
        
        const db = getDb();
        await db.update(innovations)
          .set({
            status: 'rejected',
            decidedAt: new Date(),
            decidedBy: 'CEO',
          })
          .where(eq(innovations.id, innovationId));
        
        return NextResponse.json({
          success: true,
          data: { innovationId, status: 'rejected', reason },
        }, { headers: corsHeaders });
      }
      
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`,
          validActions: ['scout', 'elevate', 'analyze', 'enrich-vault', 'run-pipeline', 'approve-innovation', 'reject-innovation'],
        }, { status: 400, headers: corsHeaders });
    }
  } catch (error) {
    console.error('[API/RD] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500, headers: corsHeaders });
  }
}
