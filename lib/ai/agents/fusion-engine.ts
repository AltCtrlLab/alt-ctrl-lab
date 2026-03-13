/**
 * ⭐ KNOWLEDGE FUSION ENGINE
 * 
 * "L'alchimiste qui transforme la connaissance dispersée en insights actionnables"
 * 
 * Mission: Analyser les découvertes et innovations pour détecter:
 * - Patterns émergents
 * - Tendances technologiques
 * - Opportunités de synergie
 * - Gaps dans notre knowledge graph
 * 
 * Philosophy: "Un fait isolé est du bruit. Trois faits similaires = un signal"
 */

import { getDb } from '@/lib/db';
import { 
  discoveries, 
  innovations, 
  detectedPatterns,
  knowledgeGraphEdges,
  type NewDetectedPattern,
  type Discovery,
  type Innovation,
} from '@/lib/db/schema_rd';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';

// ============================================================================
// TYPES
// ============================================================================

export interface PatternDetectionResult {
  detected: boolean;
  patternId?: string;
  type?: 'recurring_problem' | 'emerging_tech' | 'market_shift' | 'tool_opportunity';
  confidence: number;
  evidence: string[];
  description?: string;
}

export interface TrendAnalysis {
  concept: string;
  frequency: number; // Nombre d'occurrences
  velocity: 'accelerating' | 'steady' | 'decelerating';
  sources: string[];
  avgEngagement: number;
  recommendation: 'investigate' | 'monitor' | 'ignore';
}

export interface SynergyOpportunity {
  type: 'merge_concepts' | 'combine_capabilities' | 'chain_workflows';
  sourceA: string;
  sourceB: string;
  potentialValue: string;
  implementationComplexity: 'low' | 'medium' | 'high';
  reasoning: string;
}

// ============================================================================
// CORE ENGINE
// ============================================================================

export class KnowledgeFusionEngine {
  
  /**
   * Analyse complète du knowledge base
   * Détecte patterns, tendances et synergies
   */
  async analyze(options: {
    since?: Date;
    minEvidenceCount?: number;
    dryRun?: boolean;
  } = {}): Promise<{
    patterns: PatternDetectionResult[];
    trends: TrendAnalysis[];
    synergies: SynergyOpportunity[];
  }> {
    const { since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), minEvidenceCount = 3 } = options;
    
    console.log('[FusionEngine] Starting knowledge analysis...');
    
    // 1. Détection de patterns
    const patterns = await this.detectPatterns(since, minEvidenceCount, options.dryRun);
    
    // 2. Analyse des tendances
    const trends = await this.analyzeTrends(since);
    
    // 3. Détection de synergies
    const synergies = await this.detectSynergies();
    
    console.log(`[FusionEngine] Analysis complete: ${patterns.length} patterns, ${trends.length} trends, ${synergies.length} synergies`);
    
