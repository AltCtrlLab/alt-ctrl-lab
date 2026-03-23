export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { createDeliverable, getDeliverablesForProject, deleteDeliverable } from '@/lib/db';
import { logger } from '@/lib/logger';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DELIVERABLES_DIR = path.join(os.homedir(), '.openclaw', 'deliverables');

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req.ip ?? 'anon', 'default');
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const items = getDeliverablesForProject(projectId);
  return NextResponse.json({ success: true, deliverables: items });
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req.ip ?? 'anon', 'default');
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;

    if (!file || !projectId) {
      return NextResponse.json({ error: 'file and projectId required' }, { status: 400 });
    }

    // File size limit: 50MB
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 413 });
    }

    // Sanitize filename to prevent path traversal
    const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!safeName || safeName === '.' || safeName === '..') {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Save file to disk
    const projectDir = path.join(DELIVERABLES_DIR, projectId);
    fs.mkdirSync(projectDir, { recursive: true });
    const filePath = path.join(projectDir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const id = createDeliverable({
      projectId,
      filename: safeName,
      filePath,
      fileSize: buffer.length,
      mimeType: file.type || 'application/octet-stream',
    });

    logger.info(`[deliverables] Uploaded ${safeName} for project ${projectId}`);
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err) {
    logger.error(`[deliverables] Upload error: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const rl = checkRateLimit(req.ip ?? 'anon', 'default');
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  deleteDeliverable(id);
  return NextResponse.json({ success: true });
}
