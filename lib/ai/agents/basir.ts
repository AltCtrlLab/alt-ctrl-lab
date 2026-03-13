/**
 * ⭐ ABDUL BASIR - The Elevator (البصير)
 * 
 * "Celui qui voit au-delà de l'évident"
 * 
 * Mission: Transformer les découvertes brutes en innovations stratégiques
 * pour Alt Ctrl Lab. Ne pas copier, mais élever au niveau Top 1%.
 * 
 * Philosophy: "Ce n'est pas ce qu'ils ont fait qui compte, c'est ce que 
 * NOUS pouvons en faire de meilleur"
 */

import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import { getDb } from '@/lib/db';
import { 
  discoveries, 
  innovations, 
  type Discovery, 
  type NewInnovation,
  knowledgeGraphEdges,
} from '@/lib/db/schema_rd';
import { eq, sql } from 'drizzle-orm';

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASIR_CONFIG = {
  // Seuils de scoring
  thresholds: {
    minOpportunityScore: 60, // Sur 100
    minNoveltyScore: 5,      // Sur 10
    minFeasibilityScore: 4,  // Sur 10
    minStrategicFit: 6,      // Sur 10
  },
  
  // Poids pour le scoring composite
  weights: {
    novelty: 0.25,
    feasibility: 0.25,
    strategicFit: 0.30,
    marketTiming: 0.20,
  },
  
  // Templates d'élévation
  elevationAngles: [
    'technical_superiority',    // "Notre version est plus robuste"
    'integration_depth',        // "S'intègre mieux à notre stack"
    'ux_elevation',             // "Expérience utilisateur supérieure"
    'business_model_twist',     // "Monétisation différente"
    'vertical_focus',           // "Spécialisé pour notre niche"
    'automation_layer',         // "Plus automatisé"
  ],
};

// ============================================================================
// TYPES
// ============================================================================

export interface ElevationInput {
  discovery: Discovery;
  context?: {
    similarInnovations?: string[];
    existingCapabilities?: string[];
    recentImplementations?: string[];
  };
}

export interface ElevationResult {
  success: boolean;
  innovationId?: string;
  rejected?: boolean;
  rejectionReason?: string;
  opportunityScore?: number;
}

export interface ElevatedInnovation {
  title: string;
  originalConcept: string;
  altCtrlMutation: string;
  technicalArchitecture: string;
  implementationComplexity: 'trivial' | 'easy' | 'medium' | 'hard' | 'epic';
  estimatedImplementationDays: number;
  
  // Scores
  impactScore: number;
  impactAnalysis: string;
  businessValue: string;
  opportunityScore: number;
  noveltyScore: number;
  feasibilityScore: number;
  strategicFitScore: number;
  
  // Categorization
  category: 'ai_capability' | 'dev_tool' | 'design_system' | 'automation' | 'workflow' | 'infrastructure';
  tags: string[];
  
  // Reasoning
  elevationReasoning: string;
  differentiationFactors: string[];
  risks: string[];
  mitigationStrategies: string[];
}

// ============================================================================
// CORE AGENT
// ============================================================================

export class AbdulBasir {
  private config = BASIR_CONFIG;

