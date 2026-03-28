'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Copy, Check, Download, ExternalLink, FileText,
  Sparkles, AlertTriangle,
} from 'lucide-react';

interface ProposalViewerModalProps {
  markdown: string;
  fromTemplate?: boolean;
  leadName?: string;
  leadCompany?: string;
  onClose: () => void;
}

// ─── Simple markdown → sections parser ────────────────────────────────────────

interface Section {
  heading: string;
  lines: string[];
}

function parseMarkdown(md: string): { title: string; sections: Section[] } {
  const lines = md.split('\n');
  let title = '';
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('## ')) {
      if (current) sections.push(current);
      current = { heading: trimmed.replace(/^## /, ''), lines: [] };
    } else if (trimmed.startsWith('# ')) {
      title = trimmed.replace(/^# /, '');
    } else {
      if (!current) current = { heading: '', lines: [] };
      current.lines.push(trimmed);
    }
  }
  if (current) sections.push(current);

  return { title, sections };
}

function renderLine(line: string): string {
  return line
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-zinc-800 px-1 rounded text-fuchsia-300 text-xs">$1</code>');
}

function SectionBlock({ section }: { section: Section }) {
  return (
    <div className="mb-6">
      {section.heading && (
        <h3 className="text-sm font-bold text-fuchsia-300 uppercase tracking-wider mb-3 pb-1 border-b border-fuchsia-500/20">
          {section.heading}
        </h3>
      )}
      <div className="space-y-1.5">
        {section.lines.map((line, i) => {
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={i} className="flex gap-2 text-sm text-zinc-300">
                <span className="text-fuchsia-500 mt-0.5 shrink-0">•</span>
                <span dangerouslySetInnerHTML={{ __html: renderLine(line.replace(/^[-*] /, '')) }} />
              </div>
            );
          }
          if (/^\d+\.\s/.test(line)) {
            const num = line.match(/^(\d+)\./)?.[1];
            return (
              <div key={i} className="flex gap-2.5 text-sm text-zinc-300">
                <span className="text-fuchsia-400 font-bold w-4 shrink-0 text-right">{num}.</span>
                <span dangerouslySetInnerHTML={{ __html: renderLine(line.replace(/^\d+\.\s/, '')) }} />
              </div>
            );
          }
          if (line.startsWith('*—') || line.startsWith('*— ') || /^\*—/.test(line)) {
            return (
              <p key={i} className="text-xs text-zinc-500 italic mt-2"
                dangerouslySetInnerHTML={{ __html: renderLine(line) }} />
            );
          }
          return (
            <p key={i} className="text-sm text-zinc-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderLine(line) }} />
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function ProposalViewerModal({
  markdown,
  fromTemplate,
  leadName,
  leadCompany,
  onClose,
}: ProposalViewerModalProps) {
  const [copied, setCopied] = useState(false);

  const clientName = leadCompany || leadName || 'Client';
  const { title, sections } = parseMarkdown(markdown);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGeneratePdf = () => {
    // Build a branded HTML document from the markdown, open in new tab for print-to-PDF
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const { title, sections } = parseMarkdown(markdown);

    const sectionsHtml = sections.map(s => {
      const linesHtml = s.lines.map(line => {
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return `<li>${line.replace(/^[-*] /, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</li>`;
        }
        if (/^\d+\.\s/.test(line)) {
          return `<li>${line.replace(/^\d+\.\s/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</li>`;
        }
        return `<p>${line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</p>`;
      });

      // Group consecutive li into ul/ol
      const grouped: string[] = [];
      let inList = false;
      let isOrdered = false;
      for (const h of linesHtml) {
        if (h.startsWith('<li>')) {
          if (!inList) {
            isOrdered = false; // detect based on original
            grouped.push(isOrdered ? '<ol>' : '<ul>');
            inList = true;
          }
          grouped.push(h);
        } else {
          if (inList) { grouped.push(isOrdered ? '</ol>' : '</ul>'); inList = false; }
          grouped.push(h);
        }
      }
      if (inList) grouped.push(isOrdered ? '</ol>' : '</ul>');

      return `
        <div class="section">
          ${s.heading ? `<h2>${s.heading}</h2>` : ''}
          ${grouped.join('\n')}
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Proposition — ${clientName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #18181b; background: #fff; line-height: 1.65; }
  .page { max-width: 780px; margin: 0 auto; padding: 56px 48px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; padding-bottom: 28px; border-bottom: 3px solid #d946ef; }
  .brand { font-size: 22px; font-weight: 800; color: #d946ef; letter-spacing: -0.5px; }
  .brand-sub { font-size: 11px; color: #a1a1aa; margin-top: 3px; text-transform: uppercase; letter-spacing: 1px; }
  .meta { text-align: right; font-size: 13px; color: #71717a; }
  .meta strong { color: #18181b; font-size: 14px; display: block; margin-bottom: 4px; }

  /* Title */
  .doc-title { font-size: 30px; font-weight: 800; color: #09090b; letter-spacing: -0.8px; margin-bottom: 6px; }
  .doc-subtitle { font-size: 15px; color: #71717a; margin-bottom: 40px; }

  /* Sections */
  .section { margin-bottom: 32px; }
  h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #d946ef; margin-bottom: 14px; padding-bottom: 6px; border-bottom: 1px solid #fae8ff; }
  p { font-size: 14px; color: #3f3f46; margin-bottom: 10px; }
  strong { color: #18181b; }
  ul, ol { padding-left: 0; list-style: none; }
  ul li, ol li { font-size: 14px; color: #3f3f46; padding: 7px 12px 7px 32px; margin-bottom: 4px; border-radius: 6px; background: #fafafa; position: relative; }
  ul li::before { content: '→'; position: absolute; left: 10px; color: #d946ef; font-weight: 700; }
  ol { counter-reset: step; }
  ol li { counter-increment: step; }
  ol li::before { content: counter(step); position: absolute; left: 8px; top: 7px; width: 18px; height: 18px; background: #d946ef; color: white; border-radius: 50%; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; }

  /* CTA block */
  .cta-block { background: linear-gradient(135deg, #fdf4ff, #f5f3ff); border: 1px solid #e9d5ff; border-radius: 12px; padding: 24px; margin: 40px 0; text-align: center; }
  .cta-block h3 { font-size: 16px; font-weight: 700; color: #7e22ce; margin-bottom: 8px; }
  .cta-block p { font-size: 13px; color: #6b21a8; margin: 0; }

  /* Signature */
  .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 56px; padding-top: 32px; border-top: 1px solid #e4e4e7; }
  .sig-box h4 { font-size: 13px; font-weight: 600; color: #18181b; margin-bottom: 4px; }
  .sig-box p { font-size: 12px; color: #71717a; }
  .sig-line { margin-top: 48px; border-top: 1px solid #a1a1aa; padding-top: 6px; font-size: 11px; color: #a1a1aa; }

  /* Footer */
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e4e4e7; display: flex; justify-content: space-between; align-items: center; }
  .footer-brand { font-size: 12px; font-weight: 700; color: #d946ef; }
  .footer-note { font-size: 11px; color: #a1a1aa; }

  @media print {
    .page { padding: 32px; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand">AltCtrl.Lab</div>
      <div class="brand-sub">Agence Digitale Premium · Paris</div>
    </div>
    <div class="meta">
      <strong>Proposition commerciale</strong>
      <span>${clientName}</span><br>
      <span>${date}</span>
    </div>
  </div>

  <div class="doc-title">${title || `Proposition — ${clientName}`}</div>
  <div class="doc-subtitle">Préparée exclusivement pour ${clientName}</div>

  ${sectionsHtml}

  <div class="cta-block">
    <h3>Prêt à démarrer ?</h3>
    <p>Contactez-nous pour planifier votre call de découverte — réponse garantie sous 24h.</p>
  </div>

  <div class="signature">
    <div class="sig-box">
      <h4>AltCtrl.Lab</h4>
      <p>Agence Digitale Premium</p>
      <div class="sig-line">Date &amp; Signature</div>
    </div>
    <div class="sig-box">
      <h4>${clientName}</h4>
      <p>Client</p>
      <div class="sig-line">Date &amp; Signature</div>
    </div>
  </div>

  <div class="footer">
    <span class="footer-brand">AltCtrl.Lab</span>
    <span class="footer-note">Document confidentiel · Généré le ${date}</span>
  </div>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => {
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      };
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-2xl bg-zinc-900 border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-5 border-b border-white/[0.06] shrink-0">
            <div className="w-8 h-8 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-fuchsia-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-zinc-100">Proposition commerciale</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-500">{clientName}</span>
                {fromTemplate && (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Template statique — clé IA manquante
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copié' : 'Copier'}
              </button>

              <button
                onClick={handleGeneratePdf}
                className="flex items-center gap-1.5 text-xs text-fuchsia-300 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 border border-fuchsia-500/25 px-3 py-1.5 rounded-lg transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Exporter PDF
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {title && (
              <h1 className="text-lg font-bold text-zinc-100 mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-fuchsia-400 shrink-0" />
                {title}
              </h1>
            )}
            <div className="mt-5 space-y-1">
              {sections.map((s, i) => <SectionBlock key={i} section={s} />)}
            </div>
          </div>

          {/* Footer hint */}
          <div className="px-6 py-3 border-t border-white/[0.06] shrink-0">
            <p className="text-[11px] text-zinc-600 flex items-center gap-1.5">
              <ExternalLink className="w-3 h-3" />
              "Exporter PDF" ouvre la version branded dans un nouvel onglet — utilisez <strong className="text-zinc-500">Ctrl+P → Enregistrer en PDF</strong>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
