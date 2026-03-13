import { NextRequest, NextResponse } from 'next/server';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, name, company, budget, timeline, notes, projectType } = body;

    if (!name) return NextResponse.json({ success: false, error: 'name requis' }, { status: 400 });
    if (!KIMI_API_KEY) return NextResponse.json({ success: false, error: 'KIMI_API_KEY non configuré' }, { status: 503 });

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

    const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIMI_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: `Kimi API error: ${err}` }, { status: 500 });
    }

    const data = await res.json();
    const proposal = data.choices?.[0]?.message?.content ?? '';

    return NextResponse.json({ success: true, data: { proposal, leadId } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
