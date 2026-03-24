export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { generateBriefInputSchema } from '@/lib/ai/carousel-types';
import type { CarouselBrief, SlideSpec, SlideType } from '@/lib/ai/carousel-types';
import { PILLAR_LABELS } from '@/lib/ai/carousel-types';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';

/* ── Fallback brief templates ──────────────────────────────────────── */

function generateFallbackBrief(topic: string, pillar: string, language: 'en' | 'fr', slideCount: number): CarouselBrief {
  const isEn = language === 'en';
  const slides: SlideSpec[] = [];

  // Type A — Hook (always first)
  slides.push({
    number: 1,
    type: 'A',
    title: isEn ? `What if everything you knew about ${topic} was wrong?` : `Et si tout ce que vous saviez sur ${topic} était faux ?`,
    subtitle: isEn ? 'Swipe to find out →' : 'Swipez pour découvrir →',
    visual_description: 'A large glowing question mark in magenta (#FF006B) centered on the dark background, with subtle particle effects around it.',
    topic_label: PILLAR_LABELS[pillar as keyof typeof PILLAR_LABELS]?.[language] ?? topic,
  });

  // Type B — Stat
  slides.push({
    number: 2,
    type: 'B',
    title: isEn ? '73% of businesses get this wrong.' : '73% des entreprises font cette erreur.',
    subtitle: isEn ? `A deep-dive into ${topic}` : `Une plongée dans ${topic}`,
    visual_description: 'The number "73%" rendered very large in cyan (#00D9FF), with a subtle downward trend line graph behind it in #333333.',
  });

  // Type C — Comparison
  slides.push({
    number: 3,
    type: 'C',
    title: isEn ? 'The Wrong Way vs The Right Way' : "L'erreur classique vs La bonne approche",
    subtitle: null,
    visual_description: isEn
      ? 'LEFT COLUMN: Title "Traditional" with a crossed-out circle icon, description "Slow, manual, inconsistent results". RIGHT COLUMN: Title "Optimized" with a checkmark icon, description "Fast, automated, measurable impact".'
      : 'COLONNE GAUCHE : Titre "Traditionnel" avec une icône cercle barré, description "Lent, manuel, résultats inconsistants". COLONNE DROITE : Titre "Optimisé" avec une icône coche, description "Rapide, automatisé, impact mesurable".',
  });

  // Type D — Brain insight
  slides.push({
    number: 4,
    type: 'D',
    title: isEn ? `This is the key insight about ${topic}.` : `Voilà l'insight clé sur ${topic}.`,
    subtitle: null,
    visual_description: 'Cartoon brain with a glowing light bulb, friendly style, with a white speech bubble below containing the title text.',
  });

  // Fill middle with C and H slides
  for (let i = 5; i <= slideCount - 3; i++) {
    const type: SlideType = i % 2 === 0 ? 'C' : 'H';
    slides.push({
      number: i,
      type,
      title: isEn ? `Key point #${i - 3} about ${topic}` : `Point clé #${i - 3} sur ${topic}`,
      subtitle: isEn ? 'Here\'s why it matters' : 'Pourquoi c\'est important',
      visual_description: type === 'C'
        ? 'Split comparison layout showing before/after or concept A vs concept B with relevant icons on each side.'
        : 'A single large icon or illustration centered on the slide representing the concept, with clean minimal styling.',
    });
  }

  // Type E — Framework
  slides.push({
    number: slideCount - 2,
    type: 'E',
    title: isEn ? 'Your 3-Step Action Plan' : 'Votre plan d\'action en 3 étapes',
    subtitle: null,
    visual_description: isEn
      ? '01 "Audit your current state" — Identify gaps and opportunities. 02 "Implement the framework" — Apply the methodology step by step. 03 "Measure & iterate" — Track results and optimize continuously.'
      : '01 "Auditez votre situation actuelle" — Identifiez les écarts et opportunités. 02 "Appliquez le framework" — Mettez en œuvre la méthodologie étape par étape. 03 "Mesurez & itérez" — Suivez les résultats et optimisez en continu.',
  });

  // Type F — Strong message
  slides.push({
    number: slideCount - 1,
    type: 'F',
    title: isEn ? `${topic} is not optional anymore.` : `${topic} n'est plus optionnel.`,
    subtitle: isEn ? 'Every choice you make sends a signal.' : 'Chaque choix que vous faites envoie un signal.',
    visual_description: 'Pure typography slide — no illustrations. The title text dominates the entire slide in very large bold white text.',
  });

  // Type G — CTA (always last)
  slides.push({
    number: slideCount,
    type: 'G',
    title: isEn ? 'Follow for more' : 'Abonnez-vous !',
    subtitle: isEn ? 'Weekly insights on digital strategy, branding & growth' : 'Chaque semaine : stratégie digitale, branding & croissance',
    visual_description: 'A realistic smartphone mockup showing the @altctrl.lab Instagram profile with dark theme, a grid of posts, and a Follow button. A curved white arrow points to the Follow button.',
  });

  return {
    topic,
    pillar: pillar as CarouselBrief['pillar'],
    language,
    slide_count: slideCount,
    slides,
  };
}

