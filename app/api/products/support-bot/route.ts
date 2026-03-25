export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

/**
 * AltCtrl Support Bot — RAG chatbot product for clients.
 *
 * Architecture:
 * - Client docs/FAQ are stored in `support_bot_docs` table (text chunks)
 * - When a user asks a question, we find relevant chunks via simple keyword matching
 * - Kimi k2.5 (256K context) generates the answer using the context
 * - Conversation history is maintained per session
 * - Widget is served via /api/products/support-bot/widget endpoint
 *
 * Pricing: 500€ setup + 99€/mois
 *
 * POST /api/products/support-bot — Chat endpoint
 * Body: { clientId, question, sessionId?, history?: [{role, content}] }
 *
 * GET /api/products/support-bot?clientId=xxx — Get bot config
 */

// ─── Chat endpoint ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { clientId, question, sessionId, history } = (await request.json()) as {
      clientId: string;
      question: string;
      sessionId?: string;
      history?: Array<{ role: string; content: string }>;
    };

    if (!clientId || !question) {
      return NextResponse.json({ error: 'Missing clientId or question' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;

    // Ensure tables exist
    ensureTables(rawDb);

    // Get bot config
    const config = rawDb.prepare(
      'SELECT * FROM support_bot_configs WHERE client_id = ? AND active = 1',
    ).get(clientId) as BotConfig | undefined;

    if (!config) {
      return NextResponse.json({ error: 'Bot not configured for this client' }, { status: 404 });
    }

    // Find relevant docs via keyword matching
    const relevantDocs = findRelevantDocs(rawDb, clientId, question);

    // Build context
    const context = relevantDocs.map(d => d.content).join('\n\n---\n\n');

    // Generate answer
    const answer = await generateAnswer(question, context, config, history || []);

    if (!answer) {
      return NextResponse.json({
        success: true,
        data: {
          answer: config.fallback_message || "Je n'ai pas pu trouver de réponse. Contactez-nous directement.",
          fromFallback: true,
          sessionId: sessionId || generateSessionId(),
        },
      });
    }

    // Log conversation
    const now = Date.now();
    const sid = sessionId || generateSessionId();
    rawDb.prepare(`
      INSERT INTO support_bot_conversations (id, client_id, session_id, question, answer, doc_ids_used, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `sbc_${now}_${Math.random().toString(36).substr(2, 6)}`,
      clientId,
      sid,
      question,
      answer,
      relevantDocs.map(d => d.id).join(','),
      now,
    );

    return NextResponse.json({
      success: true,
      data: { answer, fromFallback: false, sessionId: sid, docsUsed: relevantDocs.length },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('support-bot', 'Chat failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── Config endpoint ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const action = request.nextUrl.searchParams.get('action');

  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
  }

  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureTables(rawDb);

  if (action === 'stats') {
    // Return usage stats
    const stats = rawDb.prepare(`
      SELECT COUNT(*) as total_conversations,
             COUNT(DISTINCT session_id) as unique_sessions
      FROM support_bot_conversations
      WHERE client_id = ?
    `).get(clientId) as { total_conversations: number; unique_sessions: number };

    const recent = rawDb.prepare(`
      SELECT question, answer, created_at FROM support_bot_conversations
      WHERE client_id = ? ORDER BY created_at DESC LIMIT 10
    `).all(clientId);

    return NextResponse.json({ success: true, data: { ...stats, recent } });
  }

  // Return config for widget initialization
  const config = rawDb.prepare(
    'SELECT client_id, bot_name, welcome_message, primary_color, logo_url FROM support_bot_configs WHERE client_id = ? AND active = 1',
  ).get(clientId) as Partial<BotConfig> | undefined;

  if (!config) {
    return NextResponse.json({ error: 'Bot not configured' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: config });
}

// ─── PATCH — Manage docs & config ────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, clientId } = body as { action: string; clientId: string };

    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureTables(rawDb);
    const now = Date.now();

    if (action === 'create_config') {
      const { botName, welcomeMessage, primaryColor, logoUrl, fallbackMessage, systemPrompt } = body as {
        botName?: string;
        welcomeMessage?: string;
        primaryColor?: string;
        logoUrl?: string;
        fallbackMessage?: string;
        systemPrompt?: string;
      };

      const id = `sbc_${now}_${Math.random().toString(36).substr(2, 6)}`;
      rawDb.prepare(`
        INSERT OR REPLACE INTO support_bot_configs (id, client_id, bot_name, welcome_message, primary_color, logo_url, fallback_message, system_prompt, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        id, clientId,
        botName || 'Assistant',
        welcomeMessage || 'Bonjour ! Comment puis-je vous aider ?',
        primaryColor || '#6366f1',
        logoUrl || null,
        fallbackMessage || "Je n'ai pas trouvé de réponse. Contactez-nous directement.",
        systemPrompt || null,
        now, now,
      );

      return NextResponse.json({ success: true, configId: id });
    }

    if (action === 'add_docs') {
      const { documents } = body as { documents: Array<{ title: string; content: string; category?: string }> };
      if (!documents?.length) {
        return NextResponse.json({ error: 'No documents provided' }, { status: 400 });
      }

      let added = 0;
      for (const doc of documents) {
        // Split large docs into chunks (~2000 chars each)
        const chunks = chunkText(doc.content, 2000);
        for (let i = 0; i < chunks.length; i++) {
          const id = `sbd_${now}_${Math.random().toString(36).substr(2, 9)}`;
          const keywords = extractKeywords(chunks[i]);
          rawDb.prepare(`
            INSERT INTO support_bot_docs (id, client_id, title, content, category, keywords, chunk_index, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, clientId, doc.title, chunks[i], doc.category || 'general', keywords, i, now);
          added++;
        }
      }

      return NextResponse.json({ success: true, added, chunks: added });
    }

    if (action === 'delete_docs') {
      const { docIds, category } = body as { docIds?: string[]; category?: string };
      if (docIds?.length) {
        const placeholders = docIds.map(() => '?').join(',');
        rawDb.prepare(`DELETE FROM support_bot_docs WHERE id IN (${placeholders}) AND client_id = ?`).run(...docIds, clientId);
      } else if (category) {
        rawDb.prepare('DELETE FROM support_bot_docs WHERE client_id = ? AND category = ?').run(clientId, category);
      } else {
        rawDb.prepare('DELETE FROM support_bot_docs WHERE client_id = ?').run(clientId);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('support-bot', 'PATCH failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BotConfig {
  id: string;
  client_id: string;
  bot_name: string;
  welcome_message: string;
  primary_color: string;
  logo_url: string | null;
  fallback_message: string;
  system_prompt: string | null;
  active: number;
}

interface DocChunk {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string;
}

// ─── DB setup ─────────────────────────────────────────────────────────────────

function ensureTables(rawDb: import('better-sqlite3').Database) {
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS support_bot_configs (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL UNIQUE,
      bot_name TEXT NOT NULL DEFAULT 'Assistant',
      welcome_message TEXT NOT NULL DEFAULT 'Bonjour !',
      primary_color TEXT NOT NULL DEFAULT '#6366f1',
      logo_url TEXT,
      fallback_message TEXT,
      system_prompt TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sbc_client ON support_bot_configs(client_id);

    CREATE TABLE IF NOT EXISTS support_bot_docs (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      keywords TEXT,
      chunk_index INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sbd_client ON support_bot_docs(client_id);
    CREATE INDEX IF NOT EXISTS idx_sbd_keywords ON support_bot_docs(keywords);

    CREATE TABLE IF NOT EXISTS support_bot_conversations (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      doc_ids_used TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sbconv_client ON support_bot_conversations(client_id);
    CREATE INDEX IF NOT EXISTS idx_sbconv_session ON support_bot_conversations(session_id);
  `);
}

// ─── Doc retrieval (simple keyword-based RAG) ─────────────────────────────────

function findRelevantDocs(rawDb: import('better-sqlite3').Database, clientId: string, question: string): DocChunk[] {
  const questionWords = extractKeywords(question).split(',').filter(Boolean);

  if (questionWords.length === 0) {
    // No keywords, return most recent docs
    return rawDb.prepare(
      'SELECT id, title, content, category, keywords FROM support_bot_docs WHERE client_id = ? ORDER BY created_at DESC LIMIT 5',
    ).all(clientId) as DocChunk[];
  }

  // Score each doc by keyword overlap
  const allDocs = rawDb.prepare(
    'SELECT id, title, content, category, keywords FROM support_bot_docs WHERE client_id = ?',
  ).all(clientId) as DocChunk[];

  const scored = allDocs.map(doc => {
    const docWords = doc.keywords.split(',').filter(Boolean);
    const overlap = questionWords.filter(w => docWords.some(dw => dw.includes(w) || w.includes(dw))).length;
    // Also check content for direct matches
    const contentHits = questionWords.filter(w => doc.content.toLowerCase().includes(w)).length;
    return { doc, score: overlap * 2 + contentHits };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  return scored.slice(0, 5).map(s => s.doc);
}

// ─── Answer generation ────────────────────────────────────────────────────────

async function generateAnswer(
  question: string,
  context: string,
  config: BotConfig,
  history: Array<{ role: string; content: string }>,
): Promise<string | null> {
  if (!KIMI_API_KEY) return null;

  const systemPrompt = config.system_prompt || `Tu es ${config.bot_name}, un assistant IA intégré au site du client.
Tu réponds aux questions en te basant UNIQUEMENT sur la documentation fournie ci-dessous.
Si tu ne trouves pas la réponse dans la documentation, dis-le honnêtement et suggère de contacter le support.
Sois concis (max 200 mots), amical et professionnel. Réponds dans la langue de la question.`;

  const messages = [
    { role: 'system' as const, content: `${systemPrompt}\n\n--- DOCUMENTATION ---\n${context || 'Aucune documentation trouvée.'}` },
    ...history.slice(-6).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user' as const, content: question },
  ];

  try {
    const res = await fetch(KIMI_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
      body: JSON.stringify({ model: 'kimi-k2.5', messages, temperature: 0.3, max_tokens: 500 }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

// ─── Text utilities ───────────────────────────────────────────────────────────

function chunkText(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text.slice(0, maxChars)];
}

function extractKeywords(text: string): string {
  const stopWords = new Set([
    'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'est', 'en', 'que', 'qui',
    'dans', 'pour', 'pas', 'sur', 'ce', 'il', 'ne', 'se', 'au', 'avec', 'son', 'je',
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to',
    'comment', 'quoi', 'quel', 'quelle', 'quels', 'quelles', 'est-ce', 'how', 'what', 'why',
  ]);

  return text.toLowerCase()
    .replace(/[^a-zà-ÿ0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 20)
    .join(',');
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
}
