import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Simple in-memory cache (resets on server restart)
let cache: { data: any; generatedAt: number; dataHash: string } | null = null;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

function hashData(obj: any): string {
  return JSON.stringify(obj).length.toString() + '_' + JSON.stringify(obj).slice(0, 50);
}

export async function GET(request: NextRequest) {
  try {
    const rawDb = (getDb() as any).$client;
    const now = Date.now();
    const yesterday = now - 24 * 60 * 60 * 1000;
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

    // Gather context data
    const overdueFollowups: number = rawDb.prepare(
      "SELECT COUNT(*) as c FROM followups WHERE status = 'À faire' AND scheduled_at < ?"
    ).get(now).c;

    const overdueInvoices: number = rawDb.prepare(
      "SELECT COUNT(*) as c FROM invoices WHERE status IN ('Envoyée', 'En retard') AND due_date < ?"
    ).get(now).c;

    const leadsRelanceNeeded: any[] = rawDb.prepare(`
      SELECT name, company, proposition_sent_at FROM leads
      WHERE status = 'Proposition envoyée' AND proposition_sent_at IS NOT NULL AND (? - proposition_sent_at) > 259200000
      ORDER BY proposition_sent_at ASC LIMIT 3
    `).all(now);

    const todayDeadlines: any[] = rawDb.prepare(`
      SELECT client_name, deadline FROM projects
      WHERE status = 'Actif' AND deadline BETWEEN ? AND ?
      LIMIT 3
    `).all(now, now + 24 * 60 * 60 * 1000);

    const recentLeads: number = rawDb.prepare(
      "SELECT COUNT(*) as c FROM leads WHERE created_at > ?"
    ).get(yesterday).c;

    const pendingContent: number = rawDb.prepare(
      "SELECT COUNT(*) as c FROM content_items WHERE status = 'Planifié' AND scheduled_at < ?"
    ).get(now).c;

    const contextData = { overdueFollowups, overdueInvoices, leadsRelanceNeeded, todayDeadlines, recentLeads, pendingContent };
    const dataHash = hashData(contextData);

    // Check cache
    if (cache && (now - cache.generatedAt) < CACHE_TTL && cache.dataHash === dataHash) {
      return NextResponse.json({ success: true, data: cache.data, cached: true });
    }

    // Generate briefing
    let briefing: any;

    if (ANTHROPIC_API_KEY) {
      const prompt = `Tu es l'assistant IA d'une agence digitale. Génère un morning briefing concis et actionnable en français.

**Données du moment :**
- Nouveaux leads hier : ${recentLeads}
- Follow-ups en retard : ${overdueFollowups}
- Factures en retard : ${overdueInvoices}
- Leads à relancer (proposition > 3j sans réponse) : ${leadsRelanceNeeded.map(l => `${l.name}${l.company ? ` (${l.company})` : ''}`).join(', ') || 'aucun'}
- Deadlines projets aujourd'hui : ${todayDeadlines.map(p => p.client_name).join(', ') || 'aucune'}
- Contenus planifiés non publiés : ${pendingContent}

Retourne un JSON avec cette structure exacte :
{
  "greeting": "Message de bienvenue court (1 phrase)",
  "summary": "Résumé de la situation (2-3 phrases)",
  "urgent": ["action urgente 1", "action urgente 2"],
  "recommended": ["recommandation 1", "recommandation 2", "recommandation 3"],
  "today": ["tâche aujourd'hui 1", "tâche aujourd'hui 2"]
}

Retourne UNIQUEMENT le JSON, sans markdown ni commentaires.`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const raw = data.content?.[0]?.text ?? '{}';
        try {
          briefing = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
        } catch (_) {
          briefing = { greeting: raw, summary: '', urgent: [], recommended: [], today: [] };
        }
      }
    }

    // Fallback: rule-based briefing
    if (!briefing) {
      const urgent: string[] = [];
      const recommended: string[] = [];
      const today: string[] = [];

      if (overdueInvoices > 0) urgent.push(`${overdueInvoices} facture(s) en retard à relancer`);
      if (overdueFollowups > 0) urgent.push(`${overdueFollowups} follow-up(s) overdue`);
      if (leadsRelanceNeeded.length > 0) {
        recommended.push(...leadsRelanceNeeded.map(l => `Relancer ${l.name}${l.company ? ` (${l.company})` : ''} — proposition envoyée il y a ${Math.floor((now - l.proposition_sent_at) / 86400000)}j`));
      }
      if (pendingContent > 0) recommended.push(`Publier ${pendingContent} contenu(s) planifié(s) en attente`);
      if (todayDeadlines.length > 0) today.push(...todayDeadlines.map(p => `Deadline projet ${p.client_name} aujourd'hui`));

      briefing = {
        greeting: `Bonjour ! Voici votre briefing du ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}.`,
        summary: `${recentLeads} nouveau(x) lead(s) hier. ${overdueFollowups + overdueInvoices} action(s) requise(s) en urgence.`,
        urgent,
        recommended,
        today,
      };
    }

    const result = { ...briefing, generatedAt: now, stats: contextData };
    cache = { data: result, generatedAt: now, dataHash };

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