/* ── POST Handler ──────────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generateBriefInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const { topic, pillar, language, slideCount } = parsed.data;
    let brief: CarouselBrief;
    let fromTemplate = false;

    if (!KIMI_API_KEY) {
      logger.warn('generate-carousel-brief', 'KIMI_API_KEY missing, using fallback template', { topic });
      brief = generateFallbackBrief(topic, pillar, language, slideCount);
      fromTemplate = true;
    } else {
      try {
        const pillarLabel = PILLAR_LABELS[pillar]?.[language] ?? pillar;
        const lang = language === 'fr' ? 'français' : 'English';

        const prompt = `You are an expert Instagram carousel content strategist for a premium digital agency called AltCtrl.Lab.

Generate a structured carousel brief in JSON format for the following:
- Topic: "${topic}"
- Content Pillar: ${pillarLabel}
- Language: ${lang}
- Number of slides: ${slideCount}

SLIDE TYPES available (use the letter codes):
- A: Hook/Question (always slide 1 — poses a question, creates curiosity)
- B: Revelation/Stat (reveals a surprising answer or statistic)
- C: Dual Comparison (split layout, side-by-side comparison)
- D: Brain Insight (cartoon brain with speech bubble, anchors a key concept)
- E: List/Framework (numbered steps: 01, 02, 03)
- F: Strong Message (pure typography, dramatic closing statement)
- G: CTA/Follow (always last slide — call to action to follow)
- H: Single Element (one dominant visual with title)

RULES:
- Slide 1 MUST be type A (Hook)
- Last slide MUST be type G (CTA)
- Never 3 slides of the same type in a row
- Type D (Brain Insight) serves as a "breathing pause" — place after 2-3 dense slides
- Type E (List) appears only once, in the last third
- At least one Type C (Comparison) per carousel
- The arc: Hook → Explain → Apply → Actionable → Close → CTA

Return ONLY a valid JSON object (no markdown, no comments) with this exact structure:
{
  "topic": "${topic}",
  "pillar": "${pillar}",
  "language": "${language}",
  "slide_count": ${slideCount},
  "slides": [
    {
      "number": 1,
      "type": "A",
      "title": "Main title text for the slide",
      "subtitle": "Optional subtitle or null",
      "visual_description": "Detailed description of visual elements to generate",
      "topic_label": "Category label or null"
    }
  ]
}

Each slide's visual_description must be detailed enough for an AI image generator to create the visual. Describe shapes, icons, illustrations, layout positions, and any visual metaphors. All text content must be in ${lang}.`;

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
          signal: AbortSignal.timeout(45_000),
        });

        if (!res.ok) throw new Error(`Kimi API ${res.status}`);

        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content ?? '{}';
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        brief = JSON.parse(cleaned);

        // Validate the response
        const validated = await import('@/lib/ai/carousel-types').then(m => m.carouselBriefSchema.safeParse(brief));
        if (!validated.success) {
          logger.warn('generate-carousel-brief', 'Kimi response failed validation, using fallback', { errors: validated.error.issues });
          brief = generateFallbackBrief(topic, pillar, language, slideCount);
          fromTemplate = true;
        }
      } catch (apiErr) {
        logger.error('generate-carousel-brief', 'Kimi API failed, using fallback', { topic }, apiErr as Error);
        brief = generateFallbackBrief(topic, pillar, language, slideCount);
        fromTemplate = true;
      }
    }

    return NextResponse.json({ success: true, data: { brief, fromTemplate } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
