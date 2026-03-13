/**
 * ⭐ R&D SCHEDULER - Orchestrateur Intelligent
 * 
 * "L'horloger qui coordonne les cycles d'innovation"
 * 
 * Mission: Orchestrer les différentes phases du R&D automatiquement
 * avec priorisation intelligente et gestion des ressources.
 * 
 * Philosophy: "L'innovation n'est pas un accident, c'est un rythme"
 */

import { abdulKhabir } from './khabir';
import { abdulBasir } from './basir';
import { fusionEngine } from './fusion-engine';
import { vaultEnricher } from './vault-enricher';
import { getDb } from '@/lib/db';
import { discoveries, innovations, detectedPatterns, rdMetrics, learningLog } from '@/lib/db/schema_rd';
import { eq, gte, sql } from 'drizzle-orm';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SCHEDULER_CONFIG = {
  // Fréquences des tâches (en heures)
  frequencies: {
    scouting: 6,        // Scout toutes les 6h
    elevation: 12,      // Élève toutes les 12h
    analysis: 24,       // Analyse quotidienne
    vaultEnrichment: 7 * 24, // Enrichissement hebdomadaire
    metricsCompilation: 24,  // Métriques quotidiennes
  },
  
  // Limites de ressources
  limits: {
    maxDiscoveriesPerScout: 10,
    maxElevationsPerRun: 15,
    minOpportunityScoreForAutoApprove: 85, // Très haut pour auto-approbation
  },
  
  // Timeouts (en ms)
  timeouts: {
    scout: 10 * 60 * 1000,      // 10 min
    elevate: 30 * 60 * 1000,    // 30 min
    analyze: 20 * 60 * 1000,    // 20 min
  },
};

// ============================================================================
// TYPES
// ============================================================================

export interface ScheduledTask {
  id: string;
  type: 'scout' | 'elevate' | 'analyze' | 'vault_enrich' | 'metrics';
  status: 'pending' | 'running' | 'completed' | 'failed';
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

export interface SchedulerState {
  isRunning: boolean;
  lastScoutAt?: Date;
  lastElevateAt?: Date;
  lastAnalysisAt?: Date;
  lastVaultEnrichmentAt?: Date;
  queue: ScheduledTask[];
  currentTask?: ScheduledTask;
}

// ============================================================================
// CORE SCHEDULER
// ============================================================================

export class RDScheduler {
  private config = SCHEDULER_CONFIG;
  private state: SchedulerState = {
    isRunning: false,
    queue: [],
  };

  /**
   * Démarre le scheduler
   */
  async start(): Promise<void> {
    if (this.state.isRunning) {
      console.log('[RDScheduler] Already running');
      return;
    }
    
    console.log('[RDScheduler] Starting R&D automation...');
    this.state.isRunning = true;
    
    // Charger l'état depuis la DB
    await this.loadState();
    
    // Exécuter immédiatement ce qui est en retard
    await this.catchUp();
    
    // Planifier les prochaines exécutions
    this.scheduleNextRuns();
    
    console.log('[RDScheduler] Started successfully');
  }

  /**
   * Arrête le scheduler
   */
  stop(): void {
    console.log('[RDScheduler] Stopping...');
    this.state.isRunning = false;
  }

