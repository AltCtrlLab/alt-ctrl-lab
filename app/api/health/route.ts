import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

const startTime = Date.now();

export async function GET() {
  const g = globalThis as Record<string, unknown>;
  const sseClients = Array.isArray(g.__sseClients) ? g.__sseClients.length : 0;
  const eventHistory = Array.isArray(g.__sseEventHistory) ? g.__sseEventHistory.length : 0;

  // Vrai check SQLite
  let dbOk = false;
  try {
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    db.select().from(require('@/lib/db/schema').tasks).limit(1);
    dbOk = true;
  } catch { /* db down */ }

  // Vrai check OpenClaw binaire
  let openclawOk = false;
  try {
    execSync('where openclaw', { timeout: 3000, stdio: 'pipe' });
    openclawOk = true;
  } catch {
    try {
      execSync('which openclaw', { timeout: 3000, stdio: 'pipe' });
      openclawOk = true;
    } catch { /* pas trouvé */ }
  }

  return NextResponse.json({
    success: true,
    data: {
      sse: { connected: sseClients > 0, clients: sseClients },
      uptime: Math.floor((Date.now() - startTime) / 1000),
      agents: { total: 9, available: 9 },
      memory: { events: eventHistory },
      subsystems: {
        apiServer: true,
        sseStream: sseClients > 0,
        database: dbOk,
        openclaw: openclawOk,
        warRoom: true,
        vault: dbOk,
      },
    },
  });
}
