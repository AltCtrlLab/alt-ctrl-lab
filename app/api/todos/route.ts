export const dynamic = 'force-dynamic';
// /app/api/todos/route.ts
// CRUD pour les todos avec filtres temporels - VERSION SQLITE BRUTE

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateBody, todoCreateSchema, todoUpdateSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limiter';
import { auditCreate, auditUpdate, auditDelete } from '@/lib/audit';

interface Database {
  prepare: (sql: string) => {
    run: (...params: unknown[]) => { changes: number };
    get: (...params: unknown[]) => Record<string, unknown> | undefined;
    all: (...params: unknown[]) => Record<string, unknown>[];
  };
}

// GET /api/todos?view=today|week|month&assigned_to=agent_id
export async function GET(request: NextRequest) {
  const rl = checkRateLimit(`todos:get:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
  if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'today';
  const assignedTo = searchParams.get('assigned_to');
  const includeCompleted = searchParams.get('include_completed') === 'true';
  
  try {
    const drizzleDb = getDb();
    const db = (drizzleDb as unknown as { $client: Database }).$client;
    const now = new Date();
    
    // Calcul des bornes temporelles
    let startDate: Date;
    let endDate: Date;
    
    switch (view) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'week':
        startDate = new Date();
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date();
        endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case 'overdue':
        startDate = new Date(0);
        endDate = new Date();
        break;
      default:
        startDate = new Date(0);
        endDate = new Date(2099, 11, 31);
    }
    
    // Construction de la requête SQL
    let sql = 'SELECT * FROM todos WHERE 1=1';
    const params: unknown[] = [];
    
    if (view === 'overdue') {
      sql += ' AND due_date <= ?';
      params.push(endDate.toISOString());
    } else {
      sql += ' AND due_date >= ? AND due_date <= ?';
      params.push(startDate.toISOString(), endDate.toISOString());
    }
    
    if (assignedTo) {
      sql += ' AND assigned_to = ?';
      params.push(assignedTo);
    }
    
    if (!includeCompleted) {
      sql += ' AND is_completed = 0';
    }
    
    sql += ' ORDER BY due_date ASC, priority DESC';
    
    const results = db.prepare(sql).all(...params);
    
    // Stats simplifiées
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const stats = {
      today: db.prepare('SELECT COUNT(*) as c FROM todos WHERE due_date >= ? AND due_date <= ? AND is_completed = 0').get(todayStart.toISOString(), todayEnd.toISOString())?.c || 0,
      week: db.prepare('SELECT COUNT(*) as c FROM todos WHERE due_date >= ? AND due_date <= ? AND is_completed = 0').get(new Date().toISOString(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())?.c || 0,
      month: db.prepare('SELECT COUNT(*) as c FROM todos WHERE due_date >= ? AND due_date <= ? AND is_completed = 0').get(new Date().toISOString(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())?.c || 0,
      overdue: db.prepare('SELECT COUNT(*) as c FROM todos WHERE due_date <= ? AND is_completed = 0').get(new Date().toISOString())?.c || 0,
    };
    
    return NextResponse.json({
      success: true,
      data: {
        todos: results,
        stats,
        view,
        dateRange: { startDate, endDate }
      }
    });
    
  } catch (error) {
    console.error('[API] Error fetching todos:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch todos'
    }, { status: 500 });
  }
}

// POST /api/todos - Créer une todo
export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(`todos:post:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const body = await request.json();
    const v = validateBody(body, todoCreateSchema);
    if (!v.success) return v.response;
    const drizzleDb = getDb();
    const db = (drizzleDb as unknown as { $client: Database }).$client;
    
    const id = `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    db.prepare(`
      INSERT INTO todos (id, title, description, category, priority, assigned_to, assigned_to_name, due_date, created_at, is_completed, is_recurring, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      v.data.title,
      v.data.description || null,
      body.category || 'work',
      v.data.priority || 'medium',
      body.assignedTo || null,
      body.assignedToName || null,
      v.data.dueDate || new Date().toISOString(),
      new Date().toISOString(),
      0,
      body.isRecurring ? 1 : 0,
      body.source || 'manual'
    );
    
    auditCreate(request, 'todo', id, { title: v.data.title });
    return NextResponse.json({
      success: true,
      data: { id }
    });

  } catch (error) {
    console.error('[API] Error creating todo:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create todo'
    }, { status: 500 });
  }
}

// PATCH /api/todos?id=todo_id - Mettre à jour
export async function PATCH(request: NextRequest) {
  const rl = checkRateLimit(`todos:patch:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
  if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const v = validateBody(body, todoUpdateSchema);
    if (!v.success) return v.response;
    const drizzleDb = getDb();
    const db = (drizzleDb as unknown as { $client: Database }).$client;
    
    // Construction dynamique de la requête
    const updates: string[] = [];
    const values: unknown[] = [];
    
    const d = v.data as Record<string, unknown>;
    if (d.title !== undefined) { updates.push('title = ?'); values.push(d.title); }
    if (d.description !== undefined) { updates.push('description = ?'); values.push(d.description); }
    if (d.priority !== undefined) { updates.push('priority = ?'); values.push(d.priority); }
    if (d.assignedTo !== undefined) { updates.push('assigned_to = ?'); values.push(d.assignedTo); }
    if (d.assignedToName !== undefined) { updates.push('assigned_to_name = ?'); values.push(d.assignedToName); }
    if (d.dueDate !== undefined) { updates.push('due_date = ?'); values.push(d.dueDate); }
    if (d.isCompleted !== undefined) { updates.push('is_completed = ?'); values.push(d.isCompleted ? 1 : 0); }
    if (d.completedAt !== undefined) { updates.push('completed_at = ?'); values.push(d.completedAt); }
    
    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }
    
    values.push(id);
    
    db.prepare(`UPDATE todos SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    auditUpdate(request, 'todo', id, d);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[API] Error updating todo:', error);
    return NextResponse.json({ success: false, error: 'Failed to update todo' }, { status: 500 });
  }
}

// DELETE /api/todos?id=todo_id
export async function DELETE(request: NextRequest) {
  const rl = checkRateLimit(`todos:delete:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
  if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
  }

  try {
    const drizzleDb = getDb();
    const db = (drizzleDb as unknown as { $client: Database }).$client;
    
    db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    auditDelete(request, 'todo', id);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[API] Error deleting todo:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete todo' }, { status: 500 });
  }
}
