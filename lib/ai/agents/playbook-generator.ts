/**
 * ⭐ AUTO-PLAYBOOK GENERATOR
 * 
 * "L'architecte qui formalise l'excellence"
 * 
 * Mission: Générer automatiquement de nouveaux playbooks basés sur:
 * - Les patterns détectés
 * - Les livrables réussis dans le vault
 * - Les retours d'expérience (feedback loop)
 * 
 * Philosophy: "Ce qui fonctionne une fois est de la chance. Ce qui fonctionne 
 * trois fois est un playbook"
 */

import { getDb } from '@/lib/db';
import { detectedPatterns, autoPlaybooks, learningLog } from '@/lib/db/schema_rd';
import { componentVault } from '@/lib/db/schema';
import { eq, gte, sql, and } from 'drizzle-orm';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';

// ============================================================================
// CONFIGURATION
// ============================================================================

const GENERATOR_CONFIG = {
  thresholds: {
    minPatternEvidence: 3,
    minVaultSuccessRate: 0.7,
    minVaultReuses: 2,
    minPlaybookConfidence: 0.8,
  },
  
  // Mapping catégories → agents
  categoryToAgent: {
    'ai_capability': 'hakim',
    'dev_tool': 'matin',
    'design_system': 'musawwir',
    'automation': 'hasib',
    'workflow': 'hasib',
    'infrastructure': 'matin',
  } as Record<string, string>,
};

// ============================================================================
// TYPES
// ============================================================================

export interface PlaybookGenerationInput {
  type: 'from_pattern' | 'from_vault' | 'from_feedback';
  sourceId: string;
  sourceData: any;
}

export interface GeneratedPlaybook {
  name: string;
  agentName: string;
  triggerCondition: string;
  coreInstructions: string;
  examples: string[];
  generatedReasoning: string;
}

export interface GenerationResult {
  success: boolean;
  playbookId?: string;
  error?: string;
  confidence?: number;
}

// ============================================================================
// CORE GENERATOR
// ============================================================================

export class AutoPlaybookGenerator {
  private config = GENERATOR_CONFIG;

  /**
   * Analyse les sources et génère des playbooks si pertinent
   */
  async generateFromSources(): Promise<GenerationResult[]> {
    console.log('[PlaybookGenerator] Analyzing sources for playbook generation...');
    
    const results: GenerationResult[] = [];
    
    // 1. Générer depuis les patterns
    const patternResults = await this.generateFromPatterns();
    results.push(...patternResults);
    
    // 2. Générer depuis le vault
    const vaultResults = await this.generateFromVault();
    results.push(...vaultResults);
    
    console.log(`[PlaybookGenerator] Generated ${results.filter(r => r.success).length} new playbooks`);
    
    return results;
  }

