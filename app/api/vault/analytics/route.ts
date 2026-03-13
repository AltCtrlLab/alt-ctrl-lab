export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { componentVault } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';

/**
 * GET /api/vault/analytics
 *
 * Retourne les analytics agrégées du vault de composants:
 * - Top composants triés par reuseCount DESC
 * - Stats globales (total, taux de succès moyen, réutilisations totales)
 * - Composants périmés (> 30 jours sans utilisation)
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();

    // Récupère tous les composants du vault, triés par reuseCount
    const allComponents = await db
      .select()
      .from(componentVault)
      .orderBy(desc(componentVault.reuseCount));

    // Top 10 composants les plus réutilisés
    const topComponents = allComponents.slice(0, 10);

    // Calcul des stats agrégées
    const stats = {
      total: allComponents.length,
      avgSuccessRate: 0,
      totalReuses: 0,
      staleCount: 0,
    };

    if (allComponents.length > 0) {
      // Taux de succès moyen
      const totalSuccessRate = allComponents.reduce(
        (sum, c) => sum + (c.successRate || 0),
        0
      );
      stats.avgSuccessRate = (totalSuccessRate / allComponents.length) * 100;

      // Total des réutilisations
      stats.totalReuses = allComponents.reduce(
        (sum, c) => sum + (c.reuseCount || 0),
        0
      );

      // Composants périmés (créés il y a > 30 jours)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      stats.staleCount = allComponents.filter((c) => {
        try {
          const createdDate = new Date(c.createdAt);
          return createdDate < thirtyDaysAgo;
        } catch {
          return false;
        }
      }).length;
    }

    return NextResponse.json({
      success: true,
      data: {
        topComponents,
        stats,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching vault analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch vault analytics',
      },
      { status: 500 }
    );
  }
}