  /**
   * Exécute manuellement une tâche
   */
  async runTask(type: ScheduledTask['type']): Promise<any> {
    console.log(`[RDScheduler] Manual run: ${type}`);
    
    switch (type) {
      case 'scout':
        return this.runScout();
      case 'elevate':
        return this.runElevate();
      case 'analyze':
        return this.runAnalysis();
      case 'vault_enrich':
        return this.runVaultEnrichment();
      case 'metrics':
        return this.compileMetrics();
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Récupère le statut actuel
   */
  getStatus(): SchedulerState {
    return { ...this.state };
  }

  // ============================================================================
  // PRIVATE METHODS - Orchestration
  // ============================================================================

  private async loadState(): Promise<void> {
    const db = getDb();
    
    // Récupérer les dernières dates d'exécution
    const lastDiscoveries = await db.select()
      .from(discoveries)
      .orderBy(sql`${discoveries.discoveredAt} DESC`)
      .limit(1);
    
    const lastInnovations = await db.select()
      .from(innovations)
      .orderBy(sql`${innovations.createdAt} DESC`)
      .limit(1);
    
    const lastPatterns = await db.select()
      .from(detectedPatterns)
      .orderBy(sql`${detectedPatterns.createdAt} DESC`)
      .limit(1);
    
    this.state.lastScoutAt = lastDiscoveries[0]?.discoveredAt || undefined;
    this.state.lastElevateAt = lastInnovations[0]?.createdAt || undefined;
    this.state.lastAnalysisAt = lastPatterns[0]?.createdAt || undefined;
  }

  private async catchUp(): Promise<void> {
    const now = Date.now();
    
    // Vérifier si on a du retard
    if (this.state.lastScoutAt) {
      const hoursSinceScout = (now - this.state.lastScoutAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceScout >= this.config.frequencies.scouting) {
        console.log(`[RDScheduler] Catching up: Scout (${hoursSinceScout.toFixed(1)}h behind)`);
        await this.runScout();
      }
    }
    
    if (this.state.lastElevateAt) {
      const hoursSinceElevate = (now - this.state.lastElevateAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceElevate >= this.config.frequencies.elevation) {
        console.log(`[RDScheduler] Catching up: Elevate (${hoursSinceElevate.toFixed(1)}h behind)`);
        await this.runElevate();
      }
    }
  }

  private scheduleNextRuns(): void {
    // Cette méthode serait connectée à un vrai scheduler (node-cron, etc.)
    // Pour l'instant, on log juste ce qui serait planifié
    
    console.log('[RDScheduler] Next scheduled runs:');
    
    if (this.state.lastScoutAt) {
      const nextScout = new Date(this.state.lastScoutAt.getTime() + this.config.frequencies.scouting * 60 * 60 * 1000);
      console.log(`  - Scout: ${nextScout.toISOString()}`);
    }
    
    if (this.state.lastElevateAt) {
      const nextElevate = new Date(this.state.lastElevateAt.getTime() + this.config.frequencies.elevation * 60 * 60 * 1000);
      console.log(`  - Elevate: ${nextElevate.toISOString()}`);
    }
  }

  // ============================================================================
  // PRIVATE METHODS - Task Execution
  // ============================================================================

  private async runScout(): Promise<any> {
    console.log('[RDScheduler] Running scout...');
    
    try {
      const results = await abdulKhabir.scout({
        limit: this.config.limits.maxDiscoveriesPerScout,
      });
      
      const successCount = results.filter(r => r.success).length;
      
      this.state.lastScoutAt = new Date();
      
      await this.logEvent('scout_completed', {
        discoveriesFound: successCount,
        totalAttempts: results.length,
      });
      
      return { success: true, discoveriesCreated: successCount };
    } catch (error) {
      console.error('[RDScheduler] Scout failed:', error);
      await this.logEvent('scout_failed', { error: String(error) });
      return { success: false, error: String(error) };
    }
  }

  private async runElevate(): Promise<any> {
    console.log('[RDScheduler] Running elevate...');
    
    try {
      const results = await abdulBasir.processPendingDiscoveries();
      
      const successCount = results.filter(r => r.success).length;
      
      this.state.lastElevateAt = new Date();
      
      await this.logEvent('elevate_completed', {
        innovationsCreated: successCount,
        totalAttempts: results.length,
      });
      
      // Auto-approve les innovations avec très haut score
      await this.autoApproveTopInnovations();
      
      return { success: true, innovationsCreated: successCount };
    } catch (error) {
      console.error('[RDScheduler] Elevate failed:', error);
      await this.logEvent('elevate_failed', { error: String(error) });
      return { success: false, error: String(error) };
    }
  }

  private async runAnalysis(): Promise<any> {
    console.log('[RDScheduler] Running analysis...');
    
    try {
      const analysis = await fusionEngine.analyze({
        dryRun: false,
      });
      
      // Enrichir le knowledge graph
      const connectionsCreated = await fusionEngine.enrichKnowledgeGraph();
      
      this.state.lastAnalysisAt = new Date();
      
      await this.logEvent('analysis_completed', {
        patternsDetected: analysis.patterns.length,
        trendsFound: analysis.trends.length,
        synergiesFound: analysis.synergies.length,
        graphConnections: connectionsCreated,
      });
      
      return {
        success: true,
        patterns: analysis.patterns.length,
        trends: analysis.trends.length,
        synergies: analysis.synergies.length,
      };
    } catch (error) {
      console.error('[RDScheduler] Analysis failed:', error);
      await this.logEvent('analysis_failed', { error: String(error) });
      return { success: false, error: String(error) };
    }
  }

  private async runVaultEnrichment(): Promise<any> {
    console.log('[RDScheduler] Running vault enrichment...');
    
    try {
      const results = await vaultEnricher.processApprovedDeliverables({
        limit: 20,
      });
      
      const successCount = results.filter(r => r.success).length;
      
      this.state.lastVaultEnrichmentAt = new Date();
      
      await this.logEvent('vault_enriched', {
        entriesCreated: successCount,
      });
      
      return { success: true, entriesCreated: successCount };
    } catch (error) {
      console.error('[RDScheduler] Vault enrichment failed:', error);
      return { success: false, error: String(error) };
    }
  }

  private async compileMetrics(): Promise<any> {
    console.log('[RDScheduler] Compiling metrics...');
    
    const db = getDb();
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    try {
      // Découvertes des dernières 24h
      const dailyDiscoveries = await db.select()
        .from(discoveries)
        .where(gte(discoveries.discoveredAt, yesterday));
      
      // Innovations des dernières 24h
      const dailyInnovations = await db.select()
        .from(innovations)
        .where(gte(innovations.createdAt, yesterday));
      
      // Calculer les métriques
      const byPlatform: Record<string, number> = {};
      dailyDiscoveries.forEach(d => {
        byPlatform[d.sourcePlatform] = (byPlatform[d.sourcePlatform] || 0) + 1;
      });
      
      const avgEngagement = dailyDiscoveries.reduce((sum, d) => sum + (d.engagementScore || 0), 0) / dailyDiscoveries.length || 0;
      
      const approvedCount = dailyInnovations.filter(i => i.status === 'approved').length;
      const avgOpportunityScore = dailyInnovations.reduce((sum, i) => sum + (i.opportunityScore || 0), 0) / dailyInnovations.length || 0;
      
      // Stocker les métriques (upsert si déjà existant pour aujourd'hui)
      await db.insert(rdMetrics).values({
        id: `metrics_${now.toISOString().split('T')[0]}`,
        period: now.toISOString().split('T')[0],
        periodType: 'daily',
        discoveriesCount: dailyDiscoveries.length,
        discoveriesByPlatform: JSON.stringify(byPlatform),
        avgEngagementScore: avgEngagement,
        innovationsGenerated: dailyInnovations.length,
        innovationsApproved: approvedCount,
        avgOpportunityScore,
        createdAt: now,
      }).onConflictDoUpdate({
        target: rdMetrics.id,
        set: {
          discoveriesCount: dailyDiscoveries.length,
          discoveriesByPlatform: JSON.stringify(byPlatform),
          avgEngagementScore: avgEngagement,
          innovationsGenerated: dailyInnovations.length,
          innovationsApproved: approvedCount,
          avgOpportunityScore,
        },
      });
      
      return {
        success: true,
        discoveries: dailyDiscoveries.length,
        innovations: dailyInnovations.length,
        approved: approvedCount,
      };
    } catch (error) {
      console.error('[RDScheduler] Metrics compilation failed:', error);
      return { success: false, error: String(error) };
    }
  }

  // ============================================================================
  // PRIVATE METHODS - Smart Features
  // ============================================================================

  private async autoApproveTopInnovations(): Promise<void> {
    const db = getDb();
    
    // Trouver les innovations avec très haut score
    const topInnovations = await db.select()
      .from(innovations)
      .where(eq(innovations.status, 'proposed'));
    
    const autoApproveThreshold = this.config.limits.minOpportunityScoreForAutoApprove;
    
    for (const innovation of topInnovations) {
      if ((innovation.opportunityScore || 0) >= autoApproveThreshold) {
        console.log(`[RDScheduler] Auto-approving high-score innovation: ${innovation.id} (${innovation.opportunityScore})`);
        
        await db.update(innovations)
          .set({
            status: 'approved',
            decidedAt: new Date(),
            decidedBy: 'AUTO (High Score)',
          })
          .where(eq(innovations.id, innovation.id));
        
        await this.logEvent('innovation_auto_approved', {
          innovationId: innovation.id,
          score: innovation.opportunityScore,
        });
      }
    }
  }

  private async logEvent(eventType: string, data: any): Promise<void> {
    const db = getDb();
    
    try {
      await db.insert(learningLog).values({
        id: `log_${Date.now()}`,
        eventType: eventType as any,
        impactDescription: JSON.stringify(data),
        createdAt: new Date(),
      });
    } catch (e) {
      console.error('[RDScheduler] Failed to log event:', e);
    }
  }
}

// Singleton export
export const rdScheduler = new RDScheduler();