    return { patterns, trends, synergies };
  }

  /**
   * Détecte des patterns dans les découvertes récentes
   */
  private async detectPatterns(
    since: Date,
    minEvidence: number,
    dryRun?: boolean
  ): Promise<PatternDetectionResult[]> {
    const db = getDb();
    
    // Récupérer les découvertes récentes
    const recentDiscoveries = await db.select()
      .from(discoveries)
      .where(gte(discoveries.discoveredAt, since));
    
    console.log(`[FusionEngine] Analyzing ${recentDiscoveries.length} discoveries for patterns...`);
    
    if (recentDiscoveries.length < minEvidence) {
      return [];
    }
    
    // Grouper par concepts similaires (clustering simple par mot-clé)
    const clusters = this.clusterByConcepts(recentDiscoveries);
    
    const results: PatternDetectionResult[] = [];
    
    for (const [concept, cluster] of clusters.entries()) {
      if (cluster.length >= minEvidence) {
        // Analyser avec LLM pour qualifier le pattern
        const pattern = await this.analyzePatternWithLLM(concept, cluster);
        
        if (pattern.detected && !dryRun) {
          const patternId = await this.storePattern(pattern, cluster);
          results.push({ ...pattern, patternId });
        } else if (pattern.detected) {
          results.push(pattern);
        }
      }
    }
    
    return results;
  }

  /**
   * Clustering simple basé sur les concepts extraits
   */
  private clusterByConcepts(discoveries: Discovery[]): Map<string, Discovery[]> {
    const clusters = new Map<string, Discovery[]>();
    
    for (const discovery of discoveries) {
      const concept = discovery.extractedConcept.toLowerCase();
      
      // Trouver un cluster existant similaire
      let matched = false;
      for (const [key, cluster] of clusters.entries()) {
        if (this.conceptsAreSimilar(key, concept)) {
          cluster.push(discovery);
          matched = true;
          break;
        }
      }
      
      // Sinon créer un nouveau cluster
      if (!matched) {
        clusters.set(concept, [discovery]);
      }
    }
    
    return clusters;
  }

  /**
   * Vérifie si deux concepts sont similaires (simple matching de mots)
   */
  private conceptsAreSimilar(a: string, b: string): boolean {
    const wordsA = a.split(/\s+/);
    const wordsB = b.split(/\s+/);
    
    // Au moins 2 mots en commun
    const commonWords = wordsA.filter(w => wordsB.includes(w));
    return commonWords.length >= 2;
  }

  /**
   * Analyse un pattern potentiel avec LLM
   */
  private async analyzePatternWithLLM(
    concept: string,
    evidence: Discovery[]
  ): Promise<PatternDetectionResult> {
    const evidenceText = evidence.map(e => 
      `- ${e.sourcePlatform}: ${e.rawTitle} (${e.engagementScore} engagement)`
    ).join('\n');

    const prompt = `Tu es le Knowledge Fusion Engine d'Alt Ctrl Lab.

CONCEPT CLUSTER: "${concept}"

EVIDENCE (${evidence.length} sources):
${evidenceText}

Analyse ces découvertes. Détectes-tu un pattern significatif?

FORMAT JSON:
{
  "detected": true/false,
  "type": "recurring_problem|emerging_tech|market_shift|tool_opportunity",
  "confidence": 0.0-1.0,
  "description": "Description du pattern détecté (2-3 phrases)",
  "actionable": true/false,
  "suggestedAction": "Action recommandée si actionable"
}

RÈGLES:
- detected=true seulement si vraiment significatif
- confidence basée sur la cohérence des sources
- actionable=true si on peut agir dessus

Ne retourne QUE le JSON.`;

    try {
      const result = await executeOpenClawAgent('abdulkhabir', prompt, 60000);
      
      if (!result.success) {
        return { detected: false, confidence: 0 };
      }
      
      const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { detected: false, confidence: 0 };
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        detected: parsed.detected && parsed.confidence > 0.6,
        type: parsed.type,
        confidence: parsed.confidence,
        evidence: evidence.map(e => e.id),
      };
    } catch (error) {
      console.error('[FusionEngine] Pattern analysis failed:', error);
      return { detected: false, confidence: 0 };
    }
  }

  /**
   * Stocke un pattern détecté
   */
  private async storePattern(
    pattern: PatternDetectionResult,
    evidence: Discovery[]
  ): Promise<string> {
    const db = getDb();
    
    const patternId = `ptn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newPattern: NewDetectedPattern = {
      id: patternId,
      patternType: pattern.type || 'emerging_tech',
      title: `Pattern: ${pattern.type}`,
      description: 'Pattern detected by Fusion Engine',
      evidenceIds: JSON.stringify(pattern.evidence),
      evidenceCount: evidence.length,
      firstSeenAt: evidence[0].discoveredAt,
      lastSeenAt: evidence[evidence.length - 1].discoveredAt,
      trendDirection: 'rising',
      actionable: true,
      suggestedAction: 'Review for implementation',
      status: 'detected',
      createdAt: new Date(),
    };
    
    await db.insert(detectedPatterns).values(newPattern);
    
    console.log(`[FusionEngine] Pattern stored: ${patternId}`);
    
    return patternId;
  }

  /**
   * Analyse les tendances temporelles
   */
  private async analyzeTrends(since: Date): Promise<TrendAnalysis[]> {
    const db = getDb();
    
    // Récupérer les données avec engagement
    const recentData = await db.select({
      concept: discoveries.extractedConcept,
      platform: discoveries.sourcePlatform,
      engagement: discoveries.engagementScore,
      discoveredAt: discoveries.discoveredAt,
    })
    .from(discoveries)
    .where(gte(discoveries.discoveredAt, since));
    
    // Grouper par concept
    const conceptStats = new Map<string, {
      count: number;
      sources: Set<string>;
      engagements: number[];
      dates: Date[];
    }>();
    
    for (const row of recentData) {
      const concept = row.concept.toLowerCase().split(' ').slice(0, 3).join(' '); // Simplifier
      
      if (!conceptStats.has(concept)) {
        conceptStats.set(concept, {
          count: 0,
          sources: new Set(),
          engagements: [],
          dates: [],
        });
      }
      
      const stats = conceptStats.get(concept)!;
      stats.count++;
      stats.sources.add(row.platform);
      stats.engagements.push(row.engagement || 0);
      if (row.discoveredAt) stats.dates.push(row.discoveredAt);
    }
    
    // Calculer les tendances
    const trends: TrendAnalysis[] = [];
    
    for (const [concept, stats] of conceptStats.entries()) {
      if (stats.count >= 2) {
        const avgEngagement = stats.engagements.reduce((a, b) => a + b, 0) / stats.engagements.length;
        
        // Calculer la vélocité (accélération)
        const velocity = this.calculateVelocity(stats.dates);
        
        trends.push({
          concept,
          frequency: stats.count,
          velocity,
          sources: Array.from(stats.sources),
          avgEngagement,
          recommendation: this.getRecommendation(stats.count, avgEngagement, velocity),
        });
      }
    }
    
    // Trier par fréquence décroissante
    return trends.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Calcule la vélocité d'une tendance
   */
  private calculateVelocity(dates: Date[]): 'accelerating' | 'steady' | 'decelerating' {
    if (dates.length < 3) return 'steady';
    
    dates.sort((a, b) => a.getTime() - b.getTime());
    
    // Calculer les intervalles
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      intervals.push(dates[i].getTime() - dates[i-1].getTime());
    }
    
    // Comparer première et dernière moitié
    const mid = Math.floor(intervals.length / 2);
    const firstHalf = intervals.slice(0, mid);
    const secondHalf = intervals.slice(mid);
    
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (avgSecond < avgFirst * 0.7) return 'accelerating';
    if (avgSecond > avgFirst * 1.3) return 'decelerating';
    return 'steady';
  }

  /**
   * Recommandation basée sur les métriques
   */
  private getRecommendation(
    frequency: number,
    engagement: number,
    velocity: string
  ): 'investigate' | 'monitor' | 'ignore' {
    if (frequency >= 5 && engagement > 0.5 && velocity === 'accelerating') {
      return 'investigate';
    }
    if (frequency >= 3 && engagement > 0.3) {
      return 'monitor';
    }
    return 'ignore';
  }

  /**
   * Détecte les opportunités de synergie
   */
  private async detectSynergies(): Promise<SynergyOpportunity[]> {
    const db = getDb();
    
    // Récupérer les innovations récentes
    const recentInnovations = await db.select()
      .from(innovations)
      .where(eq(innovations.status, 'proposed'))
      .limit(20);
    
    const synergies: SynergyOpportunity[] = [];
    
    // Comparer chaque paire
    for (let i = 0; i < recentInnovations.length; i++) {
      for (let j = i + 1; j < recentInnovations.length; j++) {
        const a = recentInnovations[i];
        const b = recentInnovations[j];
        
        // Vérifier si les tags se chevauchent
        const tagsA = JSON.parse(a.tags || '[]') as string[];
        const tagsB = JSON.parse(b.tags || '[]') as string[];
        const commonTags = tagsA.filter(t => tagsB.includes(t));
        
        if (commonTags.length >= 2) {
          synergies.push({
            type: 'combine_capabilities',
            sourceA: a.title,
            sourceB: b.title,
            potentialValue: `Synergie sur ${commonTags.join(', ')}`,
            implementationComplexity: 'medium',
            reasoning: `Partagent les concepts: ${commonTags.join(', ')}`,
          });
        }
      }
    }
    
    return synergies.slice(0, 5); // Limiter à 5
  }

  /**
   * Enrichit le knowledge graph avec de nouvelles connexions
   */
  async enrichKnowledgeGraph(): Promise<number> {
    const db = getDb();
    
    // Trouver les innovations sans liens
    const unlinkedInnovations = await db.select()
      .from(innovations)
      .limit(10);
    
    let connectionsCreated = 0;
    
    for (const innovation of unlinkedInnovations) {
      // Chercher des découverties similaires
      const relatedDiscoveries = await db.select()
        .from(discoveries)
        .where(eq(discoveries.status, 'elevated'))
        .limit(20);
      
      for (const discovery of relatedDiscoveries) {
        // Vérifier si déjà lié
        const existing = await db.select()
          .from(knowledgeGraphEdges)
          .where(
            and(
              eq(knowledgeGraphEdges.sourceId, innovation.id),
              eq(knowledgeGraphEdges.targetId, discovery.id)
            )
          )
          .limit(1);
        
        if (existing.length === 0) {
          // Calculer la similarité
          const similarity = this.calculateSimilarity(
            innovation.altCtrlMutation,
            discovery.extractedConcept
          );
          
          if (similarity > 0.5) {
            await db.insert(knowledgeGraphEdges).values({
              id: `kge_${Date.now()}_${connectionsCreated}`,
              sourceId: innovation.id,
              sourceType: 'innovation',
              targetId: discovery.id,
              targetType: 'discovery',
              relationType: similarity > 0.8 ? 'extends' : 'complements',
              confidence: similarity,
              createdAt: new Date(),
            });
            
            connectionsCreated++;
          }
        }
      }
    }
    
    console.log(`[FusionEngine] Knowledge graph enriched: ${connectionsCreated} connections`);
    
    return connectionsCreated;
  }

  /**
   * Similarité simple entre deux textes (matching de mots)
   */
  private calculateSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\W+/));
    const wordsB = new Set(b.toLowerCase().split(/\W+/));
    
    const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    
    return intersection.size / union.size;
  }
}

// Singleton export
export const fusionEngine = new KnowledgeFusionEngine();
