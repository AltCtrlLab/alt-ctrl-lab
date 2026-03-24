export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ contentId: string; slideNum: string }> },
) {
  const { contentId, slideNum } = await params;

  if (!contentId || !slideNum) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const filename = `slide-${slideNum}.png`;
  const filepath = join(homedir(), '.openclaw', 'carousel-images', contentId, filename);

  if (!existsSync(filepath)) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  const buffer = readFileSync(filepath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=3600, immutable',
    },
  });
}