  /**
   * Génère des playbooks depuis les patterns détectés
   */
  private async generateFromPatterns(): Promise<GenerationResult[]> {
    const db = getDb();
    
    const patterns = await db.select()
      .from(detectedPatterns)
      .where(
        and(
          eq(detectedPatterns.status, 'validated'),
          gte(detectedPatterns.evidenceCount, this.config.thresholds.minPatternEvidence)
        )
      );
    
    const results: GenerationResult[] = [];
    
    for (const pattern of patterns) {
      // Vérifier si un playbook existe déjà pour ce pattern
      const existing = await db.select()
        .from(autoPlaybooks)
        .where(eq(autoPlaybooks.generatedFromPattern, pattern.id))
        .limit(1);
      
      if (existing.length > 0) continue;
      
      try {
        const result = await this.generateFromPattern(pattern);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return results;
  }

  /**
   * Génère un playbook depuis un pattern spécifique
   */
  private async generateFromPattern(pattern: any): Promise<GenerationResult> {
    console.log(`[PlaybookGenerator] Generating from pattern: ${pattern.id}`);
    
    const prompt = `Tu es l'Auto-Playbook Generator d'Alt Ctrl Lab.

PATTERN DÉTECTÉ: "${pattern.title}"
Type: ${pattern.patternType}
Description: ${pattern.description}
Evidence: ${pattern.evidenceCount} cas similaires détectés

MISSION: Génère un PLAYBOOK pour l'agent approprié.

FORMAT JSON:
{
  "name": "Nom du playbook (snake_case)",
  "agentName": "hakim|musawwir|matin|fatah|hasib",
  "triggerCondition": "Quand ce playbook s'applique (description)",
  "coreInstructions": "Instructions détaillées (10-15 lignes)",
  "examples": ["Exemple d'application 1", "Exemple 2"],
  "generatedReasoning": "Pourquoi ce playbook a été créé"
}

RÈGLES:
- Le playbook doit être ACTIONABLE
- Instructions claires et non ambiguës
- Agent choisi selon le type de pattern

Ne retourne QUE le JSON.`;

    const result = await executeOpenClawAgent('abdulbasir', prompt, 120000);
    
    if (!result.success) {
      return { success: false, error: 'LLM generation failed' };
    }
    
    try {
      const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      const playbook = await this.storePlaybook({
        name: parsed.name,
        agentName: parsed.agentName,
        triggerCondition: parsed.triggerCondition,
        coreInstructions: parsed.coreInstructions,
        examples: parsed.examples,
        generatedReasoning: parsed.generatedReasoning,
      }, pattern.id);
      
      return {
        success: true,
        playbookId: playbook.id,
        confidence: 0.85,
      };
    } catch (error) {
      return {
        success: false,
        error: `Parsing failed: ${error}`,
      };
    }
  }

  /**
   * Génère des playbooks depuis les composants vaultés réussis
   */
  private async generateFromVault(): Promise<GenerationResult[]> {
    const db = getDb();
    
    const successfulComponents = await db.select()
      .from(componentVault)
      .where(
        and(
          gte(componentVault.successRate, this.config.thresholds.minVaultSuccessRate),
          gte(componentVault.reuseCount, this.config.thresholds.minVaultReuses)
        )
      );
    
    const results: GenerationResult[] = [];
    
    for (const component of successfulComponents) {
      try {
        const result = await this.generateFromVaultComponent(component);
        if (result.success) results.push(result);
      } catch (error) {
        console.error('[PlaybookGenerator] Failed to generate from vault:', error);
      }
    }
    
    return results;
  }

  /**
   * Génère un playbook depuis un composant vaulté
   */
  private async generateFromVaultComponent(component: any): Promise<GenerationResult> {
    console.log(`[PlaybookGenerator] Generating from vault component: ${component.id}`);
    
    const prompt = `Tu es l'Auto-Playbook Generator d'Alt Ctrl Lab.

COMPOSANT RÉUSSI (Success rate: ${component.successRate}, Reuses: ${component.reuseCount}):
Brief: ${component.briefText.substring(0, 500)}
Code: ${component.codeContent.substring(0, 1000)}

MISSION: Extraire le PATTERN réutilisable et en faire un PLAYBOOK.

FORMAT JSON:
{
  "name": "Nom du playbook",
  "agentName": "hakim|musawwir|matin|fatah|hasib",
  "triggerCondition": "Quand utiliser ce pattern",
  "coreInstructions": "Comment appliquer ce pattern (étapes)",
  "examples": ["Exemple de brief adapté"],
  "generatedReasoning": "Pourquoi ce pattern est efficace"
}

Ne retourne QUE le JSON.`;

    const result = await executeOpenClawAgent('abdulbasir', prompt, 120000);
    
    if (!result.success) {
      return { success: false, error: 'LLM generation failed' };
    }
    
    try {
      const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      const playbook = await this.storePlaybook({
        name: parsed.name,
        agentName: parsed.agentName,
        triggerCondition: parsed.triggerCondition,
        coreInstructions: parsed.coreInstructions,
        examples: parsed.examples,
        generatedReasoning: parsed.generatedReasoning,
      });
      
      return {
        success: true,
        playbookId: playbook.id,
        confidence: component.successRate,
      };
    } catch (error) {
      return { success: false, error: `Parsing failed: ${error}` };
    }
  }

  /**
   * Stocke un playbook généré
   */
  private async storePlaybook(
    playbook: GeneratedPlaybook,
    patternId?: string
  ): Promise<{ id: string }> {
    const db = getDb();
    
    const id = `pb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.insert(autoPlaybooks).values({
      id,
      name: playbook.name,
      agentName: playbook.agentName as any,
      triggerCondition: playbook.triggerCondition,
      coreInstructions: playbook.coreInstructions,
      examples: JSON.stringify(playbook.examples),
      generatedFromPattern: patternId,
      generatedReasoning: playbook.generatedReasoning,
      status: 'draft',
      createdAt: new Date(),
    });
    
    console.log(`[PlaybookGenerator] Playbook stored: ${id}`);
    
    return { id };
  }

  /**
   * Active un playbook draft après review
   */
  async activatePlaybook(playbookId: string): Promise<boolean> {
    const db = getDb();
    
    await db.update(autoPlaybooks)
      .set({ status: 'active' })
      .where(eq(autoPlaybooks.id, playbookId));
    
    console.log(`[PlaybookGenerator] Playbook activated: ${playbookId}`);
    
    return true;
  }

  /**
   * Récupère les playbooks actifs pour un agent
   */
  async getActivePlaybooks(agentName: string): Promise<any[]> {
    const db = getDb();
    
    return db.select()
      .from(autoPlaybooks)
      .where(
        and(
          eq(autoPlaybooks.agentName, agentName as any),
          eq(autoPlaybooks.status, 'active')
        )
      );
  }

  /**
   * Met à jour les statistiques d'utilisation d'un playbook
   */
  async updatePlaybookStats(playbookId: string, success: boolean): Promise<void> {
    const db = getDb();
    
    const [playbook] = await db.select()
      .from(autoPlaybooks)
      .where(eq(autoPlaybooks.id, playbookId))
      .limit(1);
    
    if (!playbook) return;
    
    const newUsageCount = (playbook.usageCount || 0) + 1;
    const currentSuccessRate = playbook.successRate || 1.0;
    const newSuccessRate = (currentSuccessRate * (newUsageCount - 1) + (success ? 1 : 0)) / newUsageCount;
    
    await db.update(autoPlaybooks)
      .set({
        usageCount: newUsageCount,
        successRate: newSuccessRate,
        lastUsedAt: new Date(),
      })
      .where(eq(autoPlaybooks.id, playbookId));
    
    // Déprécier si trop peu efficace
    if (newSuccessRate < 0.3 && newUsageCount > 5) {
      await db.update(autoPlaybooks)
        .set({ status: 'deprecated' })
        .where(eq(autoPlaybooks.id, playbookId));
      
      console.log(`[PlaybookGenerator] Playbook deprecated: ${playbookId} (success rate ${newSuccessRate.toFixed(2)})`);
    }
  }
}

// Singleton export
// Singleton export
export const autoPlaybookGenerator = new AutoPlaybookGenerator();
