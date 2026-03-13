// /app/api/todos/route.ts
// CRUD pour les todos avec filtres temporels - VERSION SQLITE BRUTE

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface Database {
  prepare: (sql: string) => {
    run: (...params: unknown[]) => { changes: number };
    get: (...params: unknown[]) => Record<string, unknown> | undefined;
    all: (...params: unknown[]) => Record<string, unknown>[];
  };
}

// GET /api/todos?view=today|week|month&assigned_to=agent_id
export async function GET(request: NextRequest) {
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
    const body = await request.json();
    const drizzleDb = getDb();
    const db = (drizzleDb as unknown as { $client: Database }).$client;
    
    const id = `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    db.prepare(`
      INSERT INTO todos (id, title, description, category, priority, assigned_to, assigned_to_name, due_date, created_at, is_completed, is_recurring, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.title,
      body.description || null,
      body.category || 'work',
      body.priority || 'medium',
      body.assignedTo || null,
      body.assignedToName || null,
      body.dueDate || new Date().toISOString(),
      new Date().toISOString(),
      0,
      body.isRecurring ? 1 : 0,
      body.source || 'manual'
    );
    
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
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
  }
  
  try {
    const body = await request.json();
    const drizzleDb = getDb();
    const db = (drizzleDb as unknown as { $client: Database }).$client;
    
    // Construction dynamique de la requête
    const updates: string[] = [];
    const values: unknown[] = [];
    
    if (body.title !== undefined) { updates.push('title = ?'); values.push(body.title); }
    if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
    if (body.priority !== undefined) { updates.push('priority = ?'); values.push(body.priority); }
    if (body.assignedTo !== undefined) { updates.push('assigned_to = ?'); values.push(body.assignedTo); }
    if (body.assignedToName !== undefined) { updates.push('assigned_to_name = ?'); values.push(body.assignedToName); }
    if (body.dueDate !== undefined) { updates.push('due_date = ?'); values.push(body.dueDate); }
    if (body.isCompleted !== undefined) { updates.push('is_completed = ?'); values.push(body.isCompleted ? 1 : 0); }
    if (body.completedAt !== undefined) { updates.push('completed_at = ?'); values.push(body.completedAt); }
    
    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }
    
    values.push(id);
    
    db.prepare(`UPDATE todos SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[API] Error updating todo:', error);
    return NextResponse.json({ success: false, error: 'Failed to update todo' }, { status: 500 });
  }
}

// DELETE /api/todos?id=todo_id
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
  }
  
  try {
    const drizzleDb = getDb();
    const db = (drizzleDb as unknown as { $client: Database }).$client;
    
    db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[API] Error deleting todo:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete todo' }, { status: 500 });
  }
}
