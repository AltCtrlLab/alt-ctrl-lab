export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getProjects, getTimeEntriesForProject } from '@/lib/db';
import { AGENT_CAPACITY, LOAD_THRESHOLDS } from '@/lib/constants/planning';
import { AGENTS } from '@/lib/constants/agents';
import { logger } from '@/lib/logger';

interface AgentLoad {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  projects: Array<{ id: string; clientName: string; projectType: string; phase: string }>;
  hoursLogged: number;
  hoursEstimated: number;
  weeklyCapacity: number;
  loadPercent: number;
  dailyHours: Record<string, number>; // "2026-03-23" -> 5.5
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req.ip ?? 'anon', 'default');
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  try {
    const weekStartParam = req.nextUrl.searchParams.get('weekStart');
    const weekStart = weekStartParam ? new Date(weekStartParam).getTime() : getMonday(Date.now());
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;

    // Get all active projects
    const allProjects = await getProjects('Actif');

    // Build agent-to-project mapping
    const agentMap = new Map<string, AgentLoad>();

    for (const agent of AGENTS) {
      if (agent.type === 'supervisor') continue;
      agentMap.set(agent.id, {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        emoji: agent.emoji,
        color: agent.color,
        projects: [],
        hoursLogged: 0,
        hoursEstimated: 0,
        weeklyCapacity: AGENT_CAPACITY[agent.id] ?? 40,
        loadPercent: 0,
        dailyHours: {},
      });
    }

    // Assign projects to agents and calculate hours
    for (const project of allProjects) {
      let assignedAgents: string[] = [];
      try {
        assignedAgents = project.teamAgents ? JSON.parse(project.teamAgents) : [];
      } catch (parseErr) {
        logger.warn(`[planning] Failed to parse teamAgents for project ${project.id}: ${parseErr instanceof Error ? parseErr.message : parseErr}`);
      }

      const timeEntries = await getTimeEntriesForProject(project.id);

      for (const agentId of assignedAgents) {
        const agentData = agentMap.get(agentId);
        if (!agentData) continue;

        agentData.projects.push({
          id: project.id,
          clientName: project.clientName,
          projectType: project.projectType,
          phase: project.phase,
        });

        // Sum hours for this week
        for (const entry of timeEntries) {
          if (entry.date >= weekStart && entry.date < weekEnd) {
            agentData.hoursLogged += entry.hours;
            const dayKey = new Date(entry.date).toISOString().slice(0, 10);
            agentData.dailyHours[dayKey] = (agentData.dailyHours[dayKey] ?? 0) + entry.hours;
          }
        }

        // Estimate remaining hours for this project spread across agents
        const remainingHours = Math.max(0, (project.hoursEstimated ?? 0) - (project.hoursActual ?? 0));
        const weeksToDeadline = project.deadline
          ? Math.max(1, (project.deadline - Date.now()) / (7 * 24 * 60 * 60 * 1000))
          : 4; // default 4 weeks if no deadline
        const weeklyEstimate = remainingHours / weeksToDeadline / Math.max(1, assignedAgents.length);
        agentData.hoursEstimated += weeklyEstimate;
      }
    }

    // Calculate load percentages
    const agents: AgentLoad[] = [];
    for (const agentData of agentMap.values()) {
      const totalHours = agentData.hoursLogged + agentData.hoursEstimated;
      agentData.loadPercent = agentData.weeklyCapacity > 0 ? Math.round((totalHours / agentData.weeklyCapacity) * 100) : 0;
      agents.push(agentData);
    }

    // Sort by load descending
    agents.sort((a, b) => b.loadPercent - a.loadPercent);

    const totalCapacity = agents.reduce((sum, a) => sum + a.weeklyCapacity, 0);
    const totalUsed = agents.reduce((sum, a) => sum + a.hoursLogged + a.hoursEstimated, 0);
    const canTakeNew = agents.some(a => a.loadPercent < LOAD_THRESHOLDS.green);

    return NextResponse.json({
      success: true,
      weekStart,
      weekEnd,
      agents,
      summary: {
        totalCapacity,
        totalUsed: Math.round(totalUsed * 10) / 10,
        overallLoadPercent: totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0,
        canTakeNew,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal error', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

function getMonday(timestamp: number): number {
  const d = new Date(timestamp);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
