export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, createConversation, addChatMessage, getConversationMessages, getRecentConversations, updateConversationTitle } from '@/lib/db';
import { validateBody, chatMessageSchema, checkRateLimit } from '@/lib/validation';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import { logger } from '@/lib/logger';

/** Gather cockpit context for prompt enrichment. */
function getCockpitContext(): string {
  try {
    const rawDb = (getDb() as any).$client;
    const now = Date.now();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const activeLeads: number = rawDb.prepare(
      "SELECT COUNT(*) as c FROM leads WHERE status NOT IN ('Gagné', 'Perdu', 'Archivé')"
    ).get().c;

    const activeProjects: number = rawDb.prepare(
      "SELECT COUNT(*) as c FROM projects WHERE status = 'Actif'"
    ).get().c;

    const pendingInvoices: number = rawDb.prepare(
      "SELECT COUNT(*) as c FROM invoices WHERE status IN ('Envoyée', 'En retard')"
    ).get().c;

    const monthRevenue = rawDb.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE status = 'Payée' AND paid_at >= ?"
    ).get(monthStart.getTime()) as { total: number };

    const overdueFollowups: number = rawDb.prepare(
      "SELECT COUNT(*) as c FROM followups WHERE status = 'À faire' AND scheduled_at < ?"
    ).get(now).c;

    return [
      `## Contexte actuel de l'agence`,
      `- Revenue ce mois : ${Math.round(monthRevenue.total)}€`,
      `- Leads actifs : ${activeLeads}`,
      `- Projets en cours : ${activeProjects}`,
      `- Factures en attente : ${pendingInvoices}`,
      `- Follow-ups en retard : ${overdueFollowups}`,
    ].join('\n');
  } catch (err) {
    logger.warn('chat', 'Failed to gather cockpit context', { error: String(err) });
    return '## Contexte actuel de l\'agence\n(données indisponibles)';
  }
}

/** Build the enriched prompt for AbdulHakim. */
function buildPrompt(userMessage: string, history: Array<{ role: string; content: string }>): string {
  const context = getCockpitContext();

  const historyBlock = history.length > 0
    ? `## Historique de conversation\n${history.map(m => `${m.role === 'user' ? 'Utilisateur' : 'AbdulHakim'}: ${m.content.slice(0, 500)}`).join('\n\n')}`
    : '';

  return [
    `Tu es AbdulHakim, CEO et superviseur d'AltCtrl.Lab, une agence digitale premium basée à Paris.`,
    `Tu réponds de manière concise, structurée, et actionnable.`,
    `Utilise des sections avec des titres markdown (## et ###) et des icônes emoji pour organiser ta réponse.`,
    `Utilise des listes à puces pour les données chiffrées.`,
    `Sois direct, pas de blabla. Donne des chiffres quand c'est pertinent.`,
    `Réponds en français.`,
    ``,
    context,
    ``,
    historyBlock,
    ``,
    `## Question`,
    userMessage,
  ].filter(Boolean).join('\n');
}

// ─── POST — Send a message ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rateCheck = checkRateLimit('chat', 'default');
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { success: false, error: 'Trop de requêtes. Réessayez dans quelques secondes.' },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter ?? 10) } },
    );
  }

  try {
    const body = await request.json();
    const validation = validateBody(body, chatMessageSchema);
    if (!validation.success) return validation.response;

    const { message, conversationId: existingConvId } = validation.data;

    // Create or fetch conversation
    let conversationId = existingConvId;
    if (!conversationId) {
      const conv = createConversation(message.slice(0, 60));
      conversationId = conv.id;
    }

    // Store user message
    addChatMessage(conversationId, 'user', message);

    // Get conversation history (last 10 messages for context)
    const history = getConversationMessages(conversationId, 20);
    const recentHistory = history.slice(-10);

    // Build enriched prompt
    const enrichedPrompt = buildPrompt(message, recentHistory);

    // Execute via OpenClaw
    logger.info('chat', 'Sending message to AbdulHakim', { conversationId, messageLength: message.length });
    const result = await executeOpenClawAgent('abdulhakim', enrichedPrompt, 120_000);

    let assistantContent: string;
    if (result.success && result.stdout.trim()) {
      assistantContent = result.stdout.trim();
    } else {
      assistantContent = result.stderr
        ? `Je rencontre un problème technique. Erreur : ${result.stderr.slice(0, 200)}`
        : 'Je suis temporairement indisponible. Veuillez réessayer dans quelques instants.';
      logger.error('chat', 'AbdulHakim execution failed', { stderr: result.stderr?.slice(0, 500) });
    }

    // Store assistant response
    const assistantMsg = addChatMessage(conversationId, 'assistant', assistantContent);

    // Auto-title on first exchange if no title
    if (history.length <= 1) {
      const autoTitle = message.slice(0, 60) + (message.length > 60 ? '...' : '');
      updateConversationTitle(conversationId, autoTitle);
    }

    return NextResponse.json({
      success: true,
      data: {
        conversationId,
        message: assistantMsg,
      },
    });
  } catch (err) {
    logger.error('chat', 'Chat API error', { error: String(err) });
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur.' },
      { status: 500 },
    );
  }
}

// ─── GET — Fetch conversation history ────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      const messages = getConversationMessages(conversationId);
      return NextResponse.json({ success: true, data: { messages } });
    }

    // Return recent conversations list
    const conversations = getRecentConversations(20);
    return NextResponse.json({ success: true, data: { conversations } });
  } catch (err) {
    logger.error('chat', 'Chat GET error', { error: String(err) });
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur.' },
      { status: 500 },
    );
  }
}
