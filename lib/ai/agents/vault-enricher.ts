/**
 * ⭐ VAULT ENRICHER - Auto-Learning System
 * 
 * "Chaque livrable approuvé enrichit notre mémoire collective"
 * 
 * Mission: Capturer les livrables de qualité et les transformer
 * en knowledge réutilisable pour les futures tâches.
 * 
 * Philosophy: "L'excellence n'est pas un accident, c'est un pattern"
 */

import { getDb } from '@/lib/db';
import { componentVault, type NewVaultedComponent } from '@/lib/db/schema';
import { innovations, learningLog } from '@/lib/db/schema_rd';
import { tasks } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';

// ============================================================================
// TYPES
// ============================================================================

export interface EnrichmentCandidate {
  taskId: string;
  agentName: string;
  brief: string;
  deliverable: string;
  quality: 'approved' | 'rejected' | 'revised';
  feedback?: string;
}

export interface EnrichmentResult {
  success: boolean;
  vaultId?: string;
  error?: string;
  embeddingGenerated?: boolean;
}

export interface ExtractedPattern {
  name: string;
  description: string;
  applicability: string[]; // Types de tâches où ce pattern s'applique
  codeTemplate?: string;
}

// ============================================================================
// CORE ENRICHER
// ============================================================================

export class VaultEnricher {
  
  /**
   * Traite les livrables récemment approuvés pour enrichir le vault
   */
  async processApprovedDeliverables(options: {
    since?: Date;
    limit?: number;
    dryRun?: boolean;
  } = {}): Promise<EnrichmentResult[]> {
    const { since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), limit = 10, dryRun = false } = options;
    
    console.log('[VaultEnricher] Processing approved deliverables...');
    
    // Récupérer les tâches complétées avec livrable
    const db = getDb();
    const completedTasks = await db.select()
      .from(tasks)
      .where(
        eq(tasks.status, 'COMPLETED')
      )
      .limit(limit);
    
    console.log(`[VaultEnricher] Found ${completedTasks.length} completed tasks`);
    
    const results: EnrichmentResult[] = [];
    
