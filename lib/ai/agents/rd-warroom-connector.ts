/**
 * ⭐ R&D → WAR ROOM CONNECTOR
 * 
 * "Le pont entre l'innovation et l'exécution"
 * 
 * Mission: Connecter le pipeline R&D au War Room Protocol.
 * Quand une innovation est approuvée, elle devient un projet à implémenter.
 * 
 * Philosophy: "Une idée sans exécution vaut 1$. Une idée avec exécution vaut des millions"
 */

import { getDb } from '@/lib/db';
import { innovations, learningLog } from '@/lib/db/schema_rd';
import { eq, and, gte, sql, isNull } from 'drizzle-orm';

// ============================================================================
// TYPES
// ============================================================================

export interface InnovationToWarRoom {
  innovationId: string;
  title: string;
  description: string;
  category: string;
  technicalArchitecture: string | null;
  estimatedDays: number | null;
  opportunityScore: number | null;
}

export interface WarRoomDispatchResult {
  success: boolean;
  warRoomId?: string;
  taskId?: string;
  error?: string;
}

// ============================================================================
// CONNECTOR
// ============================================================================

export class RDWarRoomConnector {
  
  /**
   * Vérifie les innovations approuvées et les envoie au War Room
   */
  async dispatchApprovedInnovations(): Promise<WarRoomDispatchResult[]> {
    const db = getDb();
    
    console.log('[RDWarRoomConnector] Checking for approved innovations...');
    
    // Récupérer les innovations approuvées non encore dispatchées
    const pendingInnovations = await db.select()
      .from(innovations)
      .where(
        and(
          eq(innovations.status, 'approved'),
          isNull(innovations.implementationTaskId)
        )
      );
    
    console.log(`[RDWarRoomConnector] Found ${pendingInnovations.length} approved innovations to dispatch`);
    
    const results: WarRoomDispatchResult[] = [];
    
    for (const innovation of pendingInnovations) {
      try {
        const result = await this.dispatchToWarRoom({
          innovationId: innovation.id,
          title: innovation.title,
          description: innovation.altCtrlMutation,
          category: innovation.category,
          technicalArchitecture: innovation.technicalArchitecture,
          estimatedDays: innovation.estimatedImplementationDays,
          opportunityScore: innovation.opportunityScore,
        });
        
        results.push(result);
        
        if (result.success) {
          // Mettre à jour l'innovation avec le lien vers le War Room
          await db.update(innovations)
            .set({
              status: 'in_progress',
              implementationTaskId: result.taskId || result.warRoomId,
            })
            .where(eq(innovations.id, innovation.id));
          
          await this.logDispatch(innovation.id, result);
        }
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
   * Envoie une innovation au War Room Protocol
   */
  private async dispatchToWarRoom(innovation: InnovationToWarRoom): Promise<WarRoomDispatchResult> {
    console.log(`[RDWarRoomConnector] Dispatching innovation: ${innovation.innovationId}`);
    
    // Construire le brief pour le War Room
    const warRoomBrief = this.buildWarRoomBrief(innovation);
    
    try {
      // Appeler l'API War Room (Supervisor)
      const response = await fetch('http://localhost:3000/api/supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: warRoomBrief,
          service_id: 'full_agency',
          priority: this.getPriority(innovation.opportunityScore),
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`War Room API error: ${error}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        warRoomId: data.data?.protocol === 'WAR_ROOM_PROTOCOL' ? `warroom_${Date.now()}` : undefined,
        taskId: data.data?.taskId,
      };
    } catch (error) {
      console.error('[RDWarRoomConnector] Dispatch failed:', error);
      
      // Fallback: Créer une tâche directement via l'API agents
      try {
        const fallbackResult = await this.fallbackDispatch(innovation);
        return fallbackResult;
      } catch (fallbackError) {
        return {
          success: false,
          error: `War Room dispatch failed: ${error}. Fallback also failed: ${fallbackError}`,
        };
      }
    }
  }

  /**
   * Construit le brief pour le War Room
   */
  private buildWarRoomBrief(innovation: InnovationToWarRoom): string {
    return `[SYSTEM_UPGRADE] ${innovation.title}

🎯 ORIGINE
Cette fonctionnalité a été découverte et élevée par notre système R&D autonome.
Score d'opportunité: ${innovation.opportunityScore}/100

📋 DESCRIPTION
${innovation.description}

🏗️ ARCHITECTURE TECHNIQUE
${innovation.technicalArchitecture || 'À définir par les Directeurs'}

⏱️ ESTIMATION
${innovation.estimatedDays ? `${innovation.estimatedDays} jours` : 'À estimer'}

🎪 CATÉGORIE
${innovation.category}

⚡ DIRECTIVES
Cette innovation a été VALIDÉE par le CEO (système).
Elle doit être implémentée selon les standards Alt Ctrl Lab (Top 1%).

Phase 1: Exploration des options par le CEO
Phase 2: Débat technique (CTO + DA)
Phase 3: Décision et planification
Phase 4: Exécution par les équipes

Livrable attendu: Implémentation complète et testée.`;
  }

  /**
   * Détermine la priorité basée sur le score d'opportunité
   */
  private getPriority(score: number | null): 'critical' | 'high' | 'normal' | 'low' {
    if (!score) return 'normal';
    if (score >= 90) return 'critical';
    if (score >= 75) return 'high';
    if (score >= 50) return 'normal';
    return 'low';
  }

  /**
   * Fallback: Dispatch direct via l'API agents
   */
  private async fallbackDispatch(innovation: InnovationToWarRoom): Promise<WarRoomDispatchResult> {
    console.log('[RDWarRoomConnector] Using fallback dispatch...');
    
    const response = await fetch('http://localhost:3000/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'run_agent',
        payload: {
          agent_name: 'abdulhakim',
          prompt: this.buildWarRoomBrief(innovation),
          timeout: 900,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Fallback dispatch failed: ${await response.text()}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      taskId: data.data?.taskId,
    };
  }

  /**
   * Force le dispatch d'une innovation spécifique
   */
  async forceDispatch(innovationId: string): Promise<WarRoomDispatchResult> {
    const db = getDb();

    const [innovation] = await db.select()
      .from(innovations)
      .where(eq(innovations.id, innovationId))
      .limit(1);

    if (!innovation) {
      return { success: false, error: 'Innovation not found' };
    }

    if (innovation.status !== 'approved' && innovation.status !== 'proposed') {
      return { success: false, error: `Innovation status is ${innovation.status}, expected approved or proposed` };
    }

    const result = await this.dispatchToWarRoom({
      innovationId: innovation.id,
      title: innovation.title,
      description: innovation.altCtrlMutation,
      category: innovation.category,
      technicalArchitecture: innovation.technicalArchitecture,
      estimatedDays: innovation.estimatedImplementationDays,
      opportunityScore: innovation.opportunityScore,
    });

    if (result.success) {
      await db.update(innovations)
        .set({
          status: 'in_progress',
          implementationTaskId: result.taskId || result.warRoomId || null,
        })
        .where(eq(innovations.id, innovationId));

      await this.logDispatch(innovationId, result);
    }

    return result;
  }

  /**
   * Récupère le statut des innovations en cours d'implémentation
   */
  async getImplementationStatus(): Promise<Array<{
    innovationId: string;
    title: string;
    warRoomId?: string;
    status: string;
    progress?: number;
  }>> {
    const db = getDb();
    
    const inProgress = await db.select()
      .from(innovations)
      .where(eq(innovations.status, 'in_progress'));
    
    // TODO: Récupérer le vrai statut depuis le War Room
    return inProgress.map(i => ({
      innovationId: i.id,
      title: i.title,
      warRoomId: i.implementationTaskId || undefined,
      status: 'in_progress',
    }));
  }

  /**
   * Met à jour le statut d'une innovation basé sur le statut du War Room
   */
  async syncImplementationStatus(): Promise<void> {
    const db = getDb();
    
    const inProgress = await db.select()
      .from(innovations)
      .where(eq(innovations.status, 'in_progress'));
    
    for (const innovation of inProgress) {
      if (!innovation.implementationTaskId) continue;
      
      try {
        // Vérifier le statut de la tâche
        const response = await fetch(`http://localhost:3000/api/agents?action=get_tasks`);
        const data = await response.json();
        
        const tasks = data.data?.tasks || [];
        const task = tasks.find((t: any) => t.id === innovation.implementationTaskId);
        
        if (task && task.status === 'COMPLETED') {
          await db.update(innovations)
            .set({
              status: 'implemented',
              implementedAt: new Date(),
            })
            .where(eq(innovations.id, innovation.id));
          
          console.log(`[RDWarRoomConnector] Innovation ${innovation.id} marked as implemented`);
        }
      } catch (error) {
        console.error(`[RDWarRoomConnector] Failed to sync status for ${innovation.id}:`, error);
      }
    }
  }

  private async logDispatch(innovationId: string, result: WarRoomDispatchResult): Promise<void> {
    const db = getDb();
    
    try {
      await db.insert(learningLog).values({
        id: `dispatch_${Date.now()}`,
        eventType: 'implementation_started',
        relatedInnovationId: innovationId,
        impactDescription: `Dispatched to War Room: ${result.warRoomId || result.taskId}`,
        createdAt: new Date(),
      });
    } catch (e) {
      console.error('[RDWarRoomConnector] Failed to log dispatch:', e);
    }
  }
}

// Singleton export
export const rdWarRoomConnector = new RDWarRoomConnector();
