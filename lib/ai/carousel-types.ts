import { z } from 'zod';

/* ── Slide Types ───────────────────────────────────────────────────── */

export const SLIDE_TYPES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
export type SlideType = (typeof SLIDE_TYPES)[number];

export const SLIDE_TYPE_META: Record<SlideType, { label: string; color: string; bg: string }> = {
  A: { label: 'Hook / Question', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
  B: { label: 'Révélation / Stat', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  C: { label: 'Comparaison Duale', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  D: { label: 'Brain Insight', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  E: { label: 'Liste / Framework', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  F: { label: 'Message Fort', color: 'text-rose-400', bg: 'bg-rose-500/10' },
  G: { label: 'CTA / Follow', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  H: { label: 'Élément Unique', color: 'text-orange-400', bg: 'bg-orange-500/10' },
};

/* ── Pillar Types ──────────────────────────────────────────────────── */

export const CAROUSEL_PILLARS = [
  'branding_psychology',
  'performance_growth',
  'branding_identity',
  'tech_innovation',
  'behind_the_lab',
] as const;
export type CarouselPillar = (typeof CAROUSEL_PILLARS)[number];

export const PILLAR_LABELS: Record<CarouselPillar, { en: string; fr: string }> = {
  branding_psychology: { en: 'Branding Psychology', fr: 'Psychologie du Branding' },
  performance_growth: { en: 'Performance & Growth', fr: 'Performance & Croissance' },
  branding_identity: { en: 'Branding & Identity', fr: 'Branding & Identité' },
  tech_innovation: { en: 'Tech & Innovation', fr: 'Tech & Innovation' },
  behind_the_lab: { en: 'Behind The Lab', fr: "Les Coulisses du Lab" },
};

/* ── Zod Schemas ───────────────────────────────────────────────────── */

export const slideSpecSchema = z.object({
  number: z.number().int().min(1).max(20),
  type: z.enum(SLIDE_TYPES),
  title: z.string().min(1).max(300),
  subtitle: z.string().max(500).nullable().optional(),
  visual_description: z.string().min(1).max(1000),
  topic_label: z.string().max(100).nullable().optional(),
});

export const carouselBriefSchema = z.object({
  topic: z.string().min(1).max(500),
  pillar: z.enum(CAROUSEL_PILLARS),
  language: z.enum(['en', 'fr']),
  slide_count: z.number().int().min(5).max(16),
  slides: z.array(slideSpecSchema).min(5).max(16),
});

export const suggestTopicsInputSchema = z.object({
  pillar: z.enum(CAROUSEL_PILLARS),
  language: z.enum(['en', 'fr']),
});

export const topicSuggestionSchema = z.object({
  topics: z.array(z.string().min(5).max(200)).min(1).max(8),
});

export const generateBriefInputSchema = z.object({
  topic: z.string().min(1).max(500),
  pillar: z.enum(CAROUSEL_PILLARS),
  language: z.enum(['en', 'fr']),
  slideCount: z.number().int().min(5).max(16).default(10),
});

export const generateCarouselInputSchema = z.object({
  brief: carouselBriefSchema,
  contentId: z.string().optional(),
});

export const regenerateSlideInputSchema = z.object({
  contentId: z.string().min(1),
  slideNumber: z.number().int().min(1),
  updatedSlide: slideSpecSchema.optional(),
});

/* ── TypeScript Types (inferred from Zod) ──────────────────────────── */

export type SlideSpec = z.infer<typeof slideSpecSchema>;
export type CarouselBrief = z.infer<typeof carouselBriefSchema>;
export type GenerateBriefInput = z.infer<typeof generateBriefInputSchema>;
export type GenerateCarouselInput = z.infer<typeof generateCarouselInputSchema>;
export type RegenerateSlideInput = z.infer<typeof regenerateSlideInputSchema>;

/* ── Generation Status ─────────────────────────────────────────────── */

export interface CarouselGenerationStatus {
  contentId: string;
  totalSlides: number;
  completedSlides: number;
  failedSlides: number[];
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
}
