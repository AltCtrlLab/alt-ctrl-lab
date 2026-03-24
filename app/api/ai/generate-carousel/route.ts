export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from '@/lib/logger';
import { createContentItem, updateContentItem, getContentItemById } from '@/lib/db';
import { generateCarouselInputSchema, carouselBriefSchema } from '@/lib/ai/carousel-types';
import type { CarouselBrief } from '@/lib/ai/carousel-types';
import { buildAllSlidePrompts } from '@/lib/ai/carousel-prompts';
import { generateCarouselSlides, isGeminiConfigured } from '@/lib/ai/gemini-client';

/* ── Image directory ───────────────────────────────────────────────── */

function getImageDir(contentId: string): string {
  const base = join(homedir(), '.openclaw', 'carousel-images', contentId);
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  return base;
}

/* ── In-memory generation status ───────────────────────────────────── */

const generationStatus = new Map<string, {
  totalSlides: number;
  completedSlides: number;
  failedSlides: number[];
  status: 'generating' | 'completed' | 'failed';
  error?: string;
}>();

/* ── POST: Generate carousel images ────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    if (!isGeminiConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'GEMINI_API_KEY is not configured. Add it to your environment variables.',
      }, { status: 400 });
    }

    const body = await request.json();
    const parsed = generateCarouselInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const { brief, contentId: existingId } = parsed.data;

    // Create or update content item
    let contentId = existingId;
    if (contentId) {
      await updateContentItem(contentId, {
        slideData: JSON.stringify(brief),
        type: 'Carousel',
        platform: 'Instagram',
        status: 'Brouillon',
      } as Record<string, unknown>);
    } else {
      contentId = await createContentItem({
        title: brief.topic,
        type: 'Carousel',
        platform: 'Instagram',
        status: 'Brouillon',
        agent: 'manuel',
        hook: brief.slides[0]?.title ?? null,
        body: `${brief.slide_count} slides — ${brief.language.toUpperCase()} — ${brief.pillar}`,
        slideData: JSON.stringify(brief),
      } as Record<string, unknown>);
    }

    // Initialize status tracking
    generationStatus.set(contentId, {
      totalSlides: brief.slides.length,
      completedSlides: 0,
      failedSlides: [],
      status: 'generating',
    });

    // Build prompts
    const prompts = buildAllSlidePrompts(brief);
    const imageDir = getImageDir(contentId);

    logger.info('generate-carousel', `Starting generation of ${brief.slides.length} slides`, { contentId });

    // Generate all slides sequentially
    const results = await generateCarouselSlides(prompts, (slideNum, total) => {
      const status = generationStatus.get(contentId!);
      if (status) {
        status.completedSlides = slideNum;
      }
    });

    // Save images and track results
    const imagePaths: string[] = [];
    const failedSlides: number[] = [];

    for (const result of results) {
      if (result.success && result.buffer) {
        const filename = `slide-${result.slideNumber}.png`;
        const filepath = join(imageDir, filename);
        writeFileSync(filepath, result.buffer);
        imagePaths.push(filename);
      } else {
        failedSlides.push(result.slideNumber);
        logger.warn('generate-carousel', `Slide ${result.slideNumber} failed: ${result.error}`, { contentId });
      }
    }

    // Update content item with image paths
    await updateContentItem(contentId, {
      imagePaths: JSON.stringify(imagePaths),
    } as Record<string, unknown>);

    // Update status
    generationStatus.set(contentId, {
      totalSlides: brief.slides.length,
      completedSlides: results.length,
      failedSlides,
      status: failedSlides.length === brief.slides.length ? 'failed' : 'completed',
    });

    logger.info('generate-carousel', `Generation complete: ${imagePaths.length}/${brief.slides.length} slides`, { contentId });

    return NextResponse.json({
      success: true,
      data: {
        contentId,
        imagePaths,
        slideCount: imagePaths.length,
        failedSlides,
        totalSlides: brief.slides.length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('generate-carousel', 'Generation failed', {}, err as Error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/* ── GET: Generation status ────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');

    if (!contentId) {
      return NextResponse.json({ success: false, error: 'contentId required' }, { status: 400 });
    }

    // Check in-memory status first
    const memStatus = generationStatus.get(contentId);
    if (memStatus) {
      return NextResponse.json({ success: true, data: { contentId, ...memStatus } });
    }

    // Fall back to filesystem check
    const imageDir = join(homedir(), '.openclaw', 'carousel-images', contentId);
    if (!existsSync(imageDir)) {
      return NextResponse.json({ success: true, data: { contentId, totalSlides: 0, completedSlides: 0, failedSlides: [], status: 'pending' } });
    }

    const files = readdirSync(imageDir).filter(f => f.startsWith('slide-') && f.endsWith('.png'));

    // Get total from DB
    const item = await getContentItemById(contentId);
    const brief: CarouselBrief | null = item?.slideData ? JSON.parse(item.slideData as string) : null;

    return NextResponse.json({
      success: true,
      data: {
        contentId,
        totalSlides: brief?.slide_count ?? files.length,
        completedSlides: files.length,
        failedSlides: [],
        status: files.length > 0 ? 'completed' : 'pending',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
