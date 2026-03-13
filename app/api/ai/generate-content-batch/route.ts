export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createContentItem } from '@/lib/db';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { theme, count = 5, platforms = ['LinkedIn'], period } = body;

    if (!theme) return NextResponse.json({ success: false, error: 'theme requis' }, { status: 400 });
    if (!KIMI_API_KEY) return NextResponse.json({ success: false, error: 'KIMI_API_KEY non configuré' }, { status: 503 });

    const platformList = Array.isArray(platforms) ? platforms.join(', ') : platforms;

    const prompt = `Tu es un expert en content marketing digital.
Génère ${count} posts de contenu en français pour les plateformes suivantes : ${platformList}.
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
        model: 'moonshot-v1-8k',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: `Kimi API error: ${err}` }, { status: 500 });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '[]';

    let posts: any[] = [];
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      posts = JSON.parse(cleaned);
    } catch (_) {
      return NextResponse.json({ success: false, error: 'Parsing JSON échoué' }, { status: 500 });
    }

    // Insert all posts in DB
    const createdIds: string[] = [];
    for (const post of posts) {
      const id = await createContentItem({
        title: post.title ?? 'Sans titre',
        type: 'Post LinkedIn',
        platform: (post.platform as any) ?? 'LinkedIn',
        status: 'Brouillon',
        agent: 'khatib',
        hook: post.hook ?? null,
        body: post.body ?? null,
        cta: post.cta ?? null,
        tags: post.tags ? JSON.stringify(post.tags) : null,
      } as any);
      createdIds.push(id);
    }

    return NextResponse.json({ success: true, data: { count: createdIds.length, ids: createdIds } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
