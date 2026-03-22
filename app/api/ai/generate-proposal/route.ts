import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';

function generateFallbackProposal(name: string, company: string, budget: string, timeline: string, projectType: string): string {
  return `## Proposition commerciale — ${company || name}

### 1. Compréhension de votre besoin
Nous avons bien pris connaissance de votre projet de **${projectType || 'transformation digitale'}** et comprenons l'importance de livrer un résultat à la hauteur de vos ambitions.

### 2. Notre approche
AltCtrl.Lab propose une méthodologie agile en 4 phases :
1. **Discovery** (1 semaine) — Audit, ateliers de cadrage, définition du périmètre
2. **Design** (2 semaines) — UX research, wireframes, maquettes haute fidélité
3. **Build** (${timeline || '4-6 semaines'}) — Développement itératif avec démos hebdomadaires
4. **Launch** (1 semaine) — Tests, déploiement, formation

### 3. Livrables
- Cahier des charges fonctionnel et technique
- Maquettes validées (Figma)
- Application web/mobile responsive
- Documentation technique et guide utilisateur
- Formation équipe (2h)

### 4. Timeline
Démarrage sous 2 semaines après signature. Livraison estimée : ${timeline || '8-10 semaines'}.

### 5. Investissement
${budget ? `Budget indicatif : **${budget}**` : 'Sur devis personnalisé après phase Discovery.'}
ROI estimé : gain de productivité de 20-30% sur les process ciblés.

### 6. Prochaines étapes
1. Call de 30 minutes pour affiner le besoin
2. Proposition détaillée sous 48h
3. Démarrage rapide après validation

*— L'équipe AltCtrl.Lab*`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, name, company, budget, timeline, notes, projectType } = body;

    if (!name) return NextResponse.json({ success: false, error: 'name requis' }, { status: 400 });

    // Fallback if API key missing
    if (!KIMI_API_KEY) {
      logger.warn('generate-proposal', 'KIMI_API_KEY missing, using fallback template', { leadId });
      const proposal = generateFallbackProposal(name, company, budget, timeline, projectType);
      return NextResponse.json({ success: true, data: { proposal, leadId, fromTemplate: true } });
    }

    const prompt = `Tu es un expert en proposition commerciale pour une agence digitale.
Génère une proposition commerciale professionnelle et convaincante en français pour le prospect suivant.

**Prospect :**
- Nom : ${name}
- Entreprise : ${company || 'Non précisé'}
- Budget estimé : ${budget || 'Non précisé'}
- Timeline : ${timeline || 'Non précisé'}
- Type de projet : ${projectType || 'Développement web / Marketing Digital'}
- Notes / Contexte : ${notes || 'Aucun contexte supplémentaire'}

**Format de la proposition :**

## Proposition commerciale — ${company || name}

### 1. Compréhension de votre besoin
[2-3 phrases montrant que tu as compris leur problématique]

### 2. Notre approche
[Description de la méthodologie et des étapes clés]

### 3. Livrables
[Liste bullet des livrables concrets]

### 4. Timeline
[Calendrier réaliste basé sur les informations fournies]

### 5. Investissement
[Fourchette de prix justifiée, ROI estimé]

### 6. Prochaines étapes
[Call to action clair]

Sois concis, direct et orienté résultats. Évite le jargon inutile.`;

    try {
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
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        throw new Error(`Kimi API ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      const proposal = data.choices?.[0]?.message?.content ?? '';

      if (!proposal) throw new Error('Empty response from Kimi');

      return NextResponse.json({ success: true, data: { proposal, leadId, fromTemplate: false } });
    } catch (apiErr) {
      // Fallback on API failure
      logger.error('generate-proposal', 'Kimi API failed, using fallback template', { leadId }, apiErr as Error);
      const proposal = generateFallbackProposal(name, company, budget, timeline, projectType);
      return NextResponse.json({ success: true, data: { proposal, leadId, fromTemplate: true } });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
