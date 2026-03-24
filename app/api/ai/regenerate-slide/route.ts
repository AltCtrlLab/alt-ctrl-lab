export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from '@/lib/logger';
import { getContentItemById, updateContentItem } from '@/lib/db';
import { regenerateSlideInputSchema } from '@/lib/ai/carousel-types';
import type { CarouselBrief } from '@/lib/ai/carousel-types';
import { buildSlidePrompt } from '@/lib/ai/carousel-prompts';
import { generateSlideImage, isGeminiConfigured } from '@/lib/ai/gemini-client';

export async function POST(request: NextRequest) {
  try {
    if (!isGeminiConfigured()) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY not configured' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = regenerateSlideInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const { contentId, slideNumber, updatedSlide } = parsed.data;

    // Get the content item and its brief
    const item = await getContentItemById(contentId);
    if (!item || !item.slideData) {
      return NextResponse.json({ success: false, error: 'Content item not found or has no slide data' }, { status: 404 });
    }

    const brief: CarouselBrief = JSON.parse(item.slideData as string);
    const slideIndex = brief.slides.findIndex(s => s.number === slideNumber);
    if (slideIndex === -1) {
      return NextResponse.json({ success: false, error: `Slide ${slideNumber} not found in brief` }, { status: 404 });
    }

    // Use updated slide spec if provided
    const slideSpec = updatedSlide ?? brief.slides[slideIndex];

    // If updated, persist the change in the brief
    if (updatedSlide) {
      brief.slides[slideIndex] = updatedSlide;
      await updateContentItem(contentId, {
        slideData: JSON.stringify(brief),
      } as Record<string, unknown>);
    }

    // Build prompt and generate
    const prompt = buildSlidePrompt(slideSpec, brief);
    logger.info('regenerate-slide', `Regenerating slide ${slideNumber}`, { contentId });
    const buffer = await generateSlideImage(prompt);

    // Save the image
    const imageDir = join(homedir(), '.openclaw', 'carousel-images', contentId);
    if (!existsSync(imageDir)) mkdirSync(imageDir, { recursive: true });
    const filename = `slide-${slideNumber}.png`;
    writeFileSync(join(imageDir, filename), buffer);

    // Update image paths in DB
    const existingPaths: string[] = item.imagePaths ? JSON.parse(item.imagePaths as string) : [];
    if (!existingPaths.includes(filename)) {
      existingPaths.push(filename);
      existingPaths.sort();
      await updateContentItem(contentId, {
        imagePaths: JSON.stringify(existingPaths),
      } as Record<string, unknown>);
    }

    logger.info('regenerate-slide', `Slide ${slideNumber} regenerated successfully`, { contentId });

    return NextResponse.json({
      success: true,
      data: { contentId, slideNumber, filename },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('regenerate-slide', 'Regeneration failed', {}, err as Error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
