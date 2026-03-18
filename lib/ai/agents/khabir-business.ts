/**
 * KHABIR BUSINESS — Intelligence Métier
 *
 * Agent dédié à la business intelligence interne :
 * - Meilleures pratiques Instagram DM / acquisition
 * - Analyse des tunnels de conversion
 * - Playbooks actionnables pour viser le top 1%
 *
 * Utilise executeOpenClawAgent pour faire des recherches web approfondies
 * et synthétiser des recommandations actionnables.
 */

import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import { getDb } from '@/lib/db';
import { randomUUID } from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BusinessInsight {
  id: string;
  topic: string;
  source?: string;
  insight: string;
  recommendation: string;
  priority: number;
  applied: number;
  createdAt: number;
}

export interface ScoutResult {
  success: boolean;
  topic: string;
  insights: BusinessInsight[];
  error?: string;
}

// ─── Topics disponibles ──────────────────────────────────────────────────────

const TOPIC_PROMPTS: Record<string, string> = {
  'instagram-acquisition': `
Tu es un expert en acquisition client via Instagram DM pour les agences web/digitales.

Recherche et synthétise les MEILLEURES PRATIQUES actuelles (2024-2025) pour :
1. La stratégie de DM cold outreach Instagram qui convertit le mieux (taux de réponse réel)
2. Le copywriting DM optimal pour les agences web ciblant les PME locales
3. Les patterns de filtrage profil les plus efficaces (quels signaux indiquent un prospect chaud ?)
4. Le timing et la fréquence d'envoi optimaux
5. Les séquences de follow-up qui fonctionnent (sans paraître spam)

Pour chaque pratique identifiée, donne :
- Une insight claire et factuelle
- Une recommandation actionnable pour AltCtrl.Lab (agence web, cible restaurants/salons/boutiques locales)
- Un score de priorité de 1 à 10

Réponds avec un JSON array :
[{"insight":"...","recommendation":"...","priority":8,"source":"Reddit r/entrepreneur"},...]

Maximum 5 insights. Réponds UNIQUEMENT avec le JSON.
`,
  'dm-copywriting': `
Tu es un expert en copywriting de messages directs Instagram pour des agences web.

Analyse les DM qui obtiennent les meilleurs taux de réponse pour prospecter des PME locales.
Recherche les patterns communs des DMs qui convertissent vs ceux qui sont ignorés.

Identifie les 5 éléments clés d'un DM Instagram parfait pour une agence web en 2024-2025 :
- Longueur optimale (nombre de mots/caractères)
- Structure (accroche / valeur / question / CTA)
- Ton (formel, informel, direct, storytelling...)
- Ce qu'il faut absolument éviter
- L'élément de personnalisation qui fait la différence

Pour chaque insight, fournis une recommandation concrète applicable au DM type AltCtrl.Lab.

Réponds avec un JSON array :
[{"insight":"...","recommendation":"...","priority":8,"source":"..."},...]

Maximum 5 insights. Réponds UNIQUEMENT avec le JSON.
`,
  'conversion-funnel': `
Tu es un expert en tunnels de conversion pour agences web/digitales.

Analyse les tunnels d'acquisition les plus performants pour convertir un prospect Instagram en client signé.
Recherche les benchmarks réels : taux de réponse DM → appel découverte → proposition → signature.

Identifie :
1. Les étapes qui freinent le plus la conversion dans un tunnel Instagram → lead → client
2. Les séquences de nurturing les plus efficaces après un premier DM
3. L'offre "lead magnet" ou première proposition qui déclenche le passage à l'acte
4. Comment qualifier rapidement les prospects pour ne pas perdre de temps
5. Les KPIs clés à surveiller pour optimiser le tunnel

Réponds avec un JSON array :
[{"insight":"...","recommendation":"...","priority":8,"source":"..."},...]

Maximum 5 insights. Réponds UNIQUEMENT avec le JSON.
`,
  'internal-analysis': `
Tu es un consultant en optimisation des opérations pour une agence web.

Analyse les meilleures pratiques de fonctionnement interne pour une agence web/digitale souhaitant scaler de 0 à top 1% :
1. Playbooks de prospection reproductibles (comment documenter et systématiser)
2. Automatisation des tâches répétitives (qualification leads, follow-ups, reporting)
3. Structure optimale des workflows n8n pour une agence
4. Comment passer de 5 à 20+ clients avec la même équipe
5. Les outils et systèmes utilisés par les meilleures agences digitales

Pour chaque insight, donne une recommandation concrète et actionnable.

Réponds avec un JSON array :
[{"insight":"...","recommendation":"...","priority":8,"source":"..."},...]

Maximum 5 insights. Réponds UNIQUEMENT avec le JSON.
`,
};

// ─── Fonctions principales ───────────────────────────────────────────────────

async function saveInsights(topic: string, insights: BusinessInsight[]): Promise<void> {
  const rawDb = (getDb() as any).$client;
  const now = Date.now();
  for (const ins of insights) {
    rawDb.prepare(`
      INSERT INTO business_insights (id, topic, source, insight, recommendation, priority, applied, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(ins.id, topic, ins.source || null, ins.insight, ins.recommendation, ins.priority, now);
  }
}

export async function scoutBusinessIntelligence(
  topic: string,
  limit = 5,
): Promise<ScoutResult> {
  const prompt = TOPIC_PROMPTS[topic];
  if (!prompt) {
    return { success: false, topic, insights: [], error: `Topic inconnu: ${topic}` };
  }

  const result = await executeOpenClawAgent('main', prompt.trim(), 90000);

  if (!result.success || !result.stdout?.trim()) {
    return { success: false, topic, insights: [], error: result.stderr || 'Agent indisponible' };
  }

  let raw: Array<{ insight: string; recommendation: string; priority?: number; source?: string }> = [];
  try {
    const jsonMatch = result.stdout.match(/\[[\s\S]*\]/);
    if (jsonMatch) raw = JSON.parse(jsonMatch[0]);
  } catch {
    return { success: false, topic, insights: [], error: 'Réponse non parseable' };
  }

  const now = Date.now();
  const insights: BusinessInsight[] = raw.slice(0, limit).map(item => ({
    id: randomUUID(),
    topic,
    source: item.source,
    insight: item.insight || '',
    recommendation: item.recommendation || '',
    priority: Math.min(10, Math.max(1, item.priority ?? 5)),
    applied: 0,
    createdAt: now,
  }));

  await saveInsights(topic, insights);
  return { success: true, topic, insights };
}

export function getInsightsByTopic(topic?: string): BusinessInsight[] {
  const rawDb = (getDb() as any).$client;
  if (topic) {
    return rawDb.prepare(
      `SELECT id, topic, source, insight, recommendation, priority, applied, created_at as createdAt
       FROM business_insights WHERE topic = ? ORDER BY priority DESC, created_at DESC LIMIT 50`
    ).all(topic) as BusinessInsight[];
  }
  return rawDb.prepare(
    `SELECT id, topic, source, insight, recommendation, priority, applied, created_at as createdAt
     FROM business_insights ORDER BY priority DESC, created_at DESC LIMIT 50`
  ).all() as BusinessInsight[];
}

export function markInsightApplied(id: string): void {
  const rawDb = (getDb() as any).$client;
  rawDb.prepare(`UPDATE business_insights SET applied = 1 WHERE id = ?`).run(id);
}

export const AVAILABLE_TOPICS = Object.keys(TOPIC_PROMPTS);
