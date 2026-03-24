import type { SlideSpec, CarouselBrief } from './carousel-types';

/* ── Design System Constants ───────────────────────────────────────── */

const COLORS = {
  bgTop: '#1A0012',
  bgBottom: '#0A0A0A',
  magenta: '#FF006B',
  cyan: '#00D9FF',
  white: '#FFFFFF',
  subtextLight: '#CCCCCC',
  subtextDark: '#AAAAAA',
  separator: '#333333',
  badgeBg: '#1A1A1A',
} as const;

/* ── Badge ─────────────────────────────────────────────────────────── */

function buildBadgeSpec(language: 'en' | 'fr'): string {
  const subtitle = language === 'fr' ? 'Labo Digital Premium' : 'Premium Digital Lab';
  return `MANDATORY BADGE (bottom-left corner of the slide):
A small rounded rectangle with semi-transparent dark background (${COLORS.badgeBg} at 80% opacity, slight blur).
Inside: "@altctrl.lab" in bold white text (10pt), and below it "${subtitle}" in smaller ${COLORS.subtextDark} text (8pt).
The badge must be identical on every slide. It should be discreet but legible.`;
}

/* ── Global Design Context ─────────────────────────────────────────── */

function buildGlobalDesignContext(): string {
  return `IMAGE SPECIFICATIONS:
- Canvas: 1080 × 1350 pixels (4:5 portrait ratio for Instagram carousel)
- Background: smooth vertical gradient from ${COLORS.bgTop} (top) to ${COLORS.bgBottom} (bottom), with a very subtle radial magenta glow (${COLORS.magenta} at 5% opacity) centered at top
- The background must be consistently dark — never white, never light gray, never flat black

TYPOGRAPHY:
- Headlines/titles: Bold geometric sans-serif font (like Montserrat Bold or Poppins Bold), white (${COLORS.white})
- Subtitles: Same font family, regular weight, ${COLORS.subtextLight}
- Body text: Same family, regular weight, ${COLORS.subtextDark}
- Accent numbers (01, 02, 03): Extra-bold, ${COLORS.magenta}
- Accent keywords: ${COLORS.magenta} or gradient ${COLORS.magenta} → ${COLORS.cyan} (max 1-2 words per slide)

VISUAL STYLE:
- Premium, clean, minimal — no clutter, no stock imagery
- Flat design — no 3D effects, no drop shadows on text
- Glassmorphism cards when showing enclosed content: semi-transparent dark background with subtle border in ${COLORS.cyan} at 30% opacity
- High contrast: white text must be clearly readable on dark background
- No watermarks, no borders, no Instagram UI elements baked in`;
}

/* ── Global Quality Requirements ───────────────────────────────────── */

function buildGlobalRequirements(language: 'en' | 'fr'): string {
  const langReqs = language === 'fr'
    ? `- All text is in FRENCH. Render all French accents correctly: é, è, ê, ë, ç, à, ù, î, ô, û, etc.
- Use French quotation marks « » if needed.`
    : `- All text is in ENGLISH. Use proper Title Case for headlines.`;

  return `CRITICAL QUALITY REQUIREMENTS:
- All text must be rendered with PERFECT spelling — zero typos, zero missing letters, zero garbled characters
${langReqs}
- The image must look like a professionally designed Instagram carousel slide, NOT AI-generated art
- Every letter and word must be pixel-perfect readable at Instagram viewing size
- No decorative fonts — only clean geometric sans-serif
- No watermarks or artifacts`;
}

/* ── Slide Type Templates ──────────────────────────────────────────── */

