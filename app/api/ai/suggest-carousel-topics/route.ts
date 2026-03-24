export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { suggestTopicsInputSchema, topicSuggestionSchema } from '@/lib/ai/carousel-types';
import { PILLAR_LABELS } from '@/lib/ai/carousel-types';
import type { CarouselPillar } from '@/lib/ai/carousel-types';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';

/* ── Fallback topics per pillar × language ────────────────────────── */

const FALLBACK_TOPICS: Record<CarouselPillar, Record<'en' | 'fr', string[]>> = {
  branding_psychology: {
    fr: [
      "L'effet Bouba-Kiki : pourquoi la forme de votre logo change tout",
      "5 biais cognitifs que les grandes marques exploitent (et vous non)",
      "La psychologie des couleurs : ce que votre palette révèle sur vous",
      "Pourquoi les marques premium utilisent le silence visuel",
      "Le paradoxe du choix : simplifier votre offre pour vendre plus",
    ],
    en: [
      "The Bouba-Kiki Effect: Why Your Logo Shape Changes Everything",
      "5 Cognitive Biases Top Brands Exploit (And You Don't)",
      "Color Psychology: What Your Palette Reveals About Your Brand",
      "Why Premium Brands Use Visual Silence",
      "The Paradox of Choice: Simplify Your Offer to Sell More",
    ],
  },
  performance_growth: {
    fr: [
      "Pourquoi 90% des landing pages sous-performent (et comment fixer ça)",
      "Le framework AARRR : 5 métriques qui changent tout",
      "SEO vs Paid Ads : où investir votre premier euro",
      "Comment tripler votre taux de conversion en 30 jours",
      "Les 3 erreurs de tracking qui faussent vos données",
    ],
    en: [
      "Why 90% of Landing Pages Underperform (And How to Fix It)",
      "The AARRR Framework: 5 Metrics That Change Everything",
      "SEO vs Paid Ads: Where to Invest Your First Dollar",
      "How to Triple Your Conversion Rate in 30 Days",
      "3 Tracking Mistakes That Corrupt Your Data",
    ],
  },
  branding_identity: {
    fr: [
      "Comment créer une identité visuelle mémorable en 2025",
      "Les 7 archétypes de marque : lequel êtes-vous ?",
      "Typographie et personnalité de marque : le guide complet",
      "Rebranding : les signaux qui indiquent qu'il est temps de changer",
      "Mini vs maxi-branding : quelle stratégie pour votre budget",
    ],
    en: [
      "How to Create a Memorable Visual Identity in 2025",
      "The 7 Brand Archetypes: Which One Are You?",
      "Typography and Brand Personality: The Complete Guide",
      "Rebranding: Signs It's Time for a Change",
      "Mini vs Maxi Branding: Which Strategy for Your Budget",
    ],
  },
  tech_innovation: {
    fr: [
      "IA générative pour les marques : opportunité ou menace ?",
      "No-code vs code : le vrai comparatif pour votre business",
      "Web3, blockchain, tokens : ce qui compte vraiment en 2025",
      "Automatiser 80% de votre marketing avec l'IA",
      "Les 5 outils tech qui vont transformer votre agence",
    ],
    en: [
      "Generative AI for Brands: Opportunity or Threat?",
      "No-Code vs Code: The Real Comparison for Your Business",
      "Web3, Blockchain, Tokens: What Really Matters in 2025",
      "Automate 80% of Your Marketing with AI",
      "5 Tech Tools That Will Transform Your Agency",
    ],
  },
  behind_the_lab: {
    fr: [
      "Comment on a construit notre stack IA interne en 3 mois",
      "Les coulisses d'un projet client à 50K€",
      "Notre workflow créatif : du brief à la livraison en 5 étapes",
      "Les erreurs qu'on a faites (pour que vous les évitiez)",
      "Pourquoi on a choisi Next.js + Tailwind pour tous nos projets",
    ],
    en: [
      "How We Built Our Internal AI Stack in 3 Months",
      "Behind a 50K€ Client Project: The Full Breakdown",
      "Our Creative Workflow: From Brief to Delivery in 5 Steps",
      "Mistakes We Made (So You Don't Have To)",
      "Why We Chose Next.js + Tailwind for Every Project",
    ],
  },
};

/* ── POST Handler ──────────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = suggestTopicsInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const { pillar, language } = parsed.data;

    if (!KIMI_API_KEY) {
      logger.warn('suggest-carousel-topics', 'KIMI_API_KEY missing, using fallback', { pillar });
      return NextResponse.json({
        success: true,
        data: { topics: FALLBACK_TOPICS[pillar][language], fromFallback: true },
      });
    }

    try {
      const pillarLabel = PILLAR_LABELS[pillar]?.[language] ?? pillar;
      const lang = language === 'fr' ? 'français' : 'English';

      const prompt = `You are the Chief Marketing Officer of AltCtrl.Lab, a premium digital agency.

Suggest exactly 5 Instagram carousel topic ideas for the content pillar "${pillarLabel}".

Requirements:
- Language: ${lang}
- Each topic must be specific, curiosity-driven, and educational
- Topics should work as carousel titles (8-12 slides per carousel)
- Target audience: startups, PMEs, and marketing professionals
- Style: bold, assertive, data-informed — like a top-tier marketing educator
- Include at least 1 topic with a number/stat hook (e.g., "5 reasons...", "90% of...")
- Include at least 1 topic with a contrarian angle (e.g., "Why X is wrong...")

Return ONLY a valid JSON object (no markdown, no comments):
{"topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"]}`;

      const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KIMI_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'kimi-k2.5',
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) throw new Error(`Kimi API ${res.status}`);

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content ?? '{}';
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(cleaned);

      const validated = topicSuggestionSchema.safeParse(result);
      if (!validated.success) {
        logger.warn('suggest-carousel-topics', 'Kimi response failed validation, using fallback', { errors: validated.error.issues });
        return NextResponse.json({
          success: true,
          data: { topics: FALLBACK_TOPICS[pillar][language], fromFallback: true },
        });
      }

      return NextResponse.json({
        success: true,
        data: { topics: validated.data.topics, fromFallback: false },
      });
    } catch (apiErr) {
      logger.error('suggest-carousel-topics', 'Kimi API failed, using fallback', { pillar }, apiErr as Error);
      return NextResponse.json({
        success: true,
        data: { topics: FALLBACK_TOPICS[pillar][language], fromFallback: true },
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
