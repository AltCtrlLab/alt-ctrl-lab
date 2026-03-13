/**
 * GET /api/deliverable/[taskId]
 *
 * Génère un livrable téléchargeable depuis une tâche complétée.
 * Format: HTML auto-contenu (imprimable en PDF via Ctrl+P)
 *
 * Query params:
 *   ?format=html (défaut) | md | json
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTask } from '@/lib/db';

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractClientName(brief: string): string {
  const match = brief.match(/(?:pour|for|client[:\s]+|projet[:\s]+|brand[:\s]+|marque[:\s]+)([A-ZÀ-Ú][a-zA-ZÀ-ú\s&.'-]{1,40})/i);
  if (match) return match[1].trim();
  // Prend les 4 premiers mots du brief
  return brief.split(/\s+/).slice(0, 4).join(' ');
}

function parseBrief(prompt: string) {
  const dirMatch = prompt.match(/Director:\s*(\w+)/i);
  const execMatch = prompt.match(/Executor:\s*(\w+)/i);
  const briefMatch = prompt.match(/Brief:\s*\n([\s\S]*)/i);
  return {
    director: dirMatch?.[1] || '',
    executor: execMatch?.[1] || '',
    brief: briefMatch?.[1]?.trim() || prompt,
  };
}

function detectService(director: string, executor: string): {
  id: string; label: string; emoji: string; color: string;
} {
  const map: Record<string, { id: string; label: string; emoji: string; color: string }> = {
    musawwir: { id: 'branding',   label: 'Branding & Identité Visuelle', emoji: '🎨', color: '#EC4899' },
    matin:    { id: 'web_dev',    label: 'Développement Web',            emoji: '💻', color: '#6366F1' },
    fatah:    { id: 'marketing',  label: 'Stratégie Marketing',          emoji: '📣', color: '#F59E0B' },
    hasib:    { id: 'data',       label: 'Automatisation & Data',        emoji: '🤖', color: '#10B981' },
  };
  return map[director] ?? { id: 'agency', label: 'Mission Agence', emoji: '⭐', color: '#8B5CF6' };
}

/** Convertit le markdown basique en HTML */
function mdToHtml(md: string): string {
  return md
    // Titres
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Gras + italique
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code inline
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Listes
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Séparateurs
    .replace(/^---+$/gm, '<hr>')
    // Paragraphes (double newline)
    .split(/\n\n+/)
    .map(block => {
      if (block.match(/^<(h[1-4]|li|hr|ul|ol)/)) return block;
      if (block.includes('<li>')) return `<ul>${block}</ul>`;
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}

// ─── Templates HTML ──────────────────────────────────────────────────────────

const SERVICE_SECTIONS: Record<string, string[]> = {
  branding:  ['Positionnement de Marque', 'Identité Visuelle', 'Palette Chromatique', 'Typographie', 'Voix & Ton', 'Recommandations Stratégiques'],
  web_dev:   ['Architecture Technique', 'Spécifications Fonctionnelles', 'Stack Technologique', 'Livrables Code', 'Plan de Déploiement'],
  marketing: ['Analyse de Marché', 'Audience Cible', 'Stratégie de Contenu', 'Canaux & Budget', 'KPIs & Objectifs'],
  data:      ['Besoins & Objectifs', 'Architecture des Données', 'Workflows Automatisés', 'Intégrations', 'Documentation Technique'],
  agency:    ['Synthèse Stratégique', 'Recommandations', 'Plan d\'Action', 'Prochaines Étapes'],
};

function buildHtmlDeliverable(task: any): string {
  const { director, executor, brief } = parseBrief(task.prompt);
  const service = detectService(director, executor);
  const clientName = extractClientName(brief);
  const date = new Date(task.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const duration = Math.round((task.updatedAt - task.createdAt) / 60000);
  const resultHtml = mdToHtml(task.result || 'Aucun contenu disponible.');
  const sections = SERVICE_SECTIONS[service.id] || SERVICE_SECTIONS.agency;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Livrable — ${clientName} — Alt Ctrl Lab</title>
  <style>
    /* ── Reset & Base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 16px; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a2e;
      background: #ffffff;
      line-height: 1.7;
    }

    /* ── Print ── */
    @media print {
      .no-print { display: none !important; }
      body { font-size: 11pt; }
      .page-break { page-break-before: always; }
      header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }

    /* ── Cover ── */
    .cover {
      background: linear-gradient(135deg, #0f0f1a 0%, #1a0533 50%, #0f0f1a 100%);
      color: #ffffff;
      padding: 80px 60px;
      min-height: 320px;
      position: relative;
      overflow: hidden;
    }
    .cover::before {
      content: '';
      position: absolute;
      top: -100px; right: -100px;
      width: 400px; height: 400px;
      background: radial-gradient(circle, ${service.color}30 0%, transparent 70%);
      pointer-events: none;
    }
    .cover-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: ${service.color}22;
      border: 1px solid ${service.color}55;
      color: ${service.color};
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    .cover-title {
      font-size: 42px;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 12px;
      letter-spacing: -0.02em;
    }
    .cover-subtitle {
      font-size: 16px;
      color: rgba(255,255,255,0.55);
      margin-bottom: 40px;
    }
    .cover-meta {
      display: flex;
      gap: 32px;
      border-top: 1px solid rgba(255,255,255,0.1);
      padding-top: 24px;
      margin-top: 24px;
    }
    .cover-meta-item { }
    .cover-meta-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(255,255,255,0.35);
      margin-bottom: 4px;
    }
    .cover-meta-value {
      font-size: 14px;
      font-weight: 600;
      color: rgba(255,255,255,0.85);
    }
    .agency-logo {
      position: absolute;
      top: 40px; right: 60px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.35);
    }

    /* ── Brief Section ── */
    .brief-section {
      background: #f8f8fc;
      border-left: 4px solid ${service.color};
      padding: 32px 40px;
      margin: 0;
    }
    .brief-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: ${service.color};
      margin-bottom: 10px;
    }
    .brief-text {
      font-size: 15px;
      color: #333;
      line-height: 1.8;
      white-space: pre-wrap;
    }

    /* ── Content ── */
    .content {
      max-width: 860px;
      margin: 0 auto;
      padding: 48px 60px;
    }

    /* ── Section TOC ── */
    .toc {
      background: #f8f8fc;
      border: 1px solid #e8e8f0;
      border-radius: 12px;
      padding: 28px 32px;
      margin-bottom: 48px;
    }
    .toc-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #888;
      margin-bottom: 16px;
    }
    .toc-list {
      list-style: none;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
    }
    .toc-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: #555;
    }
    .toc-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: ${service.color};
      color: white;
      border-radius: 50%;
      font-size: 10px;
      font-weight: 700;
      flex-shrink: 0;
    }

    /* ── Deliverable Content ── */
    .deliverable {
      font-size: 15px;
      color: #222;
      line-height: 1.8;
    }
    .deliverable h1 {
      font-size: 28px;
      font-weight: 800;
      color: #0f0f1a;
      margin: 48px 0 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid ${service.color};
      letter-spacing: -0.02em;
    }
    .deliverable h2 {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 36px 0 12px;
    }
    .deliverable h3 {
      font-size: 17px;
      font-weight: 600;
      color: #333;
      margin: 24px 0 8px;
    }
    .deliverable h4 {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${service.color};
      margin: 20px 0 6px;
    }
    .deliverable p {
      margin-bottom: 14px;
    }
    .deliverable ul {
      margin: 12px 0 16px 20px;
    }
    .deliverable li {
      margin-bottom: 8px;
      list-style-type: none;
      padding-left: 20px;
      position: relative;
    }
    .deliverable li::before {
      content: '▸';
      position: absolute;
      left: 0;
      color: ${service.color};
      font-size: 12px;
      top: 3px;
    }
    .deliverable strong { color: #0f0f1a; }
    .deliverable em { color: #555; font-style: italic; }
    .deliverable code {
      background: #f0f0f8;
      border: 1px solid #e0e0f0;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      color: #6366F1;
    }
    .deliverable hr {
      border: none;
      border-top: 1px solid #e8e8f0;
      margin: 32px 0;
    }

    /* ── Team Block ── */
    .team-block {
      background: linear-gradient(135deg, #f8f8fc, #f0f0f8);
      border: 1px solid #e0e0f0;
      border-radius: 12px;
      padding: 28px 32px;
      margin-top: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }
    .team-member {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .team-avatar {
      width: 44px;
      height: 44px;
      background: ${service.color}22;
      border: 1px solid ${service.color}44;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    .team-info-label { font-size: 11px; color: #aaa; text-transform: uppercase; letter-spacing: 0.08em; }
    .team-info-name { font-size: 14px; font-weight: 700; color: #333; text-transform: capitalize; }
    .team-arrow { font-size: 18px; color: #ccc; }

    /* ── Footer ── */
    footer {
      background: #0f0f1a;
      color: rgba(255,255,255,0.35);
      padding: 28px 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
    }
    footer strong { color: rgba(255,255,255,0.6); }

    /* ── Print Button ── */
    .print-btn {
      position: fixed;
      bottom: 32px; right: 32px;
      background: ${service.color};
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 32px ${service.color}66;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 100;
    }
    .print-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px ${service.color}88; }
  </style>
</head>
<body>

  <!-- Cover -->
  <header class="cover">
    <div class="agency-logo">Alt Ctrl Lab ✦</div>
    <div class="cover-badge">${service.emoji} ${service.label}</div>
    <div class="cover-title">${clientName}</div>
    <div class="cover-subtitle">Document de Livraison Officiel — Confidentiel</div>
    <div class="cover-meta">
      <div class="cover-meta-item">
        <div class="cover-meta-label">Date</div>
        <div class="cover-meta-value">${date}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Service</div>
        <div class="cover-meta-value">${service.label}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Durée d'exécution</div>
        <div class="cover-meta-value">${duration} min</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Standard</div>
        <div class="cover-meta-value">Top 1% 🏆</div>
      </div>
    </div>
  </header>

  <!-- Brief -->
  <div class="brief-section">
    <div class="brief-label">Brief Client</div>
    <div class="brief-text">${brief.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  </div>

  <!-- Content -->
  <main class="content">

    <!-- Table des matières -->
    <div class="toc">
      <div class="toc-title">Sommaire</div>
      <ul class="toc-list">
        ${sections.map((s, i) => `<li class="toc-item"><span class="toc-num">${i + 1}</span>${s}</li>`).join('\n        ')}
      </ul>
    </div>

    <!-- Livrable -->
    <div class="deliverable">
      ${resultHtml}
    </div>

    <!-- Équipe -->
    <div class="team-block">
      <div class="team-member">
        <div class="team-avatar">🧠</div>
        <div>
          <div class="team-info-label">Directeur</div>
          <div class="team-info-name">${director}</div>
        </div>
      </div>
      <div class="team-arrow">→</div>
      <div class="team-member">
        <div class="team-avatar">⚙️</div>
        <div>
          <div class="team-info-label">Exécuteur</div>
          <div class="team-info-name">${executor}</div>
        </div>
      </div>
      <div style="margin-left:auto;text-align:right;">
        <div class="team-info-label">Réf. mission</div>
        <div style="font-size:11px;color:#aaa;font-family:monospace;">${task.id}</div>
      </div>
    </div>

  </main>

  <!-- Footer -->
  <footer>
    <span><strong>Alt Ctrl Lab</strong> — Agence IA Autonome</span>
    <span>Document généré le ${new Date().toLocaleDateString('fr-FR')} · Standard Top 1%</span>
    <span>Confidentiel — Usage client exclusif</span>
  </footer>

  <!-- Print Button -->
  <button class="print-btn no-print" onclick="window.print()">
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/>
    </svg>
    Exporter en PDF
  </button>

</body>
</html>`;
}

function buildMarkdownDeliverable(task: any): string {
  const { director, executor, brief } = parseBrief(task.prompt);
  const service = detectService(director, executor);
  const clientName = extractClientName(brief);
  const date = new Date(task.createdAt).toLocaleDateString('fr-FR');

  return `# ${clientName} — ${service.label}
> Livrable Alt Ctrl Lab · ${date} · Standard Top 1%

---

## Brief Client
${brief}

---

## Livrable

${task.result || 'Aucun contenu disponible.'}

---

*Équipe : ${director} (Directeur) → ${executor} (Exécuteur)*
*Réf : ${task.id}*
*Alt Ctrl Lab — Confidentiel*
`;
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const { taskId } = params;
  const format = _req.nextUrl.searchParams.get('format') || 'html';

  const task = await getTask(taskId);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.status !== 'COMPLETED') {
    return NextResponse.json(
      { error: `Task is not completed (status: ${task.status})` },
      { status: 400 }
    );
  }

  const { director, executor, brief } = parseBrief(task.prompt);
  const service = detectService(director, executor);
  const clientSlug = extractClientName(brief).replace(/\s+/g, '-').toLowerCase().slice(0, 30);
  const dateSlug = new Date(task.createdAt).toISOString().split('T')[0];
  const baseName = `altctrl-${service.id}-${clientSlug}-${dateSlug}`;

  if (format === 'md') {
    const content = buildMarkdownDeliverable(task);
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}.md"`,
      },
    });
  }

  if (format === 'json') {
    const payload = {
      meta: {
        agency: 'Alt Ctrl Lab',
        standard: 'Top 1%',
        service: service.label,
        director,
        executor,
        taskId,
        date: new Date(task.createdAt).toISOString(),
        durationMinutes: Math.round((task.updatedAt - task.createdAt) / 60000),
      },
      client: extractClientName(brief),
      brief,
      deliverable: task.result,
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}.json"`,
      },
    });
  }

  // Default: HTML
  const html = buildHtmlDeliverable(task);
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${baseName}.html"`,
    },
  });
}
