export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * Resource Capacity Planner
 *
 * GET /api/analytics/capacity — View capacity per week, load analysis, alerts
 *
 * Aggregates: active projects × estimated hours, deadlines, pipeline leads
 * Capacity: default 40h/week per person, configurable
 */

// ─── GET: Capacity overview ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureCapacityConfig(rawDb);

  const weeksParam = request.nextUrl.searchParams.get('weeks');
  const weeks = Math.min(12, Math.max(1, parseInt(weeksParam || '8', 10)));

  // Get capacity config
  const config = rawDb.prepare('SELECT * FROM capacity_config ORDER BY id LIMIT 1').get() as CapacityConfig | undefined;
  const teamSize = config?.team_size || 3;
  const hoursPerWeek = config?.hours_per_week || 40;
  const totalCapacity = teamSize * hoursPerWeek;

  // Get active projects with estimated hours
  const activeProjects = rawDb.prepare(`
    SELECT id, name, client, phase, budget,
           CAST(COALESCE(JSON_EXTRACT(timeline, '$.estimated_hours'), 0) AS INTEGER) as estimated_hours,
           CAST(COALESCE(JSON_EXTRACT(timeline, '$.deadline'), 0) AS INTEGER) as deadline
    FROM projects
    WHERE phase NOT IN ('Livre', 'Annule', 'Archive')
    ORDER BY deadline ASC
  `).all() as ProjectRow[];

  // Get pipeline leads (future load estimation)
  const pipelineLeads = rawDb.prepare(`
    SELECT id, name, company, budget, status
    FROM leads
    WHERE status IN ('Proposition', 'Negociation')
  `).all() as LeadRow[];

  // Build weekly breakdown
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weeklyLoad: WeekLoad[] = [];

  for (let w = 0; w < weeks; w++) {
    const weekStart = now + w * weekMs;
    const weekEnd = weekStart + weekMs;
    const weekLabel = new Date(weekStart).toISOString().slice(0, 10);

    // Projects with deadlines in or after this week contribute load
    let projectHours = 0;
    const projectsThisWeek: string[] = [];

    for (const proj of activeProjects) {
      const deadline = proj.deadline || 0;
      const hours = proj.estimated_hours || estimateHoursFromBudget(proj.budget);

      // If project is active and deadline >= this week, distribute hours
      if (deadline === 0 || deadline >= weekStart) {
        const weeksRemaining = deadline > 0 ? Math.max(1, Math.ceil((deadline - weekStart) / weekMs)) : 4;
        const hoursThisWeek = Math.round(hours / weeksRemaining);
        projectHours += hoursThisWeek;
        projectsThisWeek.push(proj.name);
      }
    }

    // Pipeline load estimation (30% probability)
    let pipelineHours = 0;
    if (w >= 2) { // Pipeline projects likely start in 2+ weeks
      for (const lead of pipelineLeads) {
        const estimatedHours = estimateHoursFromBudget(lead.budget);
        pipelineHours += Math.round(estimatedHours * 0.3 / Math.max(4, weeks - w));
      }
    }

    const totalLoad = projectHours + pipelineHours;
    const utilization = totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0;

    weeklyLoad.push({
      week: weekLabel,
      weekNumber: w + 1,
      projectHours,
      pipelineHours,
      totalLoad,
      capacity: totalCapacity,
      utilization,
      status: utilization > 120 ? 'overloaded' : utilization > 90 ? 'high' : utilization > 60 ? 'optimal' : 'available',
      projects: projectsThisWeek,
    });
  }

  // Deadlines this week / next week
  const upcomingDeadlines = activeProjects
    .filter(p => p.deadline > 0 && p.deadline >= now && p.deadline <= now + 2 * weekMs)
    .map(p => ({
      projectId: p.id,
      name: p.name,
      client: p.client,
      deadline: p.deadline,
      daysRemaining: Math.ceil((p.deadline - now) / (24 * 60 * 60 * 1000)),
    }));

  // Alerts
  const alerts: string[] = [];
  const overloadedWeeks = weeklyLoad.filter(w => w.status === 'overloaded');
  if (overloadedWeeks.length > 0) {
    alerts.push(`${overloadedWeeks.length} semaine(s) en surcharge (>120% capacite)`);
  }
  if (upcomingDeadlines.some(d => d.daysRemaining <= 3)) {
    alerts.push('Deadlines critiques dans les 3 prochains jours');
  }
  const avgUtilization = weeklyLoad.reduce((s, w) => s + w.utilization, 0) / weeklyLoad.length;
  if (avgUtilization < 40) {
    alerts.push('Sous-utilisation moyenne — capacite disponible pour de nouveaux projets');
  }

  // Summary
  const summary = {
    teamSize,
    hoursPerWeek,
    totalWeeklyCapacity: totalCapacity,
    activeProjectsCount: activeProjects.length,
    pipelineCount: pipelineLeads.length,
    averageUtilization: Math.round(avgUtilization),
    peakUtilization: Math.max(...weeklyLoad.map(w => w.utilization)),
    overloadedWeeks: overloadedWeeks.length,
    upcomingDeadlines: upcomingDeadlines.length,
  };

  return NextResponse.json({
    success: true,
    data: { summary, weeklyLoad, upcomingDeadlines, alerts, activeProjects: activeProjects.length, pipelineLeads: pipelineLeads.length },
  });
}

// ─── PATCH: Update capacity config ──────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamSize, hoursPerWeek } = body as { teamSize?: number; hoursPerWeek?: number };

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureCapacityConfig(rawDb);
    const now = Date.now();

    const existing = rawDb.prepare('SELECT id FROM capacity_config LIMIT 1').get() as { id: string } | undefined;

    if (existing) {
      const fields: string[] = [];
      const values: unknown[] = [];
      if (teamSize !== undefined) { fields.push('team_size = ?'); values.push(teamSize); }
      if (hoursPerWeek !== undefined) { fields.push('hours_per_week = ?'); values.push(hoursPerWeek); }
      if (fields.length > 0) {
        fields.push('updated_at = ?');
        values.push(now, existing.id);
        rawDb.prepare(`UPDATE capacity_config SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      }
    } else {
      rawDb.prepare(`
        INSERT INTO capacity_config (id, team_size, hours_per_week, created_at, updated_at)
        VALUES ('cap_default', ?, ?, ?, ?)
      `).run(teamSize || 3, hoursPerWeek || 40, now, now);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function estimateHoursFromBudget(budget: string | null): number {
  if (!budget) return 20;
  const amount = parseInt(budget.replace(/[^0-9]/g, ''), 10);
  if (isNaN(amount) || amount === 0) return 20;
  // Rough estimate: 80€/h average rate
  return Math.round(amount / 80);
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProjectRow {
  id: string;
  name: string;
  client: string;
  phase: string;
  budget: string | null;
  estimated_hours: number;
  deadline: number;
}

interface LeadRow {
  id: string;
  name: string;
  company: string;
  budget: string | null;
  status: string;
}

interface WeekLoad {
  week: string;
  weekNumber: number;
  projectHours: number;
  pipelineHours: number;
  totalLoad: number;
  capacity: number;
  utilization: number;
  status: string;
  projects: string[];
}

interface CapacityConfig {
  id: string;
  team_size: number;
  hours_per_week: number;
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _capConfigCreated = false;
function ensureCapacityConfig(rawDb: import('better-sqlite3').Database) {
  if (_capConfigCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS capacity_config (
      id TEXT PRIMARY KEY,
      team_size INTEGER DEFAULT 3,
      hours_per_week INTEGER DEFAULT 40,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  _capConfigCreated = true;
}
