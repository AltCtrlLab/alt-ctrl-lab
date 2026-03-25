export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

/**
 * Automated Case Study Generator
 *
 * POST /api/content/case-study — Generate case study from a delivered project
 * Body: { projectId } or { projectId, customContext }
 *
 * GET /api/content/case-study?projectId=xxx — Get existing case study
 */

// ─── POST: Generate case study ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, customContext } = body as { projectId: string; customContext?: string };

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;

    // Gather project data
    const project = rawDb.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Record<string, unknown> | undefined;
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const timeEntries = rawDb.prepare('SELECT COALESCE(SUM(hours), 0) as h FROM time_entries WHERE project_id = ?').get(projectId) as { h: number };
    const invoices = rawDb.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE project_id = ? AND status = 'Payée'").get(projectId) as { total: number };
    const followups = rawDb.prepare('SELECT type, score_nps, notes FROM followups WHERE project_id = ? AND score_nps IS NOT NULL').all(projectId) as Array<{ type: string; score_nps: number; notes: string }>;

    const npsScore = followups.length > 0 ? followups.reduce((s, f) => s + f.score_nps, 0) / followups.length : null;

    // Generate with Kimi
    let caseStudy: CaseStudyContent | null = null;

    if (KIMI_API_KEY) {
      try {
        const prompt = `Genere une case study professionnelle en francais pour une agence digitale. Voici les donnees du projet :

Client : ${project.client_name}
Type : ${project.project_type}
Phase : ${project.phase} | Statut : ${project.status}
Heures : ${timeEntries.h}h | Budget : ${invoices.total}EUR
${npsScore !== null ? `NPS : ${Math.round(npsScore)}/10` : ''}
Brief : ${(project.brief as string) || 'N/A'}
${customContext ? `Contexte additionnel : ${customContext}` : ''}

Reponds UNIQUEMENT en JSON valide avec cette structure :
{
  "title": "Titre accrocheur de la case study",
  "subtitle": "Sous-titre (1 ligne)",
  "challenge": "Le defi du client (2-3 phrases)",
  "approach": "Notre approche et methodologie (3-4 phrases)",
  "solution": "Ce qu'on a livre (3-4 phrases avec details techniques)",
  "results": ["Resultat 1 chiffre", "Resultat 2 chiffre", "Resultat 3 chiffre"],
  "testimonial": "Citation fictive mais realiste du client (1-2 phrases)",
  "tags": ["tag1", "tag2", "tag3"]
}`;

        const res = await fetch(KIMI_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
          body: JSON.stringify({ model: 'kimi-k2.5', messages: [{ role: 'user', content: prompt }], temperature: 0.5, max_tokens: 1500 }),
          signal: AbortSignal.timeout(20000),
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.choices?.[0]?.message?.content || '';
          const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          caseStudy = JSON.parse(cleaned) as CaseStudyContent;
        }
      } catch (err) {
        logger.warn('case-study', `AI generation failed: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }

    // Fallback
    if (!caseStudy) {
      caseStudy = {
        title: `${project.client_name} — ${project.project_type}`,
        subtitle: `Projet ${project.project_type} pour ${project.client_name}`,
        challenge: `${project.client_name} avait besoin d'une solution ${project.project_type} performante et moderne.`,
        approach: `Notre equipe a travaille en methode agile sur ${timeEntries.h} heures pour livrer un produit de qualite.`,
        solution: `Nous avons livre un ${project.project_type} complet en phase ${project.phase}.`,
        results: [`${timeEntries.h}h de developpement`, `Livraison dans les delais`, npsScore ? `NPS ${Math.round(npsScore)}/10` : 'Client satisfait'],
        testimonial: `L'equipe AltCtrl.Lab a su repondre a nos attentes avec professionnalisme.`,
        tags: [(project.project_type as string) || 'Digital'],
      };
    }

    // Save as content_item
    const now = Date.now();
    const id = `cs_${now}_${Math.random().toString(36).substr(2, 9)}`;
    rawDb.prepare(`
      INSERT INTO content_items (id, title, type, status, body, tags, notes, created_at, updated_at)
      VALUES (?, ?, 'case-study', 'Brouillon', ?, ?, ?, ?, ?)
    `).run(
      id,
      caseStudy.title,
      JSON.stringify(caseStudy),
      caseStudy.tags.join(','),
      `Auto-generated from project ${projectId}`,
      now, now,
    );

    logger.info('case-study', 'Generated', { id, projectId });

    return NextResponse.json({ success: true, id, caseStudy });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('case-study', 'Generation failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── GET: Retrieve case study ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  const projectId = request.nextUrl.searchParams.get('projectId');

  if (projectId) {
    const item = rawDb.prepare(
      "SELECT * FROM content_items WHERE type = 'case-study' AND notes LIKE ? ORDER BY created_at DESC LIMIT 1",
    ).get(`%${projectId}%`);
    if (!item) return NextResponse.json({ error: 'No case study for this project' }, { status: 404 });
    return NextResponse.json({ success: true, data: item });
  }

  const items = rawDb.prepare("SELECT id, title, status, tags, created_at FROM content_items WHERE type = 'case-study' ORDER BY created_at DESC").all();
  return NextResponse.json({ success: true, data: items });
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface CaseStudyContent {
  title: string;
  subtitle: string;
  challenge: string;
  approach: string;
  solution: string;
  results: string[];
  testimonial: string;
  tags: string[];
}