function buildSlideTypeA(slide: SlideSpec, meta: CarouselBrief): string {
  return `SLIDE TYPE: Hook / Question (always the first slide — must grab attention immediately)

LAYOUT:
- Top section (15% height): ${slide.topic_label ? `Thin decorative text "— ${slide.topic_label} —" centered in #888888, uppercase, tracking wide` : 'Empty space for breathing room'}
- Center section (45% height): Large bold white title "${slide.title}" in bold geometric sans-serif, centered horizontally and vertically. Font size should be very large — this is the hero text. ${slide.subtitle ? `Below the title: "${slide.subtitle}" in ${COLORS.subtextLight}, smaller font.` : ''}
- Lower center (30% height): ${slide.visual_description}
- Bottom 10%: Reserved for badge

MOOD: Curiosity-inducing, dramatic, clean. The question/hook must feel impossible to ignore.`;
}

function buildSlideTypeB(slide: SlideSpec, meta: CarouselBrief): string {
  return `SLIDE TYPE: Revelation / Statistic (reveals the answer to a hook, or presents a surprising stat)

LAYOUT:
- Top (10%): Breathing space
- Center (60%): The main revelation text "${slide.title}" rendered very large and bold in white. If this contains a number/percentage, make that number extra large (2-3x) and in ${COLORS.magenta} or ${COLORS.cyan} for emphasis. ${slide.subtitle ? `Below: "${slide.subtitle}" in ${COLORS.subtextLight}.` : ''}
- Lower center (20%): ${slide.visual_description}
- Bottom: Badge area

MOOD: Satisfying reveal, "aha moment". The stat/answer should visually dominate the slide.`;
}

function buildSlideTypeC(slide: SlideSpec, meta: CarouselBrief): string {
  return `SLIDE TYPE: Dual Comparison (split layout showing two contrasting concepts side by side)

LAYOUT:
- Top (15%): Bold white title "${slide.title}" centered. ${slide.subtitle ? `Below: "${slide.subtitle}" in ${COLORS.subtextLight}.` : ''}
- Middle (60%): Split into two equal columns, divided by a thin vertical dashed line (${COLORS.separator}).
  ${slide.visual_description}
  Each column should have: a bold white subheading, description text in ${COLORS.subtextDark}, and a visual element (icon, shape, or illustration) below.
- Bottom left: Badge

MOOD: Clear contrast, educational. The viewer should instantly see the two sides of the comparison.`;
}

function buildSlideTypeD(slide: SlideSpec, meta: CarouselBrief): string {
  return `SLIDE TYPE: Brain Insight (pattern interrupt — anchors a key concept with a brain illustration)

LAYOUT:
- Center-upper (50%): A friendly cartoon brain illustration with a glowing light bulb above it. The brain should be approachable and cute (not medical/realistic). Use pink/magenta tones for the brain outline, warm yellow for the bulb glow.
- Center (30%): A large white rounded speech bubble pointing upward toward the brain. Inside the bubble: "${slide.title}" in bold dark text (#111111) on white background. ${slide.subtitle ? `Below inside the bubble: "${slide.subtitle}" in smaller #555555.` : ''}
- Bottom left: Badge

MOOD: Friendly, memorable. This slide is a "breathing pause" between dense content slides. The brain character adds personality.`;
}

function buildSlideTypeE(slide: SlideSpec, meta: CarouselBrief): string {
  return `SLIDE TYPE: List / Framework (numbered actionable steps)

LAYOUT:
- Top (15%): Bold white title "${slide.title}" centered. ${slide.subtitle ? `Subtitle: "${slide.subtitle}" in ${COLORS.subtextLight}.` : ''}
- Body (70%): ${slide.visual_description}
  Each numbered item should be structured as:
  - Large bold number (01, 02, 03) in ${COLORS.magenta}, aligned left
  - To the right of the number: bold white item title, with description in ${COLORS.subtextDark} below
  - Generous vertical spacing between items (at least 40px)
  - Optionally: each item in a subtle glassmorphism row (dark semi-transparent bg, thin ${COLORS.cyan} border at 20% opacity)
- Bottom left: Badge

MOOD: Actionable, structured, valuable. The viewer should feel they're getting a concrete framework to apply.`;
}

function buildSlideTypeF(slide: SlideSpec, meta: CarouselBrief): string {
  return `SLIDE TYPE: Strong Message (pure typography impact — closing statement)

LAYOUT:
- The entire slide is dominated by text. No illustrations, no icons, no decorative elements except the background gradient.
- Vertically centered: "${slide.title}" in VERY LARGE bold white text. This should be the biggest text on any slide in the carousel — maximum visual impact. Use at least 60pt equivalent. Center it horizontally and vertically.
- Below the main text (with spacing): ${slide.subtitle ? `"${slide.subtitle}" in ${COLORS.subtextDark}, centered, smaller.` : 'Nothing — let the main message breathe.'}
- Optionally: a slightly stronger magenta radial glow in the background (8% opacity instead of 5%) to add drama
- Bottom left: Badge

MOOD: Dramatic, quotable, shareable. This slide should make the viewer want to screenshot and share it. The text IS the design.`;
}

function buildSlideTypeG(slide: SlideSpec, meta: CarouselBrief): string {
  const ctaMain = meta.language === 'fr' ? 'Abonnez-vous !' : 'Follow for more';
  return `SLIDE TYPE: CTA / Follow (always the last slide — call to action)

LAYOUT:
- Top (20%): Bold white title "${slide.title || ctaMain}" centered.
- Below title: ${slide.subtitle ? `"${slide.subtitle}" in ${COLORS.subtextLight}` : `"Weekly insights on digital strategy, branding & growth" in ${COLORS.subtextLight}`}
- Center (50%): ${slide.visual_description || 'A realistic smartphone mockup showing a dark-themed Instagram profile page for @altctrl.lab. The profile should show the AltCtrl.Lab branding, a grid of dark-themed posts, and a "Follow" button. A curved white arrow points toward the Follow button.'}
- Bottom left: Badge

MOOD: Inviting, clear next step. After receiving value from the carousel, the viewer should feel compelled to follow.`;
}

function buildSlideTypeH(slide: SlideSpec, meta: CarouselBrief): string {
  return `SLIDE TYPE: Single Element with Title (one dominant visual illustrating a concept)

LAYOUT:
- Top (20%): Bold white title "${slide.title}" centered. ${slide.subtitle ? `Below: "${slide.subtitle}" in ${COLORS.subtextLight}.` : ''}
- Center (55%): ${slide.visual_description}
  This visual element should be the clear focal point of the slide — large, centered, and well-rendered.
- Bottom spacing for badge area
- Bottom left: Badge

MOOD: Focused, concrete. One strong visual proves the point. Clean composition with a single dominant element.`;
}

/* ── Main Prompt Builder ───────────────────────────────────────────── */

const TYPE_BUILDERS: Record<string, (slide: SlideSpec, meta: CarouselBrief) => string> = {
  A: buildSlideTypeA,
  B: buildSlideTypeB,
  C: buildSlideTypeC,
  D: buildSlideTypeD,
  E: buildSlideTypeE,
  F: buildSlideTypeF,
  G: buildSlideTypeG,
  H: buildSlideTypeH,
};

export function buildSlidePrompt(slide: SlideSpec, brief: CarouselBrief): string {
  const typeBuilder = TYPE_BUILDERS[slide.type];
  if (!typeBuilder) {
    throw new Error(`Unknown slide type: ${slide.type}`);
  }

  const parts = [
    `Create a professional Instagram carousel slide image.`,
    ``,
    `CONTEXT: This is slide ${slide.number} of ${brief.slide_count} in an educational carousel by AltCtrl.Lab, a premium digital agency. Topic: "${brief.topic}".`,
    ``,
    buildGlobalDesignContext(),
    ``,
    typeBuilder(slide, brief),
    ``,
    buildBadgeSpec(brief.language),
    ``,
    buildGlobalRequirements(brief.language),
  ];

  return parts.join('\n');
}

export function buildAllSlidePrompts(brief: CarouselBrief): string[] {
  return brief.slides.map(slide => buildSlidePrompt(slide, brief));
}
