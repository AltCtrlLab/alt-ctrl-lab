export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

/**
 * Branded PDF/HTML Document Generator
 *
 * POST /api/documents/generate-pdf
 * Body: { type: 'proposal'|'invoice'|'audit-report'|'contract'|'welcome-pack', data: {...}, clientBrand?: {...} }
 *
 * GET /api/documents/generate-pdf?type=proposal&id=xxx
 * Returns the generated HTML document
 *
 * Templates use AltCtrl.Lab branding by default, or client brand_kit if provided.
 */

interface BrandConfig {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
}

const DEFAULT_BRAND: BrandConfig = {
  companyName: 'AltCtrl.Lab',
  logoUrl: null,
  primaryColor: '#d946ef',
  secondaryColor: '#6366f1',
  accentColor: '#f59e0b',
  fontHeading: 'Inter',
  fontBody: 'Inter',
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── POST: Generate document ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, clientBrand } = body as {
      type: string;
      data: Record<string, unknown>;
      clientBrand?: Partial<BrandConfig>;
    };

    if (!type || !data) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
    }

    const validTypes = ['proposal', 'invoice', 'audit-report', 'contract', 'welcome-pack'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be: ${validTypes.join(', ')}` }, { status: 400 });
    }

    const brand: BrandConfig = { ...DEFAULT_BRAND, ...clientBrand };
    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureDocTables(rawDb);

    const now = Date.now();
    const id = `doc_${now}_${Math.random().toString(36).substr(2, 9)}`;

    let html: string;
    switch (type) {
      case 'proposal':
        html = generateProposal(data, brand);
        break;
      case 'invoice':
        html = generateInvoice(data, brand);
        break;
      case 'audit-report':
        html = generateAuditReport(data, brand);
        break;
      case 'contract':
        html = await generateContract(data, brand);
        break;
      case 'welcome-pack':
        html = generateWelcomePack(data, brand);
        break;
      default:
        html = '';
    }

    // Save to DB
    rawDb.prepare(`
      INSERT INTO document_templates (id, type, name, html_template, variables_schema, client_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, type,
      (data.title as string) || `${type} — ${brand.companyName}`,
      html,
      JSON.stringify(Object.keys(data)),
      (data.clientId as string) || null,
      now, now,
    );

    logger.info('documents', `Generated ${type} document`, { id });

    return NextResponse.json({
      success: true,
      id,
      type,
      html,
      downloadUrl: `/api/documents/generate-pdf?id=${id}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('documents', 'Generate failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── GET: Retrieve document ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureDocTables(rawDb);

  const doc = rawDb.prepare('SELECT * FROM document_templates WHERE id = ?').get(id) as {
    id: string; type: string; name: string; html_template: string;
  } | undefined;

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Return as HTML for browser rendering / print-to-PDF
  return new NextResponse(doc.html_template, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${doc.name}.html"`,
    },
  });
}

// ─── DB setup ───────────────────────────────────────────────────────────────

