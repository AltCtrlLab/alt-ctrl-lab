export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

/**
 * AI Pricing Optimizer
 *
 * POST /api/ai/pricing-optimizer
 * Body: { projectType, scope, clientBudget?, complexity?, urgency? }
 *
 * Analyzes historical project data + market context to recommend optimal pricing.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectType, scope, clientBudget, complexity, urgency } = body as {
      projectType: string;
      scope: string;
      clientBudget?: string;
      complexity?: 'simple' | 'medium' | 'complex';
      urgency?: 'normal' | 'urgent' | 'rush';
    };

    if (!projectType || !scope) {
      return NextResponse.json({ error: 'Missing projectType or scope' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;

    // Gather historical data
    const similarProjects = rawDb.prepare(`
      SELECT client_name, project_type, budget, hours_estimated, phase, status
      FROM projects
      WHERE project_type LIKE ?
      ORDER BY created_at DESC LIMIT 10
    `).all(`%${projectType}%`) as Array<{ client_name: string; project_type: string; budget: number; hours_estimated: number; phase: string; status: string }>;

    const avgBudget = similarProjects.length > 0
      ? Math.round(similarProjects.reduce((s, p) => s + (p.budget || 0), 0) / similarProjects.length)
      : 0;

    const avgHours = similarProjects.length > 0
      ? Math.round(similarProjects.reduce((s, p) => s + (p.hours_estimated || 0), 0) / similarProjects.length)
      : 0;

    // Win rate by price bracket
    const allProjects = rawDb.prepare(`
      SELECT budget, status FROM projects WHERE budget > 0
    `).all() as Array<{ budget: number; status: string }>;

    const brackets = [
      { label: '< 2000€', min: 0, max: 2000, won: 0, total: 0 },
      { label: '2000-5000€', min: 2000, max: 5000, won: 0, total: 0 },
      { label: '5000-10000€', min: 5000, max: 10000, won: 0, total: 0 },
      { label: '10000-20000€', min: 10000, max: 20000, won: 0, total: 0 },
      { label: '> 20000€', min: 20000, max: Infinity, won: 0, total: 0 },
    ];

    for (const p of allProjects) {
      const bracket = brackets.find(b => p.budget >= b.min && p.budget < b.max);
      if (bracket) {
        bracket.total++;
        if (!['Annulé', 'Perdu'].includes(p.status)) bracket.won++;
      }
    }

    // Multipliers
    const complexityMultiplier = { simple: 0.8, medium: 1.0, complex: 1.5 }[complexity || 'medium'] || 1.0;
    const urgencyMultiplier = { normal: 1.0, urgent: 1.3, rush: 1.6 }[urgency || 'normal'] || 1.0;

    // Active projects count (capacity factor)
    const activeProjects = (rawDb.prepare("SELECT COUNT(*) as c FROM projects WHERE status NOT IN ('Archivé', 'Annulé', 'Livré')").get() as { c: number }).c;
    const capacityMultiplier = activeProjects > 5 ? 1.15 : activeProjects > 3 ? 1.05 : 1.0;

    // Base calculation
    const basePrice = avgBudget > 0 ? avgBudget : 3000;
    const algorithmicPrice = Math.round(basePrice * complexityMultiplier * urgencyMultiplier * capacityMultiplier);

    // AI recommendation
    let aiRecommendation: AIPricingResult | null = null;

    if (KIMI_API_KEY) {
      try {
        const prompt = `Tu es un expert en tarification d'agence digitale premium (Paris). Recommande un prix optimal.

PROJET DEMANDE :
- Type : ${projectType}
- Scope : ${scope}
- Complexite : ${complexity || 'medium'}
- Urgence : ${urgency || 'normal'}
${clientBudget ? `- Budget client annonce : ${clientBudget}` : ''}

DONNEES HISTORIQUES :
- ${similarProjects.length} projets similaires, budget moyen : ${avgBudget}EUR, heures moyennes : ${avgHours}h
- Projets actifs en cours : ${activeProjects}
- Brackets win rate : ${brackets.map(b => `${b.label}: ${b.total > 0 ? Math.round(b.won / b.total * 100) : 0}%`).join(', ')}

Reponds en JSON uniquement :
{
  "recommendedPrice": nombre,
  "priceRange": { "min": nombre, "max": nombre },
  "hourlyRate": nombre,
  "estimatedHours": nombre,
  "confidence": "high"|"medium"|"low",
  "reasoning": "2-3 phrases expliquant le prix",
  "negotiationTips": ["conseil 1", "conseil 2"]
}`;

        const res = await fetch(KIMI_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
          body: JSON.stringify({ model: 'kimi-k2.5', messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 800 }),
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.choices?.[0]?.message?.content || '';
          const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          aiRecommendation = JSON.parse(cleaned);
        }
      } catch { /* fallback */ }
    }

    return NextResponse.json({
      success: true,
      data: {
        algorithmic: {
          recommendedPrice: algorithmicPrice,
          basePrice,
          multipliers: { complexity: complexityMultiplier, urgency: urgencyMultiplier, capacity: capacityMultiplier },
        },
        ai: aiRecommendation,
        historical: {
          similarProjects: similarProjects.length,
          avgBudget,
          avgHours,
          winRateBrackets: brackets.filter(b => b.total > 0).map(b => ({
            ...b,
            winRate: Math.round(b.won / b.total * 100),
          })),
        },
        context: { activeProjects, complexity, urgency },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('pricing', 'Optimizer failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

interface AIPricingResult {
  recommendedPrice: number;
  priceRange: { min: number; max: number };
  hourlyRate: number;
  estimatedHours: number;
  confidence: string;
  reasoning: string;
  negotiationTips: string[];
}
