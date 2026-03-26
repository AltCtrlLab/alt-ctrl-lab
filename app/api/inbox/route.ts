export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Multi-Channel Inbox (Unified Communications)
 *
 * GET    /api/inbox — List conversations, filter by channel/status/client
 * POST   /api/inbox — Add a message to a conversation (or create new)
 * PATCH  /api/inbox — Assign, close, reopen, archive conversation
 * DELETE /api/inbox — Delete a conversation
 */

// ─── GET: List conversations ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureInboxTables(rawDb);

  const id = request.nextUrl.searchParams.get('id');
  const channel = request.nextUrl.searchParams.get('channel');
  const status = request.nextUrl.searchParams.get('status');
  const clientId = request.nextUrl.searchParams.get('clientId');
  const search = request.nextUrl.searchParams.get('search');

  // Single conversation with messages
  if (id) {
    const conv = rawDb.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const messages = rawDb.prepare(
      'SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(id);

    // Mark as read
    rawDb.prepare('UPDATE conversations SET unread_count = 0, updated_at = ? WHERE id = ?').run(Date.now(), id);

    return NextResponse.json({ success: true, data: { ...conv, messages } });
  }

  // List with filters
  let query = 'SELECT * FROM conversations WHERE 1=1';
  const params: unknown[] = [];

  if (channel) { query += ' AND channel = ?'; params.push(channel); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (clientId) { query += ' AND client_id = ?'; params.push(clientId); }
  if (search) {
    query += ' AND (subject LIKE ? OR contact_name LIKE ? OR contact_email LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY last_message_at DESC';

  const conversations = rawDb.prepare(query).all(...params);

  const stats = rawDb.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
      SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count,
      SUM(unread_count) as total_unread,
      COUNT(DISTINCT channel) as channels_active
    FROM conversations
  `).get() as Record<string, number>;

  const byChannel = rawDb.prepare(`
    SELECT channel, COUNT(*) as count, SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count
    FROM conversations GROUP BY channel
  `).all();

  return NextResponse.json({ success: true, data: { conversations, stats, byChannel } });
}

// ─── POST: Create conversation or add message ───────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      conversationId, channel, contactName, contactEmail, clientId,
      subject, message, direction, senderName,
    } = body as {
      conversationId?: string;
      channel?: string;
      contactName?: string;
      contactEmail?: string;
      clientId?: string;
      subject?: string;
      message: string;
      direction?: string;
      senderName?: string;
    };

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureInboxTables(rawDb);
    const now = Date.now();

    let convId = conversationId;

    // Create new conversation if no ID
    if (!convId) {
      const validChannels = ['email', 'whatsapp', 'chat', 'sms', 'instagram', 'linkedin', 'phone'];
      const safeChannel = validChannels.includes(channel || '') ? channel : 'email';

      convId = `conv_${now}_${Math.random().toString(36).substr(2, 9)}`;

      rawDb.prepare(`
        INSERT INTO conversations (id, channel, contact_name, contact_email, client_id, subject,
          status, assigned_to, unread_count, message_count, last_message_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'open', NULL, 1, 0, ?, ?, ?)
      `).run(convId, safeChannel, contactName || 'Unknown', contactEmail || null, clientId || null,
        subject || 'Sans objet', now, now, now);
    }

    // Add message
    const msgId = `msg_${now}_${Math.random().toString(36).substr(2, 9)}`;
    const dir = direction === 'outbound' ? 'outbound' : 'inbound';

    rawDb.prepare(`
      INSERT INTO conversation_messages (id, conversation_id, direction, sender_name, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(msgId, convId, dir, senderName || contactName || 'System', message, now);

    // Update conversation counters
    const unreadIncrement = dir === 'inbound' ? 1 : 0;
    rawDb.prepare(`
      UPDATE conversations SET
        message_count = message_count + 1,
        unread_count = unread_count + ?,
        last_message_at = ?,
        status = CASE WHEN status = 'closed' AND ? = 'inbound' THEN 'open' ELSE status END,
        updated_at = ?
      WHERE id = ?
    `).run(unreadIncrement, now, dir, now, convId);

    logger.info('inbox', 'Message added', { conversationId: convId, direction: dir });

    return NextResponse.json({ success: true, conversationId: convId, messageId: msgId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── PATCH: Update conversation ─────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, assignedTo } = body as { id: string; action: string; assignedTo?: string };

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureInboxTables(rawDb);
    const now = Date.now();

    if (action === 'close') {
      rawDb.prepare("UPDATE conversations SET status = 'closed', updated_at = ? WHERE id = ?").run(now, id);
      return NextResponse.json({ success: true });
    }

    if (action === 'reopen') {
      rawDb.prepare("UPDATE conversations SET status = 'open', updated_at = ? WHERE id = ?").run(now, id);
      return NextResponse.json({ success: true });
    }

    if (action === 'archive') {
      rawDb.prepare("UPDATE conversations SET status = 'archived', updated_at = ? WHERE id = ?").run(now, id);
      return NextResponse.json({ success: true });
    }

    if (action === 'assign') {
      rawDb.prepare('UPDATE conversations SET assigned_to = ?, updated_at = ? WHERE id = ?').run(assignedTo || null, now, id);
      return NextResponse.json({ success: true });
    }

    if (action === 'read') {
      rawDb.prepare('UPDATE conversations SET unread_count = 0, updated_at = ? WHERE id = ?').run(now, id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── DELETE ─────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureInboxTables(rawDb);

  rawDb.prepare('DELETE FROM conversation_messages WHERE conversation_id = ?').run(id);
  rawDb.prepare('DELETE FROM conversations WHERE id = ?').run(id);

  return NextResponse.json({ success: true });
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _inboxTablesCreated = false;
function ensureInboxTables(rawDb: import('better-sqlite3').Database) {
  if (_inboxTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL DEFAULT 'email',
      contact_name TEXT NOT NULL,
      contact_email TEXT,
      client_id TEXT,
      subject TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      assigned_to TEXT,
      unread_count INTEGER DEFAULT 0,
      message_count INTEGER DEFAULT 0,
      last_message_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_conv_status ON conversations(status);
    CREATE INDEX IF NOT EXISTS idx_conv_channel ON conversations(channel);
    CREATE INDEX IF NOT EXISTS idx_conv_client ON conversations(client_id);
    CREATE INDEX IF NOT EXISTS idx_conv_last ON conversations(last_message_at DESC);

    CREATE TABLE IF NOT EXISTS conversation_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      direction TEXT NOT NULL DEFAULT 'inbound',
      sender_name TEXT,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cmsg_conv ON conversation_messages(conversation_id);
  `);
  _inboxTablesCreated = true;
}
