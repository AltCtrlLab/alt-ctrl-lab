/**
 * ⭐ R&D METRICS ENDPOINT
 * 
 * GET /api/rd/metrics - Métriques et analytics R&D
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { discoveries, innovations, rdMetrics, learningLog } from '@/lib/db/schema_rd';
import { sql, desc, eq, gte } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // 24h, 7d, 30d, all
    
    const db = getDb();
    
    // Calculer la date de début
    const now = new Date();
    let startDate = new Date(0);
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }
    
    // Récupérer les métriques
    const discoveriesCount = await db.select({ count: sql`count(*)` })
      .from(discoveries)
      .where(gte(discoveries.discoveredAt, startDate));
    
    const innovationsStats = await db.select({
      total: sql`count(*)`,
      proposed: sql`sum(case when status = 'proposed' then 1 else 0 end)`,
      approved: sql`sum(case when status = 'approved' then 1 else 0 end)`,
      implemented: sql`sum(case when status = 'implemented' then 1 else 0 end)`,
      avgScore: sql`avg(opportunity_score)`,
    })
    .from(innovations)
    .where(gte(innovations.createdAt, startDate));
    
    // Top innovations
    const topInnovations = await db.select()
      .from(innovations)
      .orderBy(desc(innovations.opportunityScore))
      .limit(5);
    
    // Sources breakdown
    const sourcesBreakdown = await db.select({
      platform: discoveries.sourcePlatform,
      count: sql`count(*)`,
      avgEngagement: sql`avg(engagement_score)`,
    })
    .from(discoveries)
    .where(gte(discoveries.discoveredAt, startDate))
    .groupBy(discoveries.sourcePlatform);
    
    // Categories breakdown
    const categoriesBreakdown = await db.select({
      category: innovations.category,
      count: sql`count(*)`,
      avgScore: sql`avg(opportunity_score)`,
    })
    .from(innovations)
    .where(gte(innovations.createdAt, startDate))
    .groupBy(innovations.category);
    
    // Conversion funnel
    const funnel = {
      discovered: discoveriesCount[0]?.count || 0,
      elevated: innovationsStats[0]?.total || 0,
      approved: parseInt(innovationsStats[0]?.approved || '0'),
      implemented: parseInt(innovationsStats[0]?.implemented || '0'),
    };
    
    const conversionRates = {
      discoverToElevate: funnel.discovered > 0 ? (funnel.elevated / funnel.discovered * 100).toFixed(1) : '0',
      elevateToApprove: funnel.elevated > 0 ? (funnel.approved / funnel.elevated * 100).toFixed(1) : '0',
      approveToImplement: funnel.approved > 0 ? (funnel.implemented / funnel.approved * 100).toFixed(1) : '0',
    };
    
    // Learning log events
    const recentEvents = await db.select()
      .from(learningLog)
      .orderBy(desc(learningLog.createdAt))
      .limit(10);
    
    return NextResponse.json({
      success: true,
      data: {
        period,
        summary: {
          discoveries: discoveriesCount[0]?.count || 0,
          innovations: {
            total: parseInt(innovationsStats[0]?.total || '0'),
            proposed: parseInt(innovationsStats[0]?.proposed || '0'),
            approved: parseInt(innovationsStats[0]?.approved || '0'),
            implemented: parseInt(innovationsStats[0]?.implemented || '0'),
          },
          averageOpportunityScore: parseFloat(innovationsStats[0]?.avgScore || '0').toFixed(1),
        },
        funnel,
        conversionRates,
        breakdowns: {
          sources: sourcesBreakdown,
          categories: categoriesBreakdown,
        },
        topInnovations,
        recentEvents,
      },
    });
    
  } catch (error) {
    console.error('[API/RD/Metrics] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
