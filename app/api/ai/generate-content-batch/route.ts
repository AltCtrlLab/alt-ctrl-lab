export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createContentItem } from '@/lib/db';
import { logger } from '@/lib/logger';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';

interface ContentPost {
  title: string;
  platform: string;
  hook: string;
  body: string;
  cta: string;
  tags: string[];
}

function generateFallbackPosts(theme: string, count: number, platforms: string[]): ContentPost[] {
  const templates: ContentPost[] = [
    {
      title: `Pourquoi ${theme} change la donne en 2026`,
      platform: platforms[0] || 'LinkedIn',
      hook: `Le marché de ${theme} évolue plus vite que jamais. Voici ce que les leaders font différemment.`,
      body: `Le secteur de ${theme} connaît une transformation majeure. Les entreprises qui adoptent les nouvelles approches voient leurs résultats multiplés par 3. Chez AltCtrl.Lab, nous accompagnons nos clients dans cette transition avec une méthodologie éprouvée.\n\nLes 3 tendances clés :\n1. L'automatisation intelligente\n2. La personnalisation à grande échelle\n3. L'approche data-driven\n\nLe résultat ? Des workflows 40% plus efficaces et un ROI mesurable dès le premier mois.`,
      cta: 'Vous voulez explorer ces opportunités ? Réservez un call découverte (lien en bio).',
      tags: [theme, 'transformation', 'innovation'],
    },
    {
      title: `3 erreurs à éviter dans ${theme}`,
      platform: platforms[0] || 'LinkedIn',
      hook: `90% des entreprises font ces erreurs dans ${theme}. La 3ème vous coûte probablement des milliers d'euros.`,
      body: `Erreur #1 : Copier la concurrence sans adapter à son contexte\nErreur #2 : Négliger la mesure des résultats\nErreur #3 : Sous-investir dans la qualité du contenu\n\nLa bonne approche : définir ses objectifs, mesurer chaque action, itérer rapidement.\n\nNos clients qui appliquent cette méthode voient en moyenne +45% de performance.`,
      cta: 'Téléchargez notre guide gratuit pour aller plus loin.',
      tags: [theme, 'conseils', 'bonnes-pratiques'],
    },
    {
      title: `Comment nous avons transformé ${theme} pour un client`,
      platform: platforms[0] || 'LinkedIn',
      hook: `De 0 à 10K vues en 30 jours. Voici notre méthode pour ${theme}.`,
      body: `Un de nos clients nous a contacté avec un challenge : comment se démarquer dans ${theme} sans budget illimité ?\n\nNotre approche en 3 étapes :\n1. Audit complet de l'existant\n2. Stratégie sur mesure avec KPIs clairs\n3. Exécution rapide avec itérations hebdomadaires\n\nRésultat : +150% de visibilité, +45% de leads qualifiés, ROI positif en 6 semaines.`,
      cta: 'Envie du même résultat ? Parlons-en →',
      tags: [theme, 'case-study', 'resultats'],
    },
    {
      title: `Les outils indispensables pour ${theme}`,
      platform: platforms[0] || 'LinkedIn',
      hook: `Notre stack tech pour ${theme} en 2026. Tout ce qu'on utilise (et recommande).`,
      body: `Après des centaines de projets, voici les outils qui font vraiment la différence :\n\n🔧 Automatisation : n8n + Make\n📊 Analytics : Plausible + Mixpanel\n🎨 Design : Figma + Framer\n💻 Dev : Next.js + Vercel\n\nLe plus important n'est pas l'outil mais comment vous l'utilisez. L'IA amplifie les bonnes pratiques.`,
      cta: 'Quel outil vous manque ? Dites-le en commentaire 👇',
      tags: [theme, 'outils', 'tech-stack'],
    },
    {
      title: `L'IA au service de ${theme} : notre vision`,
      platform: platforms[0] || 'LinkedIn',
      hook: `L'IA ne remplace pas l'humain dans ${theme}. Elle le rend 10x plus efficace.`,
      body: `Chez AltCtrl.Lab, on utilise l'IA pour :\n✅ Automatiser les tâches répétitives\n✅ Générer des premières ébauches rapidement\n✅ Analyser les données en temps réel\n\nMais l'humain reste au centre :\n🧠 Stratégie et vision\n🎨 Direction créative\n🤝 Relation client\n\nL'IA est notre copilote, pas notre pilote.`,
      cta: 'Curieux de voir comment on intègre l\'IA ? Réservez une démo.',
      tags: [theme, 'ia', 'innovation'],
    },
  ];

  return templates.slice(0, count);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { theme, count = 5, platforms = ['LinkedIn'], period } = body;

    if (!theme) return NextResponse.json({ success: false, error: 'theme requis' }, { status: 400 });

    const platformList = Array.isArray(platforms) ? platforms : [platforms];
    let posts: ContentPost[];
    let fromTemplate = false;

    if (!KIMI_API_KEY) {
      logger.warn('generate-content-batch', 'KIMI_API_KEY missing, using fallback templates', { theme });
      posts = generateFallbackPosts(theme, count, platformList);
      fromTemplate = true;
    } else {
      try {
        const prompt = `Tu es un expert en content marketing digital.
Génère ${count} posts de contenu en français pour les plateformes suivantes : ${platformList.join(', ')}.
Thème/secteur : ${theme}
${period ? `Période : ${period}` : ''}

Pour chaque post, retourne un JSON array avec ce format exact :
[
  {
    "title": "Titre court du post",
    "platform": "LinkedIn|Instagram|Twitter|Blog",
    "hook": "Accroche percutante (1-2 phrases)",
    "body": "Corps du post (200-400 mots pour LinkedIn, 150 pour Instagram, 280 car pour Twitter)",
    "cta": "Appel à l'action",
    "tags": ["tag1", "tag2", "tag3"]
  }
]

Retourne UNIQUEMENT le JSON array, sans commentaires ni balises markdown.`;

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

        if (!res.ok) throw new Error(`Kimi API ${res.status}`);

        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content ?? '[]';
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        posts = JSON.parse(cleaned);
      } catch (apiErr) {
        logger.error('generate-content-batch', 'Kimi API failed, using fallback templates', { theme }, apiErr as Error);
        posts = generateFallbackPosts(theme, count, platformList);
        fromTemplate = true;
      }
    }

    // Insert all posts in DB
    const createdIds: string[] = [];
    for (const post of posts) {
      const id = await createContentItem({
        title: post.title ?? 'Sans titre',
        type: 'Post LinkedIn',
        platform: (post.platform as string) ?? 'LinkedIn',
        status: 'Brouillon',
        agent: 'khatib',
        hook: post.hook ?? null,
        body: post.body ?? null,
        cta: post.cta ?? null,
        tags: post.tags ? JSON.stringify(post.tags) : null,
      } as any);
      createdIds.push(id);
    }

    return NextResponse.json({ success: true, data: { count: createdIds.length, ids: createdIds, fromTemplate } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
