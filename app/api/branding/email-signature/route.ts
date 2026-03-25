export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Email Signature Generator
 *
 * POST /api/branding/email-signature
 * Body: { name, title, phone?, email?, linkedin?, website?, logoUrl?, primaryColor? }
 * Returns: { html, preview }
 *
 * GET /api/branding/email-signature?name=...&title=...
 * Returns the raw HTML signature (for direct copy-paste)
 */

interface SignatureData {
  name: string;
  title: string;
  phone?: string;
  email?: string;
  linkedin?: string;
  website?: string;
  logoUrl?: string;
  companyName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tagline?: string;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateSignatureHtml(data: SignatureData): string {
  const primary = data.primaryColor || '#d946ef';
  const company = data.companyName || 'AltCtrl.Lab';

  // Gmail/Outlook compatible — table-based layout, inline styles only
  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333333; line-height: 1.4;">
  <tr>
    <td style="padding-right: 16px; vertical-align: top; border-right: 3px solid ${primary};">
      ${data.logoUrl
        ? `<img src="${escapeHtml(data.logoUrl)}" alt="${escapeHtml(company)}" width="80" style="display: block; border-radius: 4px;" />`
        : `<div style="font-size: 22px; font-weight: bold; color: ${primary}; white-space: nowrap;">${escapeHtml(company)}</div>`
      }
    </td>
    <td style="padding-left: 16px; vertical-align: top;">
      <div style="font-size: 16px; font-weight: bold; color: #111111; margin-bottom: 2px;">${escapeHtml(data.name)}</div>
      <div style="font-size: 13px; color: ${primary}; font-weight: 600; margin-bottom: 8px;">${escapeHtml(data.title)}</div>
      <table cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #555555;">
        ${data.phone ? `<tr><td style="padding: 1px 8px 1px 0; color: ${primary}; font-weight: bold;">T</td><td style="padding: 1px 0;"><a href="tel:${escapeHtml(data.phone)}" style="color: #555555; text-decoration: none;">${escapeHtml(data.phone)}</a></td></tr>` : ''}
        ${data.email ? `<tr><td style="padding: 1px 8px 1px 0; color: ${primary}; font-weight: bold;">E</td><td style="padding: 1px 0;"><a href="mailto:${escapeHtml(data.email)}" style="color: #555555; text-decoration: none;">${escapeHtml(data.email)}</a></td></tr>` : ''}
        ${data.website ? `<tr><td style="padding: 1px 8px 1px 0; color: ${primary}; font-weight: bold;">W</td><td style="padding: 1px 0;"><a href="${escapeHtml(data.website)}" style="color: ${primary}; text-decoration: none;">${escapeHtml(data.website.replace(/^https?:\/\//, ''))}</a></td></tr>` : ''}
        ${data.linkedin ? `<tr><td style="padding: 1px 8px 1px 0; color: ${primary}; font-weight: bold;">in</td><td style="padding: 1px 0;"><a href="${escapeHtml(data.linkedin)}" style="color: ${primary}; text-decoration: none;">LinkedIn</a></td></tr>` : ''}
      </table>
      ${data.tagline ? `<div style="margin-top: 8px; font-size: 11px; color: #999999; font-style: italic;">${escapeHtml(data.tagline)}</div>` : ''}
    </td>
  </tr>
</table>`;
}

// ─── POST: Generate signature ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const data = await request.json() as SignatureData;

    if (!data.name || !data.title) {
      return NextResponse.json({ error: 'Missing name or title' }, { status: 400 });
    }

    const html = generateSignatureHtml(data);

    logger.info('branding', 'Email signature generated', { name: data.name });

    return NextResponse.json({
      success: true,
      html,
      instructions: 'Copy the HTML and paste it in your email client signature settings (Gmail: Settings > Signature > paste HTML)',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── GET: Preview / raw HTML ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const name = params.get('name');
  const title = params.get('title');

  if (!name || !title) {
    return NextResponse.json({ error: 'Missing name or title' }, { status: 400 });
  }

  const data: SignatureData = {
    name,
    title,
    phone: params.get('phone') || undefined,
    email: params.get('email') || undefined,
    linkedin: params.get('linkedin') || undefined,
    website: params.get('website') || undefined,
    logoUrl: params.get('logoUrl') || undefined,
    companyName: params.get('companyName') || undefined,
    primaryColor: params.get('primaryColor') || undefined,
    tagline: params.get('tagline') || undefined,
  };

  const html = generateSignatureHtml(data);

  // Return full HTML page for preview
  const preview = `<!DOCTYPE html>
<html><head><title>Email Signature Preview</title>
<style>body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
.preview { background: white; padding: 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; }</style>
</head><body><div class="preview">${html}</div></body></html>`;

  return new NextResponse(preview, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