let _docTablesCreated = false;
function ensureDocTables(rawDb: import('better-sqlite3').Database) {
  if (_docTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS document_templates (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      html_template TEXT NOT NULL,
      variables_schema TEXT,
      client_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_doctpl_type ON document_templates(type);
  `);
  _docTablesCreated = true;
}

// ─── Base HTML wrapper ──────────────────────────────────────────────────────

function wrapHtml(title: string, brand: BrandConfig, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=${brand.fontHeading}:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: '${brand.fontBody}', system-ui, sans-serif; color: #18181b; line-height: 1.6; }
    .page { max-width: 800px; margin: 0 auto; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 24px; border-bottom: 3px solid ${brand.primaryColor}; margin-bottom: 32px; }
    .logo { font-size: 28px; font-weight: 700; color: ${brand.primaryColor}; letter-spacing: -0.5px; }
    .logo-img { height: 40px; }
    .meta { text-align: right; color: #71717a; font-size: 13px; }
    .meta strong { color: #18181b; }
    h1 { font-family: '${brand.fontHeading}', system-ui, sans-serif; font-size: 28px; font-weight: 700; color: #18181b; margin-bottom: 8px; }
    h2 { font-family: '${brand.fontHeading}', system-ui, sans-serif; font-size: 20px; font-weight: 600; color: ${brand.secondaryColor}; margin: 28px 0 12px; }
    h3 { font-size: 16px; font-weight: 600; margin: 20px 0 8px; }
    p { margin-bottom: 12px; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin: 24px 0; }
    .kpi { background: linear-gradient(135deg, ${brand.primaryColor}11, ${brand.secondaryColor}11); border: 1px solid ${brand.primaryColor}33; border-radius: 12px; padding: 20px; text-align: center; }
    .kpi-value { font-size: 28px; font-weight: 700; color: ${brand.primaryColor}; }
    .kpi-label { font-size: 12px; color: #71717a; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: ${brand.primaryColor}; color: white; padding: 12px 16px; text-align: left; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 12px 16px; border-bottom: 1px solid #e4e4e7; font-size: 14px; }
    tr:nth-child(even) td { background: #fafafa; }
    .total-row td { font-weight: 700; background: ${brand.primaryColor}08 !important; border-top: 2px solid ${brand.primaryColor}; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-primary { background: ${brand.primaryColor}22; color: ${brand.primaryColor}; }
    .badge-success { background: #10b98122; color: #059669; }
    .cta { display: inline-block; background: ${brand.primaryColor}; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e4e4e7; color: #a1a1aa; font-size: 11px; text-align: center; }
    .signature-block { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .signature-line { border-top: 1px solid #71717a; padding-top: 8px; margin-top: 48px; font-size: 13px; color: #71717a; }
    @media print { .page { padding: 24px; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      ${brand.logoUrl ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.companyName)}" class="logo-img">` : `<div class="logo">${escapeHtml(brand.companyName)}</div>`}
      <div class="meta">
        <div><strong>${escapeHtml(brand.companyName)}</strong></div>
        <div>${new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
    </div>
    ${bodyContent}
    <div class="footer">
      ${escapeHtml(brand.companyName)} &mdash; Document confidentiel<br>
      Genere le ${new Date().toLocaleDateString('fr-FR')}
    </div>
  </div>
</body>
</html>`;
}

// ─── Template: Proposal ─────────────────────────────────────────────────────

function generateProposal(data: Record<string, unknown>, brand: BrandConfig): string {
  const clientName = escapeHtml((data.clientName as string) || 'Client');
  const projectType = escapeHtml((data.projectType as string) || 'Projet Digital');
  const budget = (data.budget as number) || 0;
  const timeline = escapeHtml((data.timeline as string) || '4-6 semaines');
  const description = escapeHtml((data.description as string) || '');
  const phases = (data.phases as Array<{ name: string; duration: string; price: number }>) || [];
  const deliverables = (data.deliverables as string[]) || [];

  const phasesHtml = phases.length > 0 ? `
    <h2>Phases du projet</h2>
    <table>
      <thead><tr><th>Phase</th><th>Duree</th><th>Montant</th></tr></thead>
      <tbody>
        ${phases.map(p => `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.duration)}</td><td>${p.price.toLocaleString('fr-FR')} &euro;</td></tr>`).join('')}
        <tr class="total-row"><td colspan="2">Total</td><td>${phases.reduce((s, p) => s + p.price, 0).toLocaleString('fr-FR')} &euro;</td></tr>
      </tbody>
    </table>` : '';

  const deliverablesHtml = deliverables.length > 0 ? `
    <h2>Livrables</h2>
    <ul>${deliverables.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul>` : '';

  return wrapHtml(`Proposition — ${clientName}`, brand, `
    <h1>Proposition Commerciale</h1>
    <p style="font-size: 18px; color: #71717a;">${projectType} pour ${clientName}</p>

    <div class="kpis">
      <div class="kpi"><div class="kpi-value">${budget.toLocaleString('fr-FR')}&euro;</div><div class="kpi-label">Budget total</div></div>
      <div class="kpi"><div class="kpi-value">${timeline}</div><div class="kpi-label">Delai</div></div>
      <div class="kpi"><div class="kpi-value">${phases.length || '—'}</div><div class="kpi-label">Phases</div></div>
      <div class="kpi"><div class="kpi-value">${deliverables.length || '—'}</div><div class="kpi-label">Livrables</div></div>
    </div>

    ${description ? `<h2>Description du projet</h2><p>${description.replace(/\n/g, '<br>')}</p>` : ''}
    ${phasesHtml}
    ${deliverablesHtml}

    <div class="signature-block">
      <div>
        <h3>${escapeHtml(brand.companyName)}</h3>
        <div class="signature-line">Signature</div>
      </div>
      <div>
        <h3>${clientName}</h3>
        <div class="signature-line">Signature</div>
      </div>
    </div>
  `);
}

// ─── Template: Invoice ──────────────────────────────────────────────────────

function generateInvoice(data: Record<string, unknown>, brand: BrandConfig): string {
  const clientName = escapeHtml((data.clientName as string) || 'Client');
  const invoiceNumber = escapeHtml((data.invoiceNumber as string) || `F-${Date.now()}`);
  const dueDate = escapeHtml((data.dueDate as string) || '');
  const items = (data.items as Array<{ description: string; quantity: number; unitPrice: number }>) || [];
  const notes = escapeHtml((data.notes as string) || '');
  const taxRate = (data.taxRate as number) || 20;

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  return wrapHtml(`Facture ${invoiceNumber}`, brand, `
    <div style="display: flex; justify-content: space-between; align-items: start;">
      <div>
        <h1>Facture</h1>
        <p style="color: #71717a;">${invoiceNumber}</p>
      </div>
      <div style="text-align: right;">
        <p><strong>Client :</strong> ${clientName}</p>
        ${dueDate ? `<p><strong>Echeance :</strong> ${dueDate}</p>` : ''}
        <span class="badge badge-primary">A regler</span>
      </div>
    </div>

    <table style="margin-top: 32px;">
      <thead><tr><th>Description</th><th style="text-align: center;">Qte</th><th style="text-align: right;">P.U.</th><th style="text-align: right;">Total</th></tr></thead>
      <tbody>
        ${items.map(i => `<tr>
          <td>${escapeHtml(i.description)}</td>
          <td style="text-align: center;">${i.quantity}</td>
          <td style="text-align: right;">${i.unitPrice.toLocaleString('fr-FR')} &euro;</td>
          <td style="text-align: right;">${(i.quantity * i.unitPrice).toLocaleString('fr-FR')} &euro;</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
      <table style="width: 280px;">
        <tr><td>Sous-total HT</td><td style="text-align: right; font-weight: 600;">${subtotal.toLocaleString('fr-FR')} &euro;</td></tr>
        <tr><td>TVA (${taxRate}%)</td><td style="text-align: right;">${tax.toLocaleString('fr-FR')} &euro;</td></tr>
        <tr class="total-row"><td>Total TTC</td><td style="text-align: right; font-size: 18px;">${total.toLocaleString('fr-FR')} &euro;</td></tr>
      </table>
    </div>

    ${notes ? `<p style="margin-top: 32px; color: #71717a; font-size: 13px;">${notes.replace(/\n/g, '<br>')}</p>` : ''}
  `);
}

// ─── Template: Audit Report ─────────────────────────────────────────────────

function generateAuditReport(data: Record<string, unknown>, brand: BrandConfig): string {
  const clientName = escapeHtml((data.clientName as string) || 'Client');
  const url = escapeHtml((data.url as string) || '');
  const scores = (data.scores as Record<string, number>) || {};
  const recommendations = (data.recommendations as string[]) || [];
  const summary = escapeHtml((data.summary as string) || '');

  return wrapHtml(`Audit — ${clientName}`, brand, `
    <h1>Rapport d'Audit Digital</h1>
    <p style="font-size: 16px; color: #71717a;">${clientName}${url ? ` — ${url}` : ''}</p>

    <div class="kpis">
      ${Object.entries(scores).map(([label, score]) => `
        <div class="kpi">
          <div class="kpi-value" style="color: ${score >= 80 ? '#059669' : score >= 50 ? '#f59e0b' : '#ef4444'};">${score}/100</div>
          <div class="kpi-label">${escapeHtml(label)}</div>
        </div>
      `).join('')}
    </div>

    ${summary ? `<h2>Resume</h2><p>${summary.replace(/\n/g, '<br>')}</p>` : ''}

    ${recommendations.length > 0 ? `
      <h2>Recommandations</h2>
      <table>
        <thead><tr><th>#</th><th>Recommandation</th></tr></thead>
        <tbody>
          ${recommendations.map((r, i) => `<tr><td style="width: 40px; text-align: center; font-weight: 700;">${i + 1}</td><td>${escapeHtml(r)}</td></tr>`).join('')}
        </tbody>
      </table>
    ` : ''}
  `);
}

// ─── Template: Contract ─────────────────────────────────────────────────────

async function generateContract(data: Record<string, unknown>, brand: BrandConfig): Promise<string> {
  const clientName = escapeHtml((data.clientName as string) || 'Client');
  const contractType = (data.contractType as string) || 'prestation';
  const amount = (data.amount as number) || 0;
  const duration = escapeHtml((data.duration as string) || '');
  const scope = escapeHtml((data.scope as string) || '');

  // Try to generate clauses with Kimi
  let clauses = '';
  if (KIMI_API_KEY && scope) {
    try {
      const prompt = `Genere les clauses principales d'un contrat de ${contractType} entre une agence digitale (${brand.companyName}) et un client (${clientName}).
Montant: ${amount}EUR. Duree: ${duration}. Scope: ${scope}.
Genere 6-8 articles (Article 1: Objet, Article 2: Duree, Article 3: Prix, Article 4: Livrables, Article 5: Propriete intellectuelle, Article 6: Confidentialite, Article 7: Resiliation, Article 8: Loi applicable).
Format: retourne uniquement les articles en HTML (<h3> pour le titre, <p> pour le contenu). Sois concis et professionnel.`;

      const res = await fetch(KIMI_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
        body: JSON.stringify({ model: 'kimi-k2.5', messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 2000 }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const result = await res.json();
        clauses = result.choices?.[0]?.message?.content || '';
        // Clean markdown code blocks if any
        clauses = clauses.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      }
    } catch { /* fallback below */ }
  }

  // Fallback static clauses
  if (!clauses) {
    clauses = `
      <h3>Article 1 — Objet</h3>
      <p>Le present contrat a pour objet la realisation par ${escapeHtml(brand.companyName)} d'une prestation de ${contractType} au benefice de ${clientName}.</p>
      ${scope ? `<p>Perimetre : ${scope}</p>` : ''}

      <h3>Article 2 — Duree</h3>
      <p>Le contrat est conclu pour une duree de ${duration || 'a definir'}, a compter de sa signature par les deux parties.</p>

      <h3>Article 3 — Prix et conditions de paiement</h3>
      <p>Le montant total de la prestation est fixe a <strong>${amount.toLocaleString('fr-FR')} EUR HT</strong>. Le paiement s'effectue selon l'echeancier suivant : 30% a la signature, 40% a mi-parcours, 30% a la livraison.</p>

      <h3>Article 4 — Propriete intellectuelle</h3>
      <p>L'ensemble des livrables deviennent la propriete du client apres paiement integral. ${escapeHtml(brand.companyName)} conserve le droit d'utiliser le projet a des fins de reference.</p>

      <h3>Article 5 — Confidentialite</h3>
      <p>Les parties s'engagent a ne pas divulguer les informations confidentielles echangees dans le cadre de ce contrat.</p>

      <h3>Article 6 — Resiliation</h3>
      <p>Chaque partie peut resilier le contrat avec un preavis de 30 jours. En cas de resiliation, les travaux realises restent dus.</p>
    `;
  }

  return wrapHtml(`Contrat — ${clientName}`, brand, `
    <h1 style="text-align: center;">Contrat de ${escapeHtml(contractType)}</h1>
    <p style="text-align: center; color: #71717a; margin-bottom: 32px;">
      Entre ${escapeHtml(brand.companyName)} (ci-apres "le Prestataire")<br>
      et ${clientName} (ci-apres "le Client")
    </p>

    ${clauses}

    <div class="signature-block" style="margin-top: 64px;">
      <div>
        <h3>Le Prestataire</h3>
        <p>${escapeHtml(brand.companyName)}</p>
        <div class="signature-line">Date et signature</div>
      </div>
      <div>
        <h3>Le Client</h3>
        <p>${clientName}</p>
        <div class="signature-line">Date et signature</div>
      </div>
    </div>
  `);
}

// ─── Template: Welcome Pack ─────────────────────────────────────────────────

function generateWelcomePack(data: Record<string, unknown>, brand: BrandConfig): string {
  const clientName = escapeHtml((data.clientName as string) || 'Client');
  const projectType = escapeHtml((data.projectType as string) || 'Projet Digital');
  const kickoffDate = escapeHtml((data.kickoffDate as string) || '');
  const teamMembers = (data.teamMembers as Array<{ name: string; role: string }>) || [];
  const tools = (data.tools as string[]) || [];
  const nextSteps = (data.nextSteps as string[]) || [];
  const portalUrl = escapeHtml((data.portalUrl as string) || '');

  return wrapHtml(`Welcome Pack — ${clientName}`, brand, `
    <h1 style="text-align: center; margin-bottom: 4px;">Bienvenue ${clientName} !</h1>
    <p style="text-align: center; color: #71717a; font-size: 18px; margin-bottom: 32px;">${projectType}</p>

    <div class="kpis">
      <div class="kpi"><div class="kpi-value" style="font-size: 18px;">${projectType}</div><div class="kpi-label">Projet</div></div>
      ${kickoffDate ? `<div class="kpi"><div class="kpi-value" style="font-size: 18px;">${kickoffDate}</div><div class="kpi-label">Kickoff</div></div>` : ''}
      <div class="kpi"><div class="kpi-value">${teamMembers.length || 1}</div><div class="kpi-label">Equipe</div></div>
    </div>

    ${teamMembers.length > 0 ? `
      <h2>Votre equipe</h2>
      <table>
        <thead><tr><th>Nom</th><th>Role</th></tr></thead>
        <tbody>${teamMembers.map(m => `<tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.role)}</td></tr>`).join('')}</tbody>
      </table>
    ` : ''}

    ${tools.length > 0 ? `
      <h2>Outils et acces</h2>
      <ul>${tools.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
    ` : ''}

    ${nextSteps.length > 0 ? `
      <h2>Prochaines etapes</h2>
      <ol>${nextSteps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
    ` : ''}

    ${portalUrl ? `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${portalUrl}" class="cta">Acceder au portail client</a>
      </div>
    ` : ''}

    <div style="background: ${brand.primaryColor}08; border-left: 4px solid ${brand.primaryColor}; padding: 20px; border-radius: 0 8px 8px 0; margin-top: 32px;">
      <p style="margin: 0;"><strong>Un doute ou une question ?</strong> Repondez directement a cet email ou contactez votre chef de projet. Nous sommes la pour vous.</p>
    </div>
  `);
}