    for (const task of completedTasks) {
      if (!task.result) continue;
      
      try {
        const result = await this.enrichFromTask(task, dryRun);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    console.log(`[VaultEnricher] Processing complete: ${results.filter(r => r.success).length} vault entries created`);
    
    return results;
  }

  /**
   * Enrichit le vault à partir d'une tâche complétée
   */
  private async enrichFromTask(task: any, dryRun: boolean): Promise<EnrichmentResult> {
    const db = getDb();
    
    // Vérifier si déjà dans le vault
    const existing = await db.select({ id: componentVault.id })
      .from(componentVault)
      .where(eq(componentVault.serviceId, task.id))
      .limit(1);
    
    if (existing.length > 0) {
      return { success: false, error: 'Already in vault' };
    }
    
    // Analyser le livrable
    const analysis = await this.analyzeDeliverable(task.prompt, task.result);
    
    // Générer un embedding simple (bag of words pour l'instant, à remplacer par vrai embedding)
    const embedding = this.generateSimpleEmbedding(task.result);
    
    if (dryRun) {
      return { success: true, vaultId: 'dry-run', embeddingGenerated: true };
    }
    
    // Créer l'entrée vault
    const vaultEntry: NewVaultedComponent = {
      id: `vault_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      briefText: task.prompt,
      codeContent: task.result,
      embedding: JSON.stringify(embedding),
      serviceId: task.id,
      createdAt: new Date().toISOString(),
      successRate: 1.0,
      reuseCount: 0,
    };
    
    await db.insert(componentVault).values(vaultEntry);
    
    // Logger l'apprentissage
    await db.insert(learningLog).values({
      id: `learn_${Date.now()}`,
      eventType: 'vault_enriched',
      relatedTaskId: task.id,
      impactDescription: `Component vaulted: ${analysis.pattern.name}`,
      outcome: 'success',
      createdAt: new Date(),
    });
    
    console.log(`[VaultEnricher] Vault entry created: ${vaultEntry.id}`);
    
    return {
      success: true,
      vaultId: vaultEntry.id,
      embeddingGenerated: true,
    };
  }

  /**
   * Analyse un livrable pour en extraire les patterns
   */
  private async analyzeDeliverable(brief: string, deliverable: string): Promise<{
    pattern: ExtractedPattern;
    quality: number;
  }> {
    const prompt = `Tu es le Vault Enricher d'Alt Ctrl Lab.

BRIEF ORIGINAL:
${brief.substring(0, 1000)}

LIVRABLE:
${deliverable.substring(0, 3000)}

Analyse ce livrable et extrais:
1. Le pattern/architecture clé
2. La qualité du code (0-10)
3. Les cas d'usage réutilisables

FORMAT JSON:
{
  "pattern": {
    "name": "Nom du pattern",
    "description": "Description technique",
    "applicability": ["type1", "type2"],
    "codeTemplate": "Extrait générique réutilisable"
  },
  "quality": 0-10
}

Ne retourne QUE le JSON.`;

    try {
      const result = await executeOpenClawAgent('abdulbasir', prompt, 60000);
      
      if (!result.success) {
        throw new Error('Analysis failed');
      }
      
      const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON in analysis');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        pattern: parsed.pattern,
        quality: parsed.quality,
      };
    } catch (error) {
      // Fallback
      return {
        pattern: {
          name: 'Generic Component',
          description: 'Component from task',
          applicability: ['general'],
          codeTemplate: deliverable.substring(0, 500),
        },
        quality: 5,
      };
    }
  }

  /**
   * Génère un embedding simple (à remplacer par vrai embedding vectoriel)
   */
  private generateSimpleEmbedding(text: string): number[] {
    // Pour l'instant: bag of words normalisé
    // TODO: Intégrer avec une vraie API d'embedding (OpenAI, etc.)
    
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const wordFreq = new Map<string, number>();
    
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
    
    // Prendre les 50 mots les plus fréquents
    const topWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([word]) => word);
    
    // Créer un vecteur one-hot encoding
    const embedding: number[] = [];
    const vocabulary = new Set([...topWords, 'component', 'function', 'api', 'data']);
    
    for (const word of vocabulary) {
      embedding.push(words.filter(w => w === word).length / words.length);
    }
    
    return embedding;
  }

  /**
   * Met à jour les métriques d'utilisation d'un composant vaulté
   */
  async updateUsageMetrics(vaultId: string, success: boolean): Promise<void> {
    const db = getDb();
    
    const [entry] = await db.select()
      .from(componentVault)
      .where(eq(componentVault.id, vaultId))
      .limit(1);
    
    if (!entry) return;
    
    const newReuseCount = (entry.reuseCount || 0) + 1;
    const currentSuccessRate = entry.successRate || 1.0;
    
    // Moving average du success rate
    const newSuccessRate = (currentSuccessRate * (newReuseCount - 1) + (success ? 1 : 0)) / newReuseCount;
    
    await db.update(componentVault)
      .set({
        reuseCount: newReuseCount,
        successRate: newSuccessRate,
      })
      .where(eq(componentVault.id, vaultId));
    
    console.log(`[VaultEnricher] Updated metrics for ${vaultId}: ${newReuseCount} uses, ${newSuccessRate.toFixed(2)} success rate`);
  }

  /**
   * Cherche des composants similaires dans le vault
   */
  async findSimilarComponents(brief: string, threshold: number = 0.5): Promise<Array<{
    id: string;
    similarity: number;
    codeContent: string;
  }>> {
    const db = getDb();
    
    const briefEmbedding = this.generateSimpleEmbedding(brief);
    
    const allComponents = await db.select()
      .from(componentVault)
      .limit(100);
    
    const similarities = allComponents.map(comp => {
      const compEmbedding = JSON.parse(comp.embedding || '[]') as number[];
      const similarity = this.cosineSimilarity(briefEmbedding, compEmbedding);
      
      return {
        id: comp.id,
        similarity,
        codeContent: comp.codeContent,
      };
    });
    
    return similarities
      .filter(s => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  }

  /**
   * Similarité cosinus entre deux vecteurs
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      // Pad le plus court
      const maxLen = Math.max(a.length, b.length);
      a = [...a, ...new Array(maxLen - a.length).fill(0)];
      b = [...b, ...new Array(maxLen - b.length).fill(0)];
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Singleton export
export const vaultEnricher = new VaultEnricher();
