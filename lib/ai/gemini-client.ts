import { GoogleGenAI } from '@google/genai';
import { logger } from '@/lib/logger';

/* ── Configuration ─────────────────────────────────────────────────── */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-preview-image-generation';

function getClient(): GoogleGenAI {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured. Add it to your .env.local file.');
  }
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

/* ── Single Slide Generation ───────────────────────────────────────── */

export async function generateSlideImage(prompt: string): Promise<Buffer> {
  const client = getClient();

  const response = await client.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: prompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 1.0,
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error('Gemini returned no content parts');
  }

  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith('image/')) {
      const base64 = part.inlineData.data;
      if (!base64) throw new Error('Gemini returned empty image data');
      return Buffer.from(base64, 'base64');
    }
  }

  throw new Error('Gemini response contained no image data');
}

/* ── Full Carousel Generation (Sequential) ─────────────────────────── */

export interface SlideResult {
  slideNumber: number;
  success: boolean;
  buffer?: Buffer;
  error?: string;
}

export async function generateCarouselSlides(
  prompts: string[],
  onSlideComplete?: (slideNum: number, total: number) => void,
): Promise<SlideResult[]> {
  const results: SlideResult[] = [];

  for (let i = 0; i < prompts.length; i++) {
    const slideNum = i + 1;
    try {
      logger.info('gemini-client', `Generating slide ${slideNum}/${prompts.length}`, {});
      const buffer = await generateSlideImageWithRetry(prompts[i]);
      results.push({ slideNumber: slideNum, success: true, buffer });
      logger.info('gemini-client', `Slide ${slideNum} generated successfully`, {});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('gemini-client', `Slide ${slideNum} failed`, {}, err as Error);
      results.push({ slideNumber: slideNum, success: false, error: message });
    }
    onSlideComplete?.(slideNum, prompts.length);
  }

  return results;
}

/* ── Retry Wrapper ─────────────────────────────────────────────────── */

async function generateSlideImageWithRetry(prompt: string, maxRetries = 1): Promise<Buffer> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateSlideImage(prompt);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = 2000 * (attempt + 1);
        logger.warn('gemini-client', `Retry ${attempt + 1} after ${delay}ms`, { error: lastError.message });
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error('generateSlideImage failed');
}

/* ── Health Check ──────────────────────────────────────────────────── */

export function isGeminiConfigured(): boolean {
  return GEMINI_API_KEY.length > 0;
}