  /**
   * Traite toutes les découvertes en attente
   */
  async processPendingDiscoveries(): Promise<ElevationResult[]> {
    const db = getDb();
    
    // Récupérer les découvertes non traitées
    const pendingDiscoveries = await db.select()
      .from(discoveries)
      .where(eq(discoveries.status, 'raw'))
      .limit(10);
    
    console.log(`[Basir] Processing ${pendingDiscoveries.length} pending discoveries...`);
    
    const results: ElevationResult[] = [];
    
    for (const discovery of pendingDiscoveries) {
      try {
        const result = await this.elevate({ discovery });
        results.push(result);
        
        // Petite pause pour éviter de surcharger l'API
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        results.push({
          success: false,
          rejected: true,
          rejectionReason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    console.log(`[Basir] Processing complete: ${results.filter(r => r.success).length} innovations created`);
    
    return results;
  }

  /**
   * Élève une découverte en innovation
   */
  async elevate(input: ElevationInput): Promise<ElevationResult> {
    const { discovery } = input;
    const db = getDb();
    
    console.log(`[Basir] Elevating discovery: ${discovery.id}`);
    
    // Marquer comme en cours d'analyse
    await db.update(discoveries)
      .set({ status: 'analyzing' })
      .where(eq(discoveries.id, discovery.id));
    
    // Récupérer le contexte (innovations similaires)
    const context = await this.gatherContext(discovery);
    
    // Élever avec LLM
    const elevation = await this.elevateWithLLM(discovery, context);
    
    // Calculer le score composite
    const opportunityScore = this.calculateOpportunityScore(elevation);
    
    // Vérifier les seuils
    if (opportunityScore < this.config.thresholds.minOpportunityScore) {
      await this.rejectDiscovery(discovery.id, 'Opportunity score too low');
      return {
        success: false,
        rejected: true,
        rejectionReason: `Opportunity score ${opportunityScore.toFixed(1)} below threshold ${this.config.thresholds.minOpportunityScore}`,
        opportunityScore,
      };
    }

    if (elevation.noveltyScore < this.config.thresholds.minNoveltyScore) {
      await this.rejectDiscovery(discovery.id, 'Not novel enough');
      return {
        success: false,
        rejected: true,
        rejectionReason: 'Novelty score too low',
        opportunityScore,
      };
    }

    // Créer l'innovation
    const innovation: NewInnovation = {
      id: `inn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      discoveryId: discovery.id,
      title: elevation.title,
      originalConcept: elevation.originalConcept,
      altCtrlMutation: elevation.altCtrlMutation,
      technicalArchitecture: elevation.technicalArchitecture,
      implementationComplexity: elevation.implementationComplexity,
      estimatedImplementationDays: elevation.estimatedImplementationDays,
      impactScore: elevation.impactScore,
      impactAnalysis: elevation.impactAnalysis,
      businessValue: elevation.businessValue,
      opportunityScore,
      noveltyScore: elevation.noveltyScore,
      feasibilityScore: elevation.feasibilityScore,
      strategicFitScore: elevation.strategicFitScore,
      category: elevation.category,
      tags: JSON.stringify(elevation.tags),
      status: 'proposed',
      elevatedBy: 'abdulbasir',
      createdAt: new Date(),
    };
    
    await db.insert(innovations).values(innovation);
    
    // Mettre à jour la découverte
    await db.update(discoveries)
      .set({ status: 'elevated', processedAt: new Date() })
      .where(eq(discoveries.id, discovery.id));
    
    // Créer des liens dans le knowledge graph
    await this.createKnowledgeLinks(innovation.id, discovery, elevation);
    
    console.log(`[Basir] Innovation created: ${innovation.id} (Score: ${opportunityScore.toFixed(1)})`);
    
    return {
      success: true,
      innovationId: innovation.id,
      opportunityScore,
    };
  }

  /**
   * Élève avec LLM
   */
  private async elevateWithLLM(
    discovery: Discovery,
    context: any
  ): Promise<ElevatedInnovation> {
    const prompt = `Tu es AbdulBasir, Chief Innovation Officer de Alt Ctrl Lab.

DÉCOUVERTE BRUTE (de AbdulKhabir):
Concept: ${discovery.extractedConcept}
Source: ${discovery.sourcePlatform} - ${discovery.rawTitle}
Contenu: ${discovery.rawContent.substring(0, 2000)}
Maturité tech: ${discovery.techMaturity}

CONTEXTE ALT CTRL LAB:
Agence digitale IA multi-agents. 5 agents: CEO (Supervision), DA (Design), Dev (Tech), Growth (Marketing), Data (Automation).
Mission: Opérer dans le top 1% mondial.

${context.similarInnovations ? `Innovations similaires existantes:\n${context.similarInnovations.join('\n')}` : ''}

TA MISSION - ÉLÈVE CETTE DÉCOUVERTE:
Transforme ce concept en opportunité stratégique pour Alt Ctrl Lab.
Ne copie PAS. Crée une VERSION SUPÉRIEURE adaptée à notre agence.

FORMAT JSON DE RÉPONSE:
{
  "title": "Titre accrocheur [SYSTEM_UPGRADE] - Nom de l'innovation",
  "originalConcept": "Résumé de la découverte originale (1 phrase)",
  "altCtrlMutation": "Notre version élevée (2-3 phrases décrivant l'innovation unique)",
  "technicalArchitecture": "Stack technique recommandé",
  "implementationComplexity": "trivial|easy|medium|hard|epic",
  "estimatedImplementationDays": nombre,
  "impactScore": 0-10,
  "impactAnalysis": "Analyse d'impact détaillée",
  "businessValue": "Valeur business estimée (€ ou % d'amélioration)",
  "noveltyScore": 0-10,
  "feasibilityScore": 0-10,
  "strategicFitScore": 0-10,
  "category": "ai_capability|dev_tool|design_system|automation|workflow|infrastructure",
  "tags": ["tag1", "tag2"],
  "elevationReasoning": "Pourquoi c'est meilleur que l'original",
  "differentiationFactors": ["facteur 1", "facteur 2"],
  "risks": ["risque 1"],
  "mitigationStrategies": ["stratégie 1"]
}

RÈGLES:
- Scores honnêtes, pas gonflés
- DifferentiationFactors doit montrer pourquoi on est meilleurs
- altCtrlMutation doit être CONCRÈTEMENT différent de l'original
- Pas de jargon inutile

Ne retourne QUE le JSON.`;

    const result = await executeOpenClawAgent('abdulbasir', prompt, 120000);
    
    if (!result.success) {
      throw new Error(`Elevation LLM failed: ${result.stderr}`);
    }

    try {
      const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in elevation response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        title: parsed.title,
        originalConcept: parsed.originalConcept,
        altCtrlMutation: parsed.altCtrlMutation,
        technicalArchitecture: parsed.technicalArchitecture,
        implementationComplexity: parsed.implementationComplexity,
        estimatedImplementationDays: parsed.estimatedImplementationDays,
        impactScore: parsed.impactScore,
        impactAnalysis: parsed.impactAnalysis,
        businessValue: parsed.businessValue,
        noveltyScore: parsed.noveltyScore,
        feasibilityScore: parsed.feasibilityScore,
        strategicFitScore: parsed.strategicFitScore,
        category: parsed.category,
        tags: parsed.tags || [],
        elevationReasoning: parsed.elevationReasoning,
        differentiationFactors: parsed.differentiationFactors || [],
        risks: parsed.risks || [],
        mitigationStrategies: parsed.mitigationStrategies || [],
      };
    } catch (error) {
      console.error('[Basir] Failed to parse elevation:', result.stdout);
      throw error;
    }
  }

  /**
   * Calcule le score d'opportunité composite
   */
  private calculateOpportunityScore(elevation: ElevatedInnovation): number {
    const { weights } = this.config;
    
    const score = 
      (elevation.noveltyScore * weights.novelty +
       elevation.feasibilityScore * weights.feasibility +
       elevation.strategicFitScore * weights.strategicFit +
       (elevation.impactScore / 10) * 10 * weights.marketTiming) * 10;
    
    return Math.round(score);
  }

  /**
   * Rejette une découverte
   */
  private async rejectDiscovery(discoveryId: string, reason: string): Promise<void> {
    const db = getDb();
    
    await db.update(discoveries)
      .set({ status: 'rejected', processedAt: new Date() })
      .where(eq(discoveries.id, discoveryId));
    
    console.log(`[Basir] Rejected discovery ${discoveryId}: ${reason}`);
  }

  /**
   * Récupère le contexte pour l'élévation
   */
  private async gatherContext(discovery: Discovery): Promise<any> {
    const db = getDb();
    
    // Trouver des innovations similaires (basé sur les tags/concepts)
    const relatedConcepts = JSON.parse(discovery.relatedConcepts || '[]') as string[];
    
    const similarInnovations = await db.select({
      id: innovations.id,
      title: innovations.title,
      tags: innovations.tags,
    })
    .from(innovations)
    .limit(5);
    
    // Filtrer manuellement ceux qui ont des tags en commun
    const relevant = similarInnovations.filter(inn => {
      const innTags = JSON.parse(inn.tags || '[]') as string[];
      return innTags.some(tag => relatedConcepts.includes(tag));
    });
    
    return {
      similarInnovations: relevant.map(r => r.title),
    };
  }

  /**
   * Crée des liens dans le knowledge graph
   */
  private async createKnowledgeLinks(
    innovationId: string,
    discovery: Discovery,
    elevation: ElevatedInnovation
  ): Promise<void> {
    const db = getDb();
    
    // Lien: Innovation → Discovery (builds_on)
    await db.insert(knowledgeGraphEdges).values({
      id: `kge_${Date.now()}_1`,
      sourceId: innovationId,
      sourceType: 'innovation',
      targetId: discovery.id,
      targetType: 'discovery',
      relationType: 'builds_on',
      confidence: 0.95,
      createdAt: new Date(),
    });
    
    // Lien: Innovation → Concepts existants (extends)
    // (À enrichir quand on aura plus de données)
  }

  /**
   * Force l'analyse d'une découverte spécifique (pour tests)
   */
  async forceElevateDiscovery(discoveryId: string): Promise<ElevationResult> {
    const db = getDb();
    
    const [discovery] = await db.select()
      .from(discoveries)
      .where(eq(discoveries.id, discoveryId))
      .limit(1);
    
    if (!discovery) {
      return { success: false, rejected: true, rejectionReason: 'Discovery not found' };
    }
    
    return this.elevate({ discovery });
  }
}

// Singleton export
export const abdulBasir = new AbdulBasir();
