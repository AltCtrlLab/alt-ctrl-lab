export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

/**
 * Contract/NDA Template Engine
 *
 * POST /api/documents/contract — Generate a contract from template + variables
 * GET  /api/documents/contract?type=prestation — List available templates
 * GET  /api/documents/contract?id=xxx — Get specific contract HTML
 *
 * Types: prestation, nda, maintenance, cgv
 */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── POST: Generate contract ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, variables } = body as {
      type: 'prestation' | 'nda' | 'maintenance' | 'cgv';
      variables: Record<string, string | number>;
    };

    if (!type || !variables) {
      return NextResponse.json({ error: 'Missing type or variables' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureContractTables(rawDb);

    // Get base template or generate with AI
    let html: string;
    const template = TEMPLATES[type];

    if (!template) {
      return NextResponse.json({ error: `Unknown type: ${type}. Available: prestation, nda, maintenance, cgv` }, { status: 400 });
    }

    // Replace variables in template
    html = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      html = html.replace(regex, escapeHtml(String(value)));
    }

    // If variables are missing, try AI to fill gaps
    const missingVars = html.match(/\{\{[^}]+\}\}/g);
    if (missingVars && missingVars.length > 0 && KIMI_API_KEY) {
      try {
        const prompt = `Complete ce contrat en francais. Variables manquantes: ${missingVars.join(', ')}.
Contexte: contrat de type "${type}" entre ${variables.prestataire || 'AltCtrl.Lab'} et ${variables.client || 'le client'}.
Remplace chaque {{variable}} par une valeur coherente et professionnelle. Retourne UNIQUEMENT le HTML complet sans backticks.`;

        const res = await fetch(KIMI_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
          body: JSON.stringify({ model: 'kimi-k2.5', messages: [{ role: 'user', content: `${prompt}\n\nHTML:\n${html}` }], temperature: 0.2, max_tokens: 3000 }),
          signal: AbortSignal.timeout(20000),
        });
        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            html = content.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
          }
        }
      } catch { /* keep template with missing vars */ }
    }

    // Wrap in branded document
    const fullHtml = wrapContract(type, html, variables);

    // Save
    const now = Date.now();
    const id = `contract_${now}_${Math.random().toString(36).substr(2, 9)}`;
    rawDb.prepare(`
      INSERT INTO document_templates (id, type, name, html_template, variables_schema, client_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, `contract-${type}`, `${type} — ${variables.client || 'Client'}`, fullHtml, JSON.stringify(variables), (variables.clientId as string) || null, now, now);

    logger.info('contract', 'Generated', { id, type });

    return NextResponse.json({ success: true, id, type, html: fullHtml, downloadUrl: `/api/documents/generate-pdf?id=${id}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── GET: List templates or retrieve contract ───────────────────────────────

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (id) {
    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureContractTables(rawDb);
    const doc = rawDb.prepare('SELECT * FROM document_templates WHERE id = ?').get(id) as Record<string, string> | undefined;
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return new NextResponse(doc.html_template, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  // List available templates with their variables
  const templates = Object.entries(TEMPLATES).map(([key]) => ({
    type: key,
    variables: TEMPLATE_VARIABLES[key as keyof typeof TEMPLATE_VARIABLES] || [],
    description: TEMPLATE_DESCRIPTIONS[key as keyof typeof TEMPLATE_DESCRIPTIONS] || '',
  }));

  return NextResponse.json({ success: true, templates });
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _contractTablesCreated = false;
function ensureContractTables(rawDb: import('better-sqlite3').Database) {
  if (_contractTablesCreated) return;
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
  _contractTablesCreated = true;
}

// ─── Contract wrapper ───────────────────────────────────────────────────────

function wrapContract(type: string, content: string, variables: Record<string, string | number>): string {
  const titles: Record<string, string> = { prestation: 'Contrat de Prestation', nda: 'Accord de Confidentialite', maintenance: 'Contrat de Maintenance', cgv: 'Conditions Generales de Vente' };
  const prestataire = escapeHtml(String(variables.prestataire || 'AltCtrl.Lab'));
  const client = escapeHtml(String(variables.client || 'Client'));

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${titles[type] || 'Contrat'}</title>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 48px; color: #18181b; line-height: 1.7; font-size: 14px; }
  h1 { text-align: center; font-size: 24px; margin-bottom: 8px; }
  h3 { font-size: 16px; color: #6366f1; margin: 24px 0 8px; }
  .parties { text-align: center; color: #71717a; margin-bottom: 32px; font-size: 15px; }
  .header-line { height: 3px; background: linear-gradient(90deg, #d946ef, #6366f1); margin-bottom: 32px; }
  .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 64px; }
  .sig-box { border-top: 1px solid #71717a; padding-top: 8px; font-size: 13px; color: #71717a; }
  .footer { margin-top: 48px; text-align: center; color: #a1a1aa; font-size: 11px; border-top: 1px solid #e4e4e7; padding-top: 16px; }
  p { margin-bottom: 12px; }
  @media print { body { padding: 24px; } }
</style></head><body>
  <div class="header-line"></div>
  <h1>${titles[type] || 'Contrat'}</h1>
  <div class="parties">Entre <strong>${prestataire}</strong> (ci-apres "le Prestataire")<br>et <strong>${client}</strong> (ci-apres "le Client")</div>
  ${content}
  <div class="signature">
    <div><strong>Le Prestataire</strong><br>${prestataire}<div class="sig-box">Date et signature</div></div>
    <div><strong>Le Client</strong><br>${client}<div class="sig-box">Date et signature</div></div>
  </div>
  <div class="footer">Document genere le ${new Date().toLocaleDateString('fr-FR')} — ${prestataire}</div>
</body></html>`;
}

// ─── Templates ──────────────────────────────────────────────────────────────

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  prestation: 'Contrat de prestation de services digitaux',
  nda: 'Accord de non-divulgation / confidentialite',
  maintenance: 'Contrat de maintenance et support technique',
  cgv: 'Conditions generales de vente pour services digitaux',
};

const TEMPLATE_VARIABLES: Record<string, string[]> = {
  prestation: ['prestataire', 'client', 'scope', 'montant', 'duree', 'paiement', 'livrables'],
  nda: ['prestataire', 'client', 'duree', 'objet'],
  maintenance: ['prestataire', 'client', 'sla', 'montantMensuel', 'duree', 'services'],
  cgv: ['prestataire', 'siret', 'adresse'],
};

const TEMPLATES: Record<string, string> = {
  prestation: `
<h3>Article 1 — Objet</h3>
<p>Le present contrat a pour objet la realisation par {{prestataire}} d'une prestation de services digitaux au benefice de {{client}}.</p>
<p>Perimetre : {{scope}}</p>

<h3>Article 2 — Duree</h3>
<p>Le contrat est conclu pour une duree de {{duree}}, a compter de sa signature par les deux parties.</p>

<h3>Article 3 — Prix et paiement</h3>
<p>Le montant total est fixe a <strong>{{montant}} EUR HT</strong>.</p>
<p>Modalites : {{paiement}}</p>

<h3>Article 4 — Livrables</h3>
<p>{{livrables}}</p>

<h3>Article 5 — Propriete intellectuelle</h3>
<p>Les livrables deviennent la propriete du Client apres paiement integral. Le Prestataire conserve le droit de reference.</p>

<h3>Article 6 — Confidentialite</h3>
<p>Les parties s'engagent a ne pas divulguer les informations confidentielles echangees dans le cadre du contrat.</p>

<h3>Article 7 — Resiliation</h3>
<p>Chaque partie peut resilier avec un preavis de 30 jours. Les travaux realises restent dus.</p>

<h3>Article 8 — Droit applicable</h3>
<p>Le contrat est soumis au droit francais. Tout litige sera porte devant les tribunaux de Paris.</p>`,

  nda: `
<h3>Article 1 — Objet</h3>
<p>Le present accord a pour objet de definir les conditions dans lesquelles {{prestataire}} et {{client}} s'engagent a proteger les informations confidentielles echangees dans le cadre de : {{objet}}.</p>

<h3>Article 2 — Informations confidentielles</h3>
<p>Sont considerees comme confidentielles toutes informations techniques, commerciales, financieres ou strategiques communiquees par l'une des parties, quel que soit leur support.</p>

<h3>Article 3 — Obligations</h3>
<p>Chaque partie s'engage a : ne pas divulguer les informations confidentielles a des tiers, ne les utiliser que dans le cadre de l'objet defini, proteger ces informations avec le meme degre de soin que ses propres informations confidentielles.</p>

<h3>Article 4 — Duree</h3>
<p>Le present accord est conclu pour une duree de {{duree}} a compter de sa signature. Les obligations de confidentialite survivent a l'expiration du contrat pendant une duree de 2 ans.</p>

<h3>Article 5 — Sanctions</h3>
<p>Toute violation du present accord pourra donner lieu a des dommages et interets.</p>`,

  maintenance: `
<h3>Article 1 — Objet</h3>
<p>{{prestataire}} s'engage a assurer la maintenance et le support technique des solutions digitales de {{client}}.</p>

<h3>Article 2 — Services inclus</h3>
<p>{{services}}</p>

<h3>Article 3 — Niveaux de service (SLA)</h3>
<p>{{sla}}</p>

<h3>Article 4 — Tarification</h3>
<p>Le montant mensuel est fixe a <strong>{{montantMensuel}} EUR HT</strong>, payable en debut de mois.</p>

<h3>Article 5 — Duree et renouvellement</h3>
<p>Contrat de {{duree}}, renouvelable par tacite reconduction. Resiliation possible avec 30 jours de preavis.</p>

<h3>Article 6 — Exclusions</h3>
<p>Sont exclus : les developpements nouveaux (devis separe), les problemes causes par des modifications non autorisees, les cas de force majeure.</p>`,

  cgv: `
<h3>Article 1 — Societe</h3>
<p>{{prestataire}}, SIRET {{siret}}, dont le siege est situe {{adresse}}.</p>

<h3>Article 2 — Services</h3>
<p>Les presentes CGV s'appliquent a l'ensemble des prestations de services digitaux proposees par {{prestataire}}.</p>

<h3>Article 3 — Devis et commande</h3>
<p>Tout devis est valable 30 jours. La commande est consideree ferme apres signature du devis et versement de l'acompte.</p>

<h3>Article 4 — Prix</h3>
<p>Les prix sont exprimes en euros hors taxes. La TVA applicable est celle en vigueur au jour de la facturation.</p>

<h3>Article 5 — Paiement</h3>
<p>Les factures sont payables a 30 jours. Tout retard de paiement entraine des penalites de 3 fois le taux d'interet legal.</p>

<h3>Article 6 — Propriete intellectuelle</h3>
<p>Le transfert de propriete des livrables est effectif apres paiement integral.</p>

<h3>Article 7 — Responsabilite</h3>
<p>La responsabilite de {{prestataire}} est limitee au montant du contrat.</p>

<h3>Article 8 — Droit applicable</h3>
<p>Les presentes CGV sont soumises au droit francais.</p>`,
};
