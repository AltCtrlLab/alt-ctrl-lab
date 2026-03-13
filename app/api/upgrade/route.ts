export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { proposals } from '@/lib/db/schema_proposals';
import { updateTaskStatus, createTask } from '@/lib/db';
import { eq } from 'drizzle-orm';

/**
 * POST /api/upgrade
 * 
 * Route pour déclencher l'implémentation d'une proposition validée par le CEO.
 * La proposition est envoyée au Superviseur (AbdulHakim) qui délègue aux Directeurs.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proposalId, ceoValidation = true } = body;
    
    if (!proposalId) {
      return NextResponse.json({
        success: false,
        error: 'proposalId required'
      }, { status: 400 });
    }
    
    const db = getDb();
    
    // Récupérer la proposition
    const proposalResult = await db.select()
      .from(proposals)
      .where(eq(proposals.id, proposalId))
      .limit(1);
    
    if (proposalResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Proposal not found'
      }, { status: 404 });
    }
    
    const proposal = proposalResult[0];
    
    if (proposal.status !== 'PENDING') {
      return NextResponse.json({
        success: false,
        error: `Proposal already ${proposal.status}`
      }, { status: 400 });
    }
    
    // Générer l'ID de tâche pour l'implémentation
    const implementationTaskId = `upgrade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Construire le prompt pour le Superviseur
    const supervisorPrompt = `[SYSTEM_UPGRADE] - VALIDÉE PAR LE CEO

Ceci est une proposition d'amélioration système VALIDÉE par le CEO et qui doit être implémentée immédiatement dans notre infrastructure Alt Ctrl Lab.

=== CONTEXTE ===
Proposition ID: ${proposalId}
Découverte par: ${proposal.discoveredBy}
Élevée par: ${proposal.elevatedBy}
Source: ${proposal.sourceUrl}

=== IDÉE ORIGINALE (WEB) ===
${proposal.originalConcept}

=== INNOVATION ALT CTRL LAB (ÉLEVÉE) ===
${proposal.altCtrlMutation}

=== ARCHITECTURE TECHNIQUE PROPOSÉE ===
${proposal.technicalArchitecture || 'À définir par les Directeurs'}

=== IMPACT ANALYSÉ ===
${proposal.impactAnalysis || 'À évaluer'}

=== TA MISSION EN TANT QUE SUPERVISEUR ===
Tu es AbdulHakim, le CEO/Superviseur de Alt Ctrl Lab.

Cette [SYSTEM_UPGRADE] a été VALIDÉE par le CEO. Ton rôle est de DÉPLOYER cette nouvelle mécanique dans notre agence.

1. Analyse la proposition en profondeur
2. Identifie quels Directeurs sont concernés:
   - Matin (Lead Dev) → pour les aspects code/architecture
   - Hasib (Data Architect) → pour les aspects data/automation
   - Musawwir (DA) → pour les aspects UX/design
   - Fatah (CGO) → pour les aspects growth/marketing
3. Découpe le travail en sous-tâches assignées aux bons Directeurs
4. Chaque Directeur délèguera à son Exécutant respectif

Ne pose pas de questions. Agis. Implémente. Livre.

OUTPUT ATTENDU:
Un plan d'implémentation détaillé avec les tâches assignées à chaque Directeur.`;

    // Créer la tâche pour le superviseur
    await createTask({
      id: implementationTaskId,
      agentName: 'abdulhakim',
      prompt: supervisorPrompt,
    });
    
    // Lancer l'exécution hiérarchique (fire-and-forget)
    const { executeHierarchicalTask } = await import('@/lib/worker');
    
    void executeHierarchicalTask(
      implementationTaskId,
      'abdulhakim',  // CEO/Superviseur
      'banna',       // Exécutant Dev par défaut (sera redispatché)
      supervisorPrompt,
      'full_agency',
      900000 // 15 min
    );
    
    // Mettre à jour le statut de la proposition
    await db.update(proposals)
      .set({
        status: 'APPROVED',
        decidedAt: new Date(),
        decisionBy: 'CEO',
        implementationTaskId,
      })
      .where(eq(proposals.id, proposalId));
    
    return NextResponse.json({
      success: true,
      data: {
        proposalId,
        implementationTaskId,
        message: 'System upgrade initiated and dispatched to Superviseur AbdulHakim',
        eta: '15 minutes',
      }
    });
    
  } catch (error) {
    console.error('[API] Error initiating upgrade:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate upgrade'
    }, { status: 500 });
  }
}
